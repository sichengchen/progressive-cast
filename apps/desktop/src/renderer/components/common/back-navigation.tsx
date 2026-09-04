import { ArrowLeft } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface BackNavigationProps {
  className?: string;
  iconOnly?: boolean;
  label: string;
  onClick: () => void;
}

export function BackNavigation({
  className,
  iconOnly = false,
  label,
  onClick,
}: BackNavigationProps) {
  return (
    <Button
      aria-label={iconOnly ? label : undefined}
      className={cn(iconOnly ? "p-2" : "max-w-full", className)}
      onClick={onClick}
      size="sm"
      type="button"
      variant="ghost"
    >
      <ArrowLeft data-icon="inline-start" />
      {iconOnly ? null : <span className="truncate">{label}</span>}
    </Button>
  );
}
