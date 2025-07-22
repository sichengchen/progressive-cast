"use client"

import { usePodcastStore } from '@/lib/store';
import { EpisodeList } from './episode-list';
import { ShowNotes } from './show-notes';
import { WelcomeScreen } from './welcome-screen';
import { PodcastDetails } from './podcast-details';
import { SettingsPage } from './settings-page';
import { WhatsNew } from './whats-new';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { useIsMobile } from '@/hooks/use-mobile';

export function MainContent() {
  const { podcasts, selectedPodcastId, showNotesOpen, currentPage } = usePodcastStore();
  const isMobile = useIsMobile();

  // Mobile header component
  const MobileHeader = () => (
    <div className="md:hidden border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 flex items-center justify-between p-4">
      <div className="flex items-center gap-3">
        <SidebarTrigger />
        <h1 className="text-lg font-semibold">Progressive Cast</h1>
      </div>
    </div>
  );

  // Handle different page views
  if (currentPage === 'whats-new') {
    return (
      <>
        {isMobile && <MobileHeader />}
        <WhatsNew />
      </>
    );
  }

  if (currentPage === 'settings') {
    return (
      <>
        {isMobile && <MobileHeader />}
        <SettingsPage />
      </>
    );
  }

  // Default podcast view
  // If there are no podcasts at all, show welcome screen
  if (podcasts.length === 0) {
    return (
      <>
        {isMobile && <MobileHeader />}
        <WelcomeScreen />
      </>
    );
  }

  // If there are podcasts but no podcast is selected, show empty content with consistent layout
  if (!selectedPodcastId) {
    return (
      <>
        {isMobile && <MobileHeader />}
        <div className="flex flex-1 overflow-hidden">
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center text-muted-foreground">
              <p className="text-lg">Select a podcast to view details</p>
            </div>
          </div>
        </div>
      </>
    );
  }

  const selectedPodcast = podcasts.find(p => p.id === selectedPodcastId);

  // If selected podcast doesn't exist, still show welcome screen 
  // (this handles cases where podcast was deleted)
  if (!selectedPodcast) {
    return (
      <>
        {isMobile && <MobileHeader />}
        <WelcomeScreen />
      </>
    );
  }

  return (
    <>
      {isMobile && <MobileHeader />}
      <div className="flex flex-1 overflow-hidden relative">
        <div className="flex-1 overflow-hidden">
          <div className="h-full overflow-y-auto">
            {/* Podcast Details Section - Fixed height to prevent layout shifts */}
            <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 flex-shrink-0">
              <div className="p-6">
                <PodcastDetails podcast={selectedPodcast} />
              </div>
            </div>
            
            {/* Episodes List Section */}
            <div className="flex-1 min-h-0">
              <EpisodeList podcastId={selectedPodcastId} />
            </div>
          </div>
        </div>
        
        {/* Show notes panel - responsive design */}
        {isMobile ? (
          // Mobile: Full overlay
          <div 
            className={`absolute inset-0 z-10 bg-background transition-all duration-300 ease-in-out ${
              showNotesOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
            }`}
          >
            {showNotesOpen && <ShowNotes />}
          </div>
        ) : (
          // Desktop: Side panel
          <div 
            className={`border-l h-full transition-all duration-300 ease-in-out ${
              showNotesOpen ? 'w-96 opacity-100' : 'w-0 opacity-0 overflow-hidden'
            }`}
          >
            {showNotesOpen && <ShowNotes />}
          </div>
        )}
      </div>
    </>
  );
} 