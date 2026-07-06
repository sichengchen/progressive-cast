"use client";

import * as React from "react";
import * as ScrollAreaPrimitive from "@radix-ui/react-scroll-area";

import { cn } from "@/lib/utils";

interface DesktopSafeScrollAreaProps
  extends React.ComponentProps<typeof ScrollAreaPrimitive.Root> {
  contentClassName?: string;
  contentStyle?: React.CSSProperties;
  scrollbarClassName?: string;
  thumbClassName?: string;
  viewportClassName?: string;
}

export function DesktopSafeScrollArea({
  children,
  className,
  contentClassName,
  contentStyle,
  scrollbarClassName,
  thumbClassName,
  viewportClassName,
  ...props
}: DesktopSafeScrollAreaProps) {
  return (
    <ScrollAreaPrimitive.Root
      className={cn("relative min-h-0 overflow-hidden", className)}
      data-slot="desktop-safe-scroll-area"
      type="auto"
      {...props}
    >
      <ScrollAreaPrimitive.Viewport
        className={cn("h-full w-full", viewportClassName)}
        data-slot="desktop-safe-scroll-viewport"
      >
        <div
          className={cn("min-w-0", contentClassName)}
          data-slot="desktop-safe-scroll-content"
          style={contentStyle}
        >
          {children}
        </div>
      </ScrollAreaPrimitive.Viewport>

      <ScrollAreaPrimitive.ScrollAreaScrollbar
        className={cn(
          "app-no-drag z-20 flex w-2 touch-none select-none rounded-full p-px transition-colors",
          scrollbarClassName,
        )}
        data-slot="desktop-safe-scrollbar"
        orientation="vertical"
        style={{
          bottom: "var(--desktop-window-safe-area-block)",
          right: "var(--desktop-window-safe-area-inline-end)",
          top: "var(--desktop-window-safe-area-block)",
        }}
      >
        <ScrollAreaPrimitive.ScrollAreaThumb
          className={cn(
            "relative flex-1 rounded-full bg-muted-foreground/30 hover:bg-muted-foreground/50",
            thumbClassName,
          )}
          data-slot="desktop-safe-scroll-thumb"
        />
      </ScrollAreaPrimitive.ScrollAreaScrollbar>
    </ScrollAreaPrimitive.Root>
  );
}
