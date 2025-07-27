"use client";

import * as React from "react";
import { ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface MobileNavBarProps {
    title: string;
    onBack: () => void;
    className?: string;
    actions?: React.ReactNode;
}

const MobileNavBar = React.forwardRef<HTMLDivElement, MobileNavBarProps>(
    ({ title, onBack, className, actions }, ref) => {
        return (
            <div
                ref={ref}
                className={cn(
                    "flex items-center justify-between h-14 px-4 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 md:hidden",
                    className
                )}
            >
                <div className="flex items-center gap-2 flex-1 min-w-0">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={onBack}
                        className="p-2 -ml-2"
                    >
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <h1 className="text-lg font-semibold truncate">{title}</h1>
                </div>

                {actions && (
                    <div className="flex items-center gap-2 flex-shrink-0">
                        {actions}
                    </div>
                )}
            </div>
        );
    }
);

MobileNavBar.displayName = "MobileNavBar";

export { MobileNavBar };
