import type { ReactNode } from "react";

interface PlayerPanelHeaderProps {
  actions?: ReactNode;
  title: string;
}

export function PlayerPanelHeader({ actions, title }: PlayerPanelHeaderProps) {
  return (
    <header className="flex min-h-14 items-center justify-between gap-3 border-b px-5">
      <h2 className="font-semibold tracking-[-0.01em]">{title}</h2>
      {actions}
    </header>
  );
}
