import * as React from "react";
import { cn } from "@/lib/utils";

const List = React.forwardRef<
    HTMLDivElement,
    React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
    <div ref={ref} className={cn("space-y-0", className)} {...props} />
));
List.displayName = "List";

const ListItem = React.forwardRef<
    HTMLDivElement,
    React.HTMLAttributes<HTMLDivElement> & {
        interactive?: boolean;
    }
>(({ className, interactive = false, ...props }, ref) => (
    <div
        ref={ref}
        className={cn(
            "flex items-center py-4 px-4 relative",
            "after:content-[''] after:absolute after:bottom-0 after:left-4 after:right-4 after:h-px after:bg-border last:after:hidden",
            interactive && [
                "cursor-pointer transition-colors",
                "hover:bg-accent hover:text-accent-foreground hover:rounded-lg hover:after:hidden",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
            ],
            className
        )}
        tabIndex={interactive ? 0 : undefined}
        {...props}
    />
));
ListItem.displayName = "ListItem";

const ListItemLeading = React.forwardRef<
    HTMLDivElement,
    React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
    <div ref={ref} className={cn("flex-shrink-0 mr-3", className)} {...props} />
));
ListItemLeading.displayName = "ListItemLeading";

const ListItemContent = React.forwardRef<
    HTMLDivElement,
    React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
    <div ref={ref} className={cn("flex-1 min-w-0", className)} {...props} />
));
ListItemContent.displayName = "ListItemContent";

const ListItemTrailing = React.forwardRef<
    HTMLDivElement,
    React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
    <div ref={ref} className={cn("flex-shrink-0 ml-3", className)} {...props} />
));
ListItemTrailing.displayName = "ListItemTrailing";

const ListItemTitle = React.forwardRef<
    HTMLHeadingElement,
    React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
    <h3
        ref={ref}
        className={cn("font-medium leading-none tracking-tight", className)}
        {...props}
    />
));
ListItemTitle.displayName = "ListItemTitle";

const ListItemDescription = React.forwardRef<
    HTMLParagraphElement,
    React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
    <p
        ref={ref}
        className={cn("text-sm text-muted-foreground mt-1", className)}
        {...props}
    />
));
ListItemDescription.displayName = "ListItemDescription";

const ListItemMeta = React.forwardRef<
    HTMLDivElement,
    React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
    <div
        ref={ref}
        className={cn("text-xs text-muted-foreground mb-1", className)}
        {...props}
    />
));
ListItemMeta.displayName = "ListItemMeta";

export {
    List,
    ListItem,
    ListItemLeading,
    ListItemContent,
    ListItemTrailing,
    ListItemTitle,
    ListItemDescription,
    ListItemMeta,
};
