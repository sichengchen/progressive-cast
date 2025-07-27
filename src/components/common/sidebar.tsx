"use client"

import { useState } from 'react';
import { Plus, Radio, Search, RefreshCw, Settings, Sparkles, History, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { CoverImage } from '@/components/ui/cover-image';
import { usePodcastStore } from '@/lib/store';
import { toast } from 'sonner';

// Menu items
const menuItems = [
  {
    title: "What's New",
    icon: Sparkles,
    action: "whats-new",
  },
  {
    title: "Resume Playing",
    icon: History,
    action: "resume-playing",
  },
  {
    title: "Downloaded",
    icon: Download,
    action: "downloaded",
  },
  {
    title: "Settings",
    icon: Settings,
    action: "settings",
  },
];

export function PodcastSidebar() {
  const [searchQuery, setSearchQuery] = useState('');
  
  const { 
    podcasts, 
    selectedPodcastId, 
    isLoading,
    isRefreshing,
    currentPage,
    playbackState,
    setSelectedPodcast,
    refreshAllPodcasts,
    setCurrentPage,
    setShowAddPodcastDialog 
  } = usePodcastStore();

  const filteredPodcasts = podcasts.filter(podcast =>
    podcast.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    podcast.description.toLowerCase().includes(searchQuery.toLowerCase())
  );


  const handleRefreshAll = async () => {
    try {
      await refreshAllPodcasts();
      toast.success('Podcasts refreshed successfully!');
    } catch {
      toast.error('Failed to refresh podcasts');
    }
  };

  const handleMenuClick = (action: string) => {
    switch (action) {
      case 'whats-new':
        setCurrentPage('whats-new');
        break;
      case 'resume-playing':
        setCurrentPage('resume-playing');
        break;
      case 'downloaded':
        setCurrentPage('downloaded');
        break;
      case 'settings':
        setCurrentPage('settings');
        break;
    }
  };

  return (
    <>
      <div className="h-full flex flex-col">
        <div className="flex flex-col gap-2 p-2 flex-shrink-0">
          <div className="flex items-center min-w-0 px-2 py-2">
            <h2 className="text-lg font-semibold truncate">Progressive Cast</h2>
          </div>
        </div>

        <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
          {/* Fixed sections */}
          <div className="flex-shrink-0">
            <div className="relative flex w-full min-w-0 flex-col p-2">
              <div className="text-sidebar-foreground/70 ring-sidebar-ring flex h-8 shrink-0 items-center rounded-md px-2 text-xs font-medium">
                Menu
              </div>
              <div className="w-full text-sm">
                <ul className="flex w-full min-w-0 flex-col gap-1">
                  {menuItems.map((item) => (
                    <li key={item.action} className="group/menu-item relative">
                      <button
                        onClick={() => handleMenuClick(item.action)}
                        className={`flex w-full items-center gap-2 overflow-hidden rounded-md p-2 text-left text-sm outline-hidden ring-sidebar-ring transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 ${
                          currentPage === item.action 
                            ? 'bg-sidebar-accent font-medium text-sidebar-accent-foreground' 
                            : ''
                        }`}
                      >
                        <item.icon className="h-4 w-4 flex-shrink-0" />
                        <span className="truncate flex-1 min-w-0">{item.title}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <Separator className="bg-sidebar-border mx-2 w-auto" />

            <div className="relative flex w-full min-w-0 flex-col p-2">
              <div className="text-sidebar-foreground/70 ring-sidebar-ring flex h-8 shrink-0 items-center rounded-md px-2 text-xs font-medium">
                Search
              </div>
              <div className="w-full text-sm">
                <div className="relative px-2 min-w-0 max-w-full">
                  <Search className="absolute left-5 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground z-10" />
                  <Input
                    placeholder="Search subsribed podcasts..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="bg-background h-8 w-full shadow-none pl-10 min-w-0"
                  />
                </div>
              </div>
            </div>

            <Separator className="bg-sidebar-border mx-2 w-auto" />

            <div className="relative flex w-full min-w-0 flex-col p-2">
              <div className="flex items-center justify-between h-8 px-2 min-w-0">
                <div className="text-sidebar-foreground/70 ring-sidebar-ring p-0 flex-1 min-w-0 text-xs font-medium">
                  <span className="truncate">Podcasts ({filteredPodcasts.length})</span>
                </div>
                <div className="flex gap-1 flex-shrink-0">
                  <Button
                    onClick={handleRefreshAll}
                    size="sm"
                    variant="ghost"
                    disabled={isRefreshing}
                    className="flex-shrink-0 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors"
                  >
                    <RefreshCw className={`h-3 w-3 ${isRefreshing ? 'animate-spin' : ''}`} />
                    <span className="sr-only">Refresh podcasts</span>
                  </Button>
                  <Button
                    onClick={() => setShowAddPodcastDialog(true)}
                    size="sm"
                    variant="ghost"
                    className="flex-shrink-0 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors"
                  >
                    <Plus className="h-3 w-3" />
                    <span className="sr-only">Add podcast</span>
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Scrollable podcasts list */}
          <div 
            className="flex-1 min-h-0 overflow-y-auto p-2 pt-0"
            style={{
              paddingBottom: playbackState.currentEpisode ? "calc(6rem + env(safe-area-inset-bottom))" : "0"
            }}
          >
            <div className="w-full text-sm">
              {isLoading ? (
                <div className="text-center py-8 text-muted-foreground px-2">
                  <div className="h-6 w-6 mx-auto mb-4 animate-spin">
                    <div className="h-full w-full border-2 border-current border-t-transparent rounded-full" />
                  </div>
                  <p className="text-sm">Loading podcasts...</p>
                </div>
              ) : filteredPodcasts.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground px-2 min-w-0 max-w-full">
                  {podcasts.length === 0 ? (
                    <>
                      <Radio className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p className="truncate">No podcasts yet</p>
                      <p className="text-sm truncate">Add your first podcast to get started</p>
                    </>
                  ) : (
                    <p className="truncate">No podcasts match your search</p>
                  )}
                </div>
              ) : (
                <ul className="flex w-full min-w-0 flex-col gap-1">
                  {filteredPodcasts.map((podcast) => (
                    <li key={podcast.id} className="group/menu-item relative">
                      <button
                        onClick={() => {
                          setSelectedPodcast(podcast.id);
                          setCurrentPage('podcasts');
                        }}
                        className={`flex w-full items-center gap-2 overflow-hidden rounded-md p-2 text-left text-sm outline-hidden ring-sidebar-ring transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 h-auto py-2 ${
                          selectedPodcastId === podcast.id && currentPage === 'podcasts'
                            ? 'bg-sidebar-accent font-medium text-sidebar-accent-foreground'
                            : ''
                        }`}
                      >
                        <div className="flex items-center gap-2 w-full min-w-0">
                          <CoverImage
                            src={podcast.imageUrl}
                            alt={podcast.title}
                            className="w-8 h-8 flex-shrink-0"
                          />
                          <div className="flex-1 min-w-0 text-left overflow-hidden">
                            <div className="font-medium text-sm truncate leading-tight">
                              {podcast.title}
                            </div>
                            {podcast.author && (
                              <div className="text-xs text-muted-foreground truncate leading-tight">
                                {podcast.author}
                              </div>
                            )}
                          </div>
                        </div>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      </div>

    </>
  );
} 