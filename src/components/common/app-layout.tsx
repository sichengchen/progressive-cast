"use client"

import { ReactNode } from 'react';
import { usePodcastStore } from '@/lib/store';
import { useIsMobile } from '@/hooks/use-mobile';

interface AppLayoutProps {
  sidebar: ReactNode;
  mainContent: ReactNode;
  rightPanel: ReactNode;
  controlBar: ReactNode;
}

export function AppLayout({ sidebar, mainContent, rightPanel, controlBar }: AppLayoutProps) {
  const { showNotesOpen } = usePodcastStore();
  const isMobile = useIsMobile();

  return (
    <>
      {isMobile ? (
        <div className="flex flex-col h-screen">
          {/* Mobile: Show Notes Overlay */}
          {showNotesOpen && (
            <div className="fixed inset-0 z-40 bg-background">
              {rightPanel}
            </div>
          )}
          
          {/* Mobile: Main Content */}
          <div className="flex-1 overflow-hidden">
            {mainContent}
          </div>
          
          {/* Mobile: Control Bar (Audio Player) */}
          {controlBar}
        </div>
      ) : (
        <div className="flex h-screen">
          {/* Desktop: Sidebar */}
          <div 
            className="flex-shrink-0 border-r border-sidebar-border bg-sidebar text-sidebar-foreground"
            style={{ 
              width: "20rem"
            }}
          >
            {sidebar}
          </div>
          
          {/* Desktop: Main Content Area */}
          <div className="flex flex-1 overflow-hidden">
            {/* Main Content */}
            <div className="flex-1 bg-background overflow-hidden">
              {mainContent}
            </div>
            
            {/* Right Panel (Show Notes) */}
            <div
              className={`border-l border-sidebar-border bg-background transition-all duration-300 ease-in-out ${
                showNotesOpen ? "w-96" : "w-0 overflow-hidden"
              }`}
            >
              {showNotesOpen && rightPanel}
            </div>
          </div>
          
          {/* Desktop: Control Bar (Audio Player) */}
          {controlBar}
        </div>
      )}
    </>
  );
}