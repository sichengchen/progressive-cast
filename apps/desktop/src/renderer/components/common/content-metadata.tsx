import { cn } from "@/lib/utils";

interface ContentMetadataProps {
  className?: string;
  items: Array<string | null | undefined | false>;
}

export function ContentMetadata({ className, items }: ContentMetadataProps) {
  const visibleItems = items.filter((item): item is string => Boolean(item));

  if (visibleItems.length === 0) {
    return null;
  }

  return (
    <p
      className={cn(
        "flex min-w-0 flex-wrap items-center gap-y-1 text-xs tabular-nums text-muted-foreground",
        className,
      )}
    >
      {visibleItems.map((item, index) => (
        <span className="flex min-w-0 items-center" key={`${item}-${index}`}>
          {index > 0 ? (
            <span aria-hidden="true" className="mx-1 text-border">
              ·
            </span>
          ) : null}
          <span className="truncate">{item}</span>
        </span>
      ))}
    </p>
  );
}
