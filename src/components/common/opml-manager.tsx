"use client";

import { useRef } from "react";
import { Download, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePodcastStore } from "@/lib/store";
import { toast } from "sonner";

export function OPMLManager() {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const { podcasts, importFromOPML } = usePodcastStore();

    const exportOPML = () => {
        const opmlContent = generateOPML(podcasts);
        const blob = new Blob([opmlContent], { type: "application/xml" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `progressive-cast-subscriptions-${
            new Date().toISOString().split("T")[0]
        }.opml`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        toast.success("OPML file exported successfully!");
    };

    const handleImportClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileSelect = async (
        event: React.ChangeEvent<HTMLInputElement>
    ) => {
        const file = event.target.files?.[0];
        if (!file) return;

        try {
            const text = await file.text();
            const result = await importFromOPML(text);

            if (result.imported > 0) {
                toast.success(
                    `Successfully imported ${result.imported} podcast(s)!`
                );
                if (result.errors > 0) {
                    toast.warning(
                        `${result.errors} podcast(s) failed to import. Check console for details.`
                    );
                }
            } else {
                toast.error(
                    "No podcasts were imported. Please check the OPML file format."
                );
            }
        } catch (error) {
            console.error("OPML import error:", error);
            toast.error(
                `Failed to import OPML file: ${
                    error instanceof Error ? error.message : "Unknown error"
                }`
            );
        }

        // Reset file input
        if (fileInputRef.current) {
            fileInputRef.current.value = "";
        }
    };

    return (
        <div className="flex flex-col sm:flex-row gap-2">
            <Button
                variant="outline"
                size="sm"
                onClick={exportOPML}
                disabled={podcasts.length === 0}
                className="whitespace-nowrap"
            >
                <Download className="h-3 w-3 mr-1" />
                Export OPML
            </Button>

            <Button
                variant="outline"
                size="sm"
                onClick={handleImportClick}
                className="whitespace-nowrap"
            >
                <Upload className="h-3 w-3 mr-1" />
                Import OPML
            </Button>

            <input
                ref={fileInputRef}
                type="file"
                accept=".opml,.xml"
                onChange={handleFileSelect}
                className="hidden"
            />
        </div>
    );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function generateOPML(podcasts: any[]): string {
    const now = new Date().toUTCString();

    let opml = `<?xml version="1.0" encoding="UTF-8"?>
<opml version="2.0">
  <head>
    <title>Progressive Cast Subscriptions</title>
    <dateCreated>${now}</dateCreated>
    <dateModified>${now}</dateModified>
  </head>
  <body>
    <outline text="Podcasts" title="Podcasts">`;

    podcasts.forEach((podcast) => {
        opml += `
      <outline 
        type="rss" 
        text="${escapeXml(podcast.title)}" 
        title="${escapeXml(podcast.title)}" 
        xmlUrl="${escapeXml(podcast.feedUrl)}"
        htmlUrl="${escapeXml(podcast.feedUrl)}"
        description="${escapeXml(podcast.description || "")}"
      />`;
    });

    opml += `
    </outline>
  </body>
</opml>`;

    return opml;
}

function escapeXml(str: string): string {
    return str
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&apos;");
}
