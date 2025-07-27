"use client";

import { useEffect, useRef, useCallback } from "react";
import { usePodcastStore } from "@/lib/store";
import { processTimestamps } from "@/lib/utils";
import DOMPurify from "dompurify";
import { ScrollingText } from "@/components/ui/scrolling-text";

export function ShowNotes() {
    const { seekToTime, playbackState } = usePodcastStore();
    const contentRef = useRef<HTMLDivElement>(null);

    // Use the currently playing episode instead of selected episode
    const currentEpisode = playbackState.currentEpisode;
    const content =
        currentEpisode?.showNotes ||
        currentEpisode?.content ||
        currentEpisode?.description ||
        "";

    // Configure DOMPurify to allow safe HTML elements and attributes
    const sanitizeHtml = (html: string) => {
        return DOMPurify.sanitize(html, {
            ALLOWED_TAGS: [
                "p",
                "br",
                "strong",
                "b",
                "em",
                "i",
                "u",
                "a",
                "ul",
                "ol",
                "li",
                "h1",
                "h2",
                "h3",
                "h4",
                "h5",
                "h6",
                "blockquote",
                "code",
                "pre",
                "button",
            ],
            ALLOWED_ATTR: [
                "href",
                "title",
                "target",
                "rel",
                "class",
                "data-seconds",
            ],
            ALLOWED_URI_REGEXP: /^https?:\/\/|^mailto:|^tel:|^#/i,
        });
    };

    // Process content with timestamps and links
    const processContent = (html: string) => {
        // First sanitize the HTML
        let sanitized = sanitizeHtml(html);

        // Convert line breaks to paragraphs and handle spacing
        if (
            !sanitized.includes("<p>") &&
            !sanitized.includes("<div>") &&
            !sanitized.includes("<br>") &&
            !sanitized.includes("<ol>") &&
            !sanitized.includes("<ul>")
        ) {
            // Pure text content - split by double line breaks for paragraphs
            const paragraphs = sanitized
                .split(/\n\s*\n/)
                .filter((p) => p.trim());
            if (paragraphs.length > 1) {
                sanitized = paragraphs
                    .map((p) => `<p>${p.replace(/\n/g, "<br>")}</p>`)
                    .join("");
            } else {
                // Single paragraph with line breaks
                sanitized = `<p>${sanitized.replace(/\n/g, "<br>")}</p>`;
            }
        } else {
            // Has HTML structure - be very conservative with modifications
            // Only clean up excessive line breaks between HTML tags

            // Remove line breaks that are between HTML tags (e.g., ">\n<" becomes "><")
            sanitized = sanitized.replace(/>\s*\n\s*</g, "><");

            // Remove excessive line breaks within text content (more than 2 consecutive)
            sanitized = sanitized.replace(/\n{3,}/g, "\n\n");

            // For content:encoded content, trust the existing HTML structure
            // Only add <br> for single line breaks that are clearly within text content
            sanitized = sanitized.replace(/([^>])\n([^<\n])/g, "$1<br>$2");
        }

        // Add target="_blank" and rel="noopener noreferrer" to existing links that don't have target already
        sanitized = sanitized.replace(
            /<a\s+href="(https?:\/\/[^"]+)"(?![^>]*target=)([^>]*)>/gi,
            '<a href="$1" target="_blank" rel="noopener noreferrer"$2>'
        );

        // Convert plain text URLs to clickable links (avoiding already linked URLs)
        // More robust approach to avoid matching URLs that are already inside HTML tags
        sanitized = sanitized.replace(
            /\b(https?:\/\/[^\s<>"]+)/gi,
            (match, url, offset, fullString) => {
                // Check if this URL is already inside an href attribute
                const beforeMatch = fullString.substring(0, offset);
                const lastHref = beforeMatch.lastIndexOf('href="');
                const lastCloseQuote = beforeMatch.lastIndexOf('"');

                // If we're inside an href attribute (href=" is after last "), don't replace
                if (lastHref > lastCloseQuote) {
                    return match;
                }

                // Check if this URL is inside an HTML tag
                const lastOpenTag = beforeMatch.lastIndexOf("<");
                const lastCloseTag = beforeMatch.lastIndexOf(">");

                // If we're inside a tag (last < is after last >), don't replace
                if (lastOpenTag > lastCloseTag) {
                    return match;
                }

                // Check if we're already inside a link by looking ahead
                const afterMatch = fullString.substring(offset + match.length);
                if (
                    afterMatch.indexOf("</a>") < afterMatch.indexOf("<a") &&
                    afterMatch.indexOf("</a>") !== -1
                ) {
                    return match;
                }

                return `<a href="${url}" target="_blank" rel="noopener noreferrer">${url}</a>`;
            }
        );

        // Convert plain text email addresses to clickable mailto links
        sanitized = sanitized.replace(
            /\b([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})\b(?![^<]*<\/a>)/gi,
            (match, email) => {
                // Don't replace if it's already inside a link or href attribute
                return match.includes("href=") || match.includes("mailto:")
                    ? match
                    : `<a href="mailto:${email}">${email}</a>`;
            }
        );

        // Process timestamps
        sanitized = processTimestamps(sanitized);

        return sanitized;
    };

    // Handle timestamp clicks
    const handleTimestampClick = useCallback(
        (seconds: number) => {
            if (currentEpisode) {
                seekToTime(seconds);
            } else {
                console.log(
                    `Would jump to ${seconds} seconds, but no episode is currently playing`
                );
            }
        },
        [currentEpisode, seekToTime]
    );

    // Set up click handlers for timestamp buttons and external links
    useEffect(() => {
        const handleClick = (event: Event) => {
            const target = event.target as HTMLElement;

            // Handle timestamp links
            if (target.classList.contains("timestamp-link")) {
                event.preventDefault();
                const seconds = parseInt(target.dataset.seconds || "0", 10);
                handleTimestampClick(seconds);
                return;
            }

            // Handle external links
            if (target.tagName === "A") {
                const anchor = target as HTMLAnchorElement;
                const href = anchor.getAttribute("href");

                if (href) {
                    // Handle external links (http/https)
                    if (
                        href.startsWith("http://") ||
                        href.startsWith("https://")
                    ) {
                        event.preventDefault();
                        window.open(href, "_blank", "noopener,noreferrer");
                    }
                    // Handle mailto links
                    else if (href.startsWith("mailto:")) {
                        event.preventDefault();
                        window.location.href = href;
                    }
                }
            }
        };

        const contentElement = contentRef.current;
        if (contentElement) {
            contentElement.addEventListener("click", handleClick);
            return () => {
                contentElement.removeEventListener("click", handleClick);
            };
        }
    }, [content, currentEpisode, handleTimestampClick]);

    return (
        <div className="h-full flex flex-col">
            {/* Episode header info */}
            {currentEpisode && (
                <div className="p-4 border-b flex-shrink-0 min-w-0">
                    <ScrollingText
                        text={currentEpisode.title}
                        className="font-semibold text-base mb-2 leading-tight"
                    />
                    {currentEpisode.publishedAt && (
                        <p className="text-sm text-muted-foreground">
                            {new Date(
                                currentEpisode.publishedAt
                            ).toLocaleDateString()}
                        </p>
                    )}
                </div>
            )}

            <div
                className="flex-1 overflow-y-auto overflow-x-hidden p-4 min-w-0"
                style={{
                    paddingBottom: currentEpisode
                        ? "calc(6rem + env(safe-area-inset-bottom))"
                        : "0",
                }}
            >
                {currentEpisode ? (
                    content ? (
                        <div
                            ref={contentRef}
                            className="prose prose-sm dark:prose-invert max-w-full leading-relaxed break-words
                        prose-headings:text-foreground prose-headings:font-semibold prose-headings:break-words
                        prose-p:text-foreground prose-p:leading-relaxed prose-p:break-words prose-p:mb-4
                        prose-a:text-primary prose-a:underline prose-a:decoration-solid prose-a:underline-offset-2 prose-a:break-all prose-a:cursor-pointer prose-a:font-mono prose-a:bg-transparent prose-a:border-0 prose-a:p-0
                        hover:prose-a:text-primary/80 hover:prose-a:underline
                        prose-strong:text-foreground prose-strong:font-semibold prose-strong:break-words
                        prose-em:text-foreground prose-em:italic prose-em:break-words
                        prose-ul:text-foreground prose-ol:text-foreground
                        prose-li:text-foreground prose-li:my-1 prose-li:break-words
                        prose-blockquote:border-l-primary prose-blockquote:text-muted-foreground prose-blockquote:break-words
                        prose-code:bg-muted prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:break-all
                        prose-code:text-foreground prose-code:before:content-none prose-code:after:content-none
                        prose-pre:bg-muted prose-pre:text-foreground prose-pre:border prose-pre:break-all prose-pre:whitespace-pre-wrap
                        [&_*]:break-words [&_a]:break-all [&_a]:cursor-pointer [&_a]:font-mono [&_a]:bg-transparent [&_a]:border-0 [&_a]:p-0 [&_a]:underline [&_a]:decoration-solid [&_a]:underline-offset-2 [&_a]:text-primary [&_code]:break-all [&_pre]:break-all [&_pre]:whitespace-pre-wrap
                        [&_a:hover]:text-primary/80 [&_a:hover]:underline
                        [&_.timestamp-link]:text-primary [&_.timestamp-link]:underline [&_.timestamp-link]:decoration-solid
                        [&_.timestamp-link]:underline-offset-2 [&_.timestamp-link]:font-mono [&_.timestamp-link]:bg-transparent
                        [&_.timestamp-link]:border-0 [&_.timestamp-link]:p-0 [&_.timestamp-link]:cursor-pointer
                        [&_.timestamp-link:hover]:text-primary/80"
                            dangerouslySetInnerHTML={{
                                __html: processContent(content),
                            }}
                        />
                    ) : (
                        <div className="text-center text-muted-foreground py-8">
                            <p>No show notes available for this episode</p>
                        </div>
                    )
                ) : (
                    <div className="text-center text-muted-foreground py-8">
                        <p>Start playing an episode to view show notes</p>
                    </div>
                )}
            </div>
        </div>
    );
}
