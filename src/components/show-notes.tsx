"use client"

import { useEffect, useRef, useCallback } from 'react';
import { usePodcastStore } from '@/lib/store';
import { processTimestamps } from '@/lib/utils';
import DOMPurify from 'dompurify';

export function ShowNotes() {
  const { episodes, selectedEpisodeId, seekToTime, playbackState } = usePodcastStore();
  const contentRef = useRef<HTMLDivElement>(null);
  
  const selectedEpisode = episodes.find(e => e.id === selectedEpisodeId);
  const content = selectedEpisode?.content || selectedEpisode?.description || '';

  // Configure DOMPurify to allow safe HTML elements and attributes
  const sanitizeHtml = (html: string) => {
    return DOMPurify.sanitize(html, {
      ALLOWED_TAGS: [
        'p', 'br', 'strong', 'b', 'em', 'i', 'u', 'a', 'ul', 'ol', 'li',
        'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'blockquote', 'code', 'pre', 'button'
      ],
      ALLOWED_ATTR: ['href', 'title', 'target', 'rel', 'class', 'data-seconds'],
      ALLOWED_URI_REGEXP: /^https?:\/\/|^mailto:|^tel:|^#/i
    });
  };

  // Process content with timestamps and links
  const processContent = (html: string) => {
    // First sanitize the HTML
    let sanitized = sanitizeHtml(html);
    
    // Add target="_blank" and rel="noopener noreferrer" to external links
    sanitized = sanitized.replace(
      /<a\s+href="(https?:\/\/[^"]+)"([^>]*)>/gi,
      '<a href="$1" target="_blank" rel="noopener noreferrer"$2>'
    );
    
    // Process timestamps
    sanitized = processTimestamps(sanitized, () => {});
    
    return sanitized;
  };

  // Handle timestamp clicks
  const handleTimestampClick = useCallback((seconds: number) => {
    if (playbackState.currentEpisode && playbackState.currentEpisode.id === selectedEpisode?.id) {
      seekToTime(seconds);
    } else {
      // If the episode isn't currently playing, we could optionally start playing it
      console.log(`Would jump to ${seconds} seconds, but episode is not currently playing`);
    }
  }, [playbackState.currentEpisode, selectedEpisode?.id, seekToTime]);

  // Set up click handlers for timestamp buttons
  useEffect(() => {
    const handleClick = (event: Event) => {
      const target = event.target as HTMLElement;
      if (target.classList.contains('timestamp-link')) {
        event.preventDefault();
        const seconds = parseInt(target.dataset.seconds || '0', 10);
        handleTimestampClick(seconds);
      }
    };

    const contentElement = contentRef.current;
    if (contentElement) {
      contentElement.addEventListener('click', handleClick);
      return () => {
        contentElement.removeEventListener('click', handleClick);
      };
    }
  }, [content, selectedEpisode, playbackState.currentEpisode, handleTimestampClick]);

  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b flex-shrink-0">
        <h2 className="text-lg font-semibold">Show Notes</h2>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4">
        {selectedEpisode ? (
          <div className="space-y-4">
            <div>
              <h3 className="font-medium mb-2">{selectedEpisode.title}</h3>
              {selectedEpisode.publishedAt && (
                <p className="text-sm text-muted-foreground">
                  {new Date(selectedEpisode.publishedAt).toLocaleDateString()}
                </p>
              )}
            </div>
            
            {content && (
              <div 
                ref={contentRef}
                className="prose prose-sm dark:prose-invert max-w-none leading-relaxed
                          prose-headings:text-foreground prose-headings:font-semibold
                          prose-p:text-foreground prose-p:leading-relaxed
                          prose-a:text-primary prose-a:underline prose-a:decoration-solid prose-a:underline-offset-2
                          hover:prose-a:text-primary/80 hover:prose-a:decoration-primary/80
                          prose-strong:text-foreground prose-strong:font-semibold
                          prose-em:text-foreground prose-em:italic
                          prose-ul:text-foreground prose-ol:text-foreground
                          prose-li:text-foreground prose-li:my-1
                          prose-blockquote:border-l-primary prose-blockquote:text-muted-foreground
                          prose-code:bg-muted prose-code:px-1 prose-code:py-0.5 prose-code:rounded
                          prose-code:text-foreground prose-code:before:content-none prose-code:after:content-none
                          prose-pre:bg-muted prose-pre:text-foreground prose-pre:border
                          [&_a]:text-primary [&_a]:underline [&_a]:decoration-solid [&_a]:underline-offset-2
                          [&_a:hover]:text-primary/80
                          [&_.timestamp-link]:text-primary [&_.timestamp-link]:underline [&_.timestamp-link]:decoration-solid
                          [&_.timestamp-link]:underline-offset-2 [&_.timestamp-link]:font-mono [&_.timestamp-link]:bg-transparent
                          [&_.timestamp-link]:border-0 [&_.timestamp-link]:p-0 [&_.timestamp-link]:cursor-pointer
                          [&_.timestamp-link:hover]:text-primary/80"
                dangerouslySetInnerHTML={{ __html: processContent(content) }}
              />
            )}
          </div>
        ) : (
          <div className="text-center text-muted-foreground py-8">
            <p>Select an episode to view show notes</p>
          </div>
        )}
      </div>
    </div>
  );
} 