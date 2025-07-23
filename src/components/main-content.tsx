"use client"

import { usePodcastStore } from '@/lib/store';
import { EpisodeList } from './episode-list';
import { ShowNotes } from './show-notes';
import { WelcomeScreen } from './welcome-screen';
import { PodcastDetails } from './podcast-details';
import { SettingsPage } from './settings-page';
import { WhatsNew } from './whats-new';
import { ResumePlaying } from './resume-playing';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';

export function MainContent() {
  const { podcasts, selectedPodcastId, currentPage, showNotesOpen, toggleShowNotes } = usePodcastStore();
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

  // Global Mobile Show Notes Overlay
  const MobileShowNotesOverlay = () => (
    isMobile && showNotesOpen && (
      <div className="absolute inset-0 z-50 bg-background">
        <div className="h-full flex flex-col">
          <ShowNotes />
        </div>
      </div>
    )
  );

  // If there are no podcasts at all, always show welcome screen regardless of currentPage
  if (podcasts.length === 0 && currentPage !== 'settings') {
    return (
      <>
        {isMobile && <MobileHeader />}
        <div className="relative flex-1">
          <WelcomeScreen />
          <MobileShowNotesOverlay />
        </div>
      </>
    );
  }

  // Handle different page views (only when user has podcasts)
  if (currentPage === 'whats-new') {
    return (
      <>
        {isMobile && <MobileHeader />}
        {isMobile ? (
          // Mobile layout - simplified
          <div className="flex-1 overflow-hidden relative">
            <WhatsNew />
            <MobileShowNotesOverlay />
          </div>
        ) : (
          // Desktop layout - with sidebar
          <div className="flex flex-1 overflow-hidden">
            <div className="flex-1">
              <WhatsNew />
            </div>
            
            {/* Show Notes Sidebar for What's New page */}
            <div 
              className={`border-l bg-background transition-all duration-300 ease-in-out ${
                showNotesOpen ? 'w-96' : 'w-0 overflow-hidden'
              }`}
            >
              {showNotesOpen && <ShowNotes />}
            </div>
          </div>
        )}
      </>
    );
  }

  if (currentPage === 'resume-playing') {
    return (
      <>
        {isMobile && <MobileHeader />}
        {isMobile ? (
          // Mobile layout - simplified
          <div className="flex-1 overflow-hidden relative">
            <ResumePlaying />
            <MobileShowNotesOverlay />
          </div>
        ) : (
          // Desktop layout - with sidebar
          <div className="flex flex-1 overflow-hidden">
            <div className="flex-1">
              <ResumePlaying />
            </div>
            
            {/* Show Notes Sidebar for Resume Playing page */}
            <div 
              className={`border-l bg-background transition-all duration-300 ease-in-out ${
                showNotesOpen ? 'w-96' : 'w-0 overflow-hidden'
              }`}
            >
              {showNotesOpen && <ShowNotes />}
            </div>
          </div>
        )}
      </>
    );
  }

  if (currentPage === 'settings') {
    return (
      <>
        {isMobile && <MobileHeader />}
        {isMobile ? (
          // Mobile layout - simplified
          <div className="flex-1 overflow-hidden relative">
            <SettingsPage />
            <MobileShowNotesOverlay />
          </div>
        ) : (
          // Desktop layout - with sidebar
          <div className="flex flex-1 overflow-hidden">
            <div className="flex-1">
              <SettingsPage />
            </div>
            
            {/* Show Notes Sidebar for Settings page */}
            <div 
              className={`border-l bg-background transition-all duration-300 ease-in-out ${
                showNotesOpen ? 'w-96' : 'w-0 overflow-hidden'
              }`}
            >
              {showNotesOpen && <ShowNotes />}
            </div>
          </div>
        )}
      </>
    );
  }

  // Default podcast view
  // If there are podcasts but no podcast is selected, show empty content with consistent layout
  if (!selectedPodcastId) {
    return (
      <>
        {isMobile && <MobileHeader />}
        {isMobile ? (
          // Mobile layout - simplified
          <div className="flex-1 overflow-hidden relative">
            <div className="flex items-center justify-center h-full">
              <div className="text-center text-muted-foreground">
                <p className="text-lg">Select a podcast to view details</p>
              </div>
            </div>
            <MobileShowNotesOverlay />
          </div>
        ) : (
          // Desktop layout - with sidebar
          <div className="flex flex-1 overflow-hidden">
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center text-muted-foreground">
                <p className="text-lg">Select a podcast to view details</p>
              </div>
            </div>
            
            {/* Show Notes Sidebar for empty state */}
            <div 
              className={`border-l bg-background transition-all duration-300 ease-in-out ${
                showNotesOpen ? 'w-96' : 'w-0 overflow-hidden'
              }`}
            >
              {showNotesOpen && <ShowNotes />}
            </div>
          </div>
        )}
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
        <div className="relative flex-1">
          <WelcomeScreen />
          <MobileShowNotesOverlay />
        </div>
      </>
    );
  }

  return (
    <>
      {isMobile && <MobileHeader />}
      <div className="flex flex-1 overflow-hidden">
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
        
        {/* Show Notes Sidebar for podcast details */}
        {!isMobile && (
          <div 
            className={`border-l bg-background transition-all duration-300 ease-in-out ${
              showNotesOpen ? 'w-96' : 'w-0 overflow-hidden'
            }`}
          >
            {showNotesOpen && <ShowNotes />}
          </div>
        )}
        
        {/* Mobile Show Notes overlay for podcast details */}
        <MobileShowNotesOverlay />
      </div>
    </>
  );
} 