import type { ReactNode } from "react";

import { ContentMetadata } from "@/components/common/content-metadata";
import { CoverImage } from "@/components/ui/cover-image";
import { cn } from "@/lib/utils";

interface ContentDetailsHeaderProps {
  actions?: ReactNode;
  artworkAlt: string;
  artworkSrc?: string;
  children?: ReactNode;
  className?: string;
  metadataAction?: ReactNode;
  metadataItems: Array<string | null | undefined | false>;
  title: string;
}

export function ContentDetailsHeader({
  actions,
  artworkAlt,
  artworkSrc,
  children,
  className,
  metadataAction,
  metadataItems,
  title,
}: ContentDetailsHeaderProps) {
  return (
    <header className={cn("border-b border-border/60 px-2 py-5", className)}>
      <div className="flex min-w-0 items-start gap-5 md:gap-6">
        <CoverImage
          alt={artworkAlt}
          className="size-28 shrink-0 rounded-lg shadow-sm ring-1 ring-foreground/10 md:size-36"
          fetchPriority="high"
          src={artworkSrc}
        />

        <div className="flex min-h-28 min-w-0 flex-1 flex-col gap-2.5 text-left md:min-h-36">
          <div className="flex min-w-0 items-start justify-between gap-3">
            <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
              <ContentMetadata className="text-sm leading-5" items={metadataItems} />
              {metadataAction}
            </div>
            {actions ? <div className="-mr-1 shrink-0">{actions}</div> : null}
          </div>

          <h1 className="line-clamp-2 text-2xl font-semibold leading-tight tracking-[-0.025em] md:text-[2rem]">
            {title}
          </h1>

          {children}
        </div>
      </div>
    </header>
  );
}
