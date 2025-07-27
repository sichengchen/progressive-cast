"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { ScrollingText } from "../ui/scrolling-text";

interface GridLayoutProps {
  columns?: number | "auto" | { sm?: number; md?: number; lg?: number; xl?: number }
  gap?: number | string
  className?: string
  children: React.ReactNode
}

const GridLayout = React.forwardRef<
  HTMLDivElement,
  GridLayoutProps
>(({ columns = 2, gap = 4, className, children, ...props }, ref) => {
  return (
    <div
      ref={ref}
      className={cn("grid grid-cols-2 gap-4", className)}
      {...props}
    >
      {children}
    </div>
  )
})

interface GridItemProps {
  span?: number | { sm?: number; md?: number; lg?: number; xl?: number }
  className?: string
  children: React.ReactNode
  onClick?: () => void
}

const GridItem = React.forwardRef<
  HTMLDivElement,
  GridItemProps
>(({ span, className, children, onClick, ...props }, ref) => {
  const getSpanClass = () => {
    if (!span) return ""
    
    if (typeof span === "number") {
      return `col-span-${span}`
    }
    
    if (typeof span === "object") {
      const classes = []
      if (span.sm) classes.push(`sm:col-span-${span.sm}`)
      if (span.md) classes.push(`md:col-span-${span.md}`)
      if (span.lg) classes.push(`lg:col-span-${span.lg}`)
      if (span.xl) classes.push(`xl:col-span-${span.xl}`)
      return classes.join(" ")
    }
    
    return ""
  }

  if (onClick) {
    return (
      <button
        onClick={onClick}
        className={cn(
          getSpanClass(),
          "text-left transition-colors focus-visible:outline-none",
          "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
          "disabled:pointer-events-none disabled:opacity-50",
          className
        )}
        {...props}
      >
        {children}
      </button>
    )
  }

  return (
    <div
      ref={ref}
      className={cn(
        getSpanClass(),
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
})

// Media Card component specifically for podcast/media display
interface MediaCardProps {
  title: string
  subtitle?: string
  imageUrl?: string
  imageAlt?: string
  onClick?: () => void
  className?: string
  imageClassName?: string
  contentClassName?: string
  badge?: React.ReactNode
}

const MediaCard = React.forwardRef<
  HTMLDivElement,
  MediaCardProps
>(({ 
  title, 
  subtitle, 
  imageUrl, 
  imageAlt, 
  onClick, 
  className,
  imageClassName,
  contentClassName,
  badge,
  ...props 
}, ref) => {
  const cardContent = (
    <>
      {/* Image Container */}
      <div className="relative aspect-square overflow-hidden rounded-lg bg-muted">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={imageAlt || title}
            className={cn(
              "h-full w-full object-cover transition-transform duration-200",
              onClick && "group-hover:scale-105",
              imageClassName
            )}
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-muted">
            <div className="text-4xl font-bold text-muted-foreground/50">
              {title.charAt(0).toUpperCase()}
            </div>
          </div>
        )}
        
        {/* Badge overlay */}
        {badge && (
          <div className="absolute top-2 right-2">
            {badge}
          </div>
        )}
      </div>

      {/* Content */}
      <div className={cn("mt-2 space-y-1", contentClassName)}>
        <h3 className="font-medium leading-tight line-clamp-1 text-sm">
          <ScrollingText text={title} />
        </h3>
        {subtitle && (
          <p className="text-xs text-muted-foreground line-clamp-1">
            {subtitle}
          </p>
        )}
      </div>
    </>
  )

  if (onClick) {
    return (
      <button
        onClick={onClick}
        className={cn(
          "group relative overflow-hidden rounded-lg transition-all duration-200",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
          "hover:scale-[1.02] active:scale-[0.98]",
          "text-left w-full",
          className
        )}
        {...props}
      >
        {cardContent}
      </button>
    )
  }

  return (
    <div
      ref={ref}
      className={cn(
        "group relative overflow-hidden rounded-lg transition-all duration-200",
        className
      )}
      {...props}
    >
      {cardContent}
    </div>
  )
})

GridLayout.displayName = "GridLayout"
GridItem.displayName = "GridItem"
MediaCard.displayName = "MediaCard"

export { 
  GridLayout, 
  GridItem, 
  MediaCard,
  type GridLayoutProps,
  type GridItemProps,
  type MediaCardProps
}