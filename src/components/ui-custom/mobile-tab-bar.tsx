"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

interface MobileTabBarItem {
  id: string
  label: string
  icon: React.ComponentType<{ className?: string }>
  badge?: number | boolean
}

interface MobileTabBarProps {
  items: MobileTabBarItem[]
  activeTab: string
  onTabChange: (tabId: string) => void
  className?: string
  showLabels?: boolean
  position?: "bottom" | "top"
  variant?: "default" | "floating"
}

const MobileTabBar = React.forwardRef<
  HTMLDivElement,
  MobileTabBarProps
>(({ 
  items, 
  activeTab, 
  onTabChange, 
  className,
  showLabels = true,
  position = "bottom",
  variant = "default",
  ...props 
}, ref) => {
  const positionClasses = {
    bottom: "bottom-0",
    top: "top-0"
  }

  const variantClasses = {
    default: "border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60",
    floating: "mx-4 mb-4 rounded-2xl bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 border shadow-lg"
  }

  return (
    <div
      ref={ref}
      className={cn(
        "fixed left-0 right-0 z-40 md:hidden",
        "pb-safe", // Safe area for home indicator
        positionClasses[position],
        className
      )}
      {...props}
    >
      <div className={cn(
        "flex items-center justify-around",
        variantClasses[variant],
        showLabels ? "px-2 py-2" : "px-4 py-3"
      )}>
        {items.map((item) => (
          <MobileTabBarButton
            key={item.id}
            item={item}
            isActive={activeTab === item.id}
            onClick={() => onTabChange(item.id)}
            showLabel={showLabels}
          />
        ))}
      </div>
    </div>
  )
})

interface MobileTabBarButtonProps {
  item: MobileTabBarItem
  isActive: boolean
  onClick: () => void
  showLabel: boolean
}

const MobileTabBarButton = React.forwardRef<
  HTMLButtonElement,
  MobileTabBarButtonProps
>(({ item, isActive, onClick, showLabel }, ref) => {
  const Icon = item.icon

  return (
    <button
      ref={ref}
      onClick={onClick}
      className={cn(
        "relative flex flex-col items-center justify-center",
        "min-w-0 flex-1 transition-colors duration-200",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        showLabel ? "px-3 py-2" : "px-4 py-3",
        "rounded-lg",
        isActive 
          ? "text-primary" 
          : "text-muted-foreground hover:text-foreground"
      )}
    >
      <div className="relative">
        <Icon 
          className={cn(
            "transition-transform duration-200",
            showLabel ? "h-5 w-5" : "h-6 w-6",
            isActive && "scale-110"
          )} 
        />
        
        {/* Badge */}
        {item.badge && (
          <div className={cn(
            "absolute -top-1 -right-1 min-w-4 h-4 rounded-full",
            "flex items-center justify-center text-xs font-medium",
            "bg-destructive text-destructive-foreground",
            typeof item.badge === "number" && item.badge > 9 ? "px-1" : ""
          )}>
            {typeof item.badge === "number" 
              ? item.badge > 99 ? "99+" : item.badge.toString()
              : ""
            }
          </div>
        )}
      </div>
      
      {showLabel && (
        <span className={cn(
          "text-xs font-medium mt-1 leading-none truncate max-w-full",
          "transition-opacity duration-200",
          isActive ? "opacity-100" : "opacity-70"
        )}>
          {item.label}
        </span>
      )}
    </button>
  )
})

MobileTabBar.displayName = "MobileTabBar"
MobileTabBarButton.displayName = "MobileTabBarButton"

export { MobileTabBar, type MobileTabBarItem, type MobileTabBarProps }