import { useEffect, useRef, useState } from "react";

import { BackNavigation } from "@/components/common/back-navigation";
import { cn } from "@/lib/utils";

export function PageNavigation({
  backLabel,
  title,
  onBack,
}: {
  backLabel: string;
  title: string;
  onBack: () => void;
}) {
  const markerRef = useRef<HTMLDivElement>(null);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    const marker = markerRef.current;
    if (!marker) return;
    const root = marker.closest('[data-slot="desktop-safe-scroll-viewport"], [data-page-scroll]');
    const observer = new IntersectionObserver(([entry]) => setCollapsed(!entry.isIntersecting), {
      root,
    });
    observer.observe(marker);
    return () => observer.disconnect();
  }, [title]);

  return (
    <>
      <div ref={markerRef} className="h-px" aria-hidden="true" />
      <nav
        aria-label="Page navigation"
        data-collapsed={collapsed}
        className={cn(
          "app-no-drag sticky top-0 z-30 mb-1 flex h-12 min-w-0 items-center gap-3 border-b px-2 backdrop-blur-sm transition-colors duration-200 motion-reduce:transition-none",
          collapsed ? "border-border/60 bg-background/95" : "border-transparent bg-background",
        )}
      >
        <BackNavigation className="-ml-2 max-w-[45%] shrink-0" label={backLabel} onClick={onBack} />
        <span
          aria-hidden={!collapsed}
          className={cn(
            "min-w-0 truncate text-sm font-semibold transition-opacity duration-200 motion-reduce:transition-none",
            collapsed ? "opacity-100" : "opacity-0",
          )}
        >
          {title}
        </span>
      </nav>
    </>
  );
}
