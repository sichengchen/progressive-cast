import type { ReactNode } from "react";

import { ContentMetadata } from "@/components/common/content-metadata";
import { CoverImage } from "@/components/ui/cover-image";
import { cn } from "@/lib/utils";

interface ContentDetailsHeaderProps {
  actions?: ReactNode;
  artworkAlt: string;
  artworkSrc?: string;
  children?: ReactNode;
  controls?: ReactNode;
  metadataAction?: ReactNode;
  metadataItems: Array<string | null | undefined | false>;
  title: string;
}

export function ContentDetailsHeader({
  actions,
  artworkAlt,
  artworkSrc,
  children,
  controls,
  metadataAction,
  metadataItems,
  title,
}: ContentDetailsHeaderProps) {
  const hasDescription = Boolean(children);

  return (
    <header className="border-b border-border/60 px-2 py-5">
      <div className="flex min-w-0 items-start gap-5 md:gap-6">
        <CoverImage
          alt={artworkAlt}
          className={cn(
            "size-32 shrink-0 rounded-lg shadow-sm ring-1 ring-foreground/10",
            hasDescription ? "md:size-[9.5rem]" : "md:size-36",
          )}
          fetchPriority="high"
          src={artworkSrc}
        />

        <div
          className={cn(
            "flex min-h-32 min-w-0 flex-1 flex-col justify-center gap-2 text-left",
            hasDescription ? "md:min-h-[9.5rem]" : "md:min-h-36",
          )}
        >
          <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
            <ContentMetadata className="text-sm leading-5" items={metadataItems} />
            {metadataAction}
          </div>

          <h1 className="line-clamp-2 text-2xl font-semibold leading-tight tracking-[-0.025em] md:text-[2rem]">
            {title}
          </h1>

          {children}

          {controls || actions ? (
            <div className="mt-0.5 flex min-w-0 items-center gap-1.5">
              {controls ? <div className="min-w-0">{controls}</div> : null}
              {actions ? <div className="shrink-0">{actions}</div> : null}
            </div>
          ) : null}
        </div>
      </div>
    </header>
  );
}
