"use client"

import { useState } from 'react';
import { Plus, Radio, Search, RefreshCw, Settings, Sparkles, History } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Sidebar, 
  SidebarContent, 
  SidebarHeader,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarSeparator
} from '@/components/ui/sidebar';
import { CoverImage } from '@/components/ui/cover-image';
import { usePodcastStore } from '@/lib/store';
import { AddPodcastDialog } from './add-podcast-dialog';
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
    title: "Settings",
    icon: Settings,
    action: "settings",
  },
];

export function PodcastSidebar() {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  const { 
    podcasts, 
    selectedPodcastId, 
    isLoading,
    isRefreshing,
    currentPage,
    setSelectedPodcast,
    refreshAllPodcasts,
    setCurrentPage 
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
      case 'settings':
        setCurrentPage('settings');
        break;
    }
  };

  return (
    <>
      <Sidebar className="border-r">
        <SidebarHeader className="p-4 flex-shrink-0">
          <div className="flex items-center min-w-0">
            <h2 className="text-lg font-semibold truncate">Progressive Cast</h2>
          </div>
        </SidebarHeader>

        <SidebarContent className="overflow-x-hidden overflow-y-auto">
          {/* Menu Group */}
          <SidebarGroup>
            <SidebarGroupLabel>Menu</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {menuItems.map((item) => (
                  <SidebarMenuItem key={item.action}>
                    <SidebarMenuButton
                      onClick={() => handleMenuClick(item.action)}
                      isActive={currentPage === item.action}
                      className="overflow-hidden min-w-0"
                    >
                      <item.icon className="h-4 w-4 flex-shrink-0" />
                      <span className="truncate flex-1 min-w-0">{item.title}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>

          <SidebarSeparator />

          {/* Search Group */}
          <SidebarGroup>
            <SidebarGroupLabel>Search</SidebarGroupLabel>
            <SidebarGroupContent>
              <div className="relative px-2 min-w-0 max-w-full">
                <Search className="absolute left-5 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground z-10" />
                <Input
                  placeholder="Search subsribed podcasts..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 h-8 w-full min-w-0"
                />
              </div>
            </SidebarGroupContent>
          </SidebarGroup>

          <SidebarSeparator />

          {/* Podcasts Group */}
          <SidebarGroup>
            <div className="flex items-center justify-between h-8 px-2 min-w-0">
              <SidebarGroupLabel className="p-0 flex-1 min-w-0">
                <span className="truncate">Podcasts ({filteredPodcasts.length})</span>
              </SidebarGroupLabel>
              <div className="flex gap-1 flex-shrink-0">
                <Button
                  onClick={handleRefreshAll}
                  size="sm"
                  variant="ghost"
                  disabled={isRefreshing}
                  className="flex-shrink-0 hover:bg-accent transition-colors"
                >
                  <RefreshCw className={`h-3 w-3 ${isRefreshing ? 'animate-spin' : ''}`} />
                  <span className="sr-only">Refresh podcasts</span>
                </Button>
                <Button
                  onClick={() => setIsAddDialogOpen(true)}
                  size="sm"
                  variant="ghost"
                  className="flex-shrink-0 hover:bg-accent transition-colors"
                >
                  <Plus className="h-3 w-3" />
                  <span className="sr-only">Add podcast</span>
                </Button>
              </div>
            </div>
            <SidebarGroupContent>
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
                <SidebarMenu>
                  {filteredPodcasts.map((podcast) => (
                    <SidebarMenuItem key={podcast.id}>
                                             <SidebarMenuButton
                         isActive={selectedPodcastId === podcast.id && currentPage === 'podcasts'}
                         onClick={() => {
                           setSelectedPodcast(podcast.id);
                           setCurrentPage('podcasts');
                         }}
                         className="h-auto py-2 overflow-hidden"
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
                       </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              )}
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
      </Sidebar>

      <AddPodcastDialog 
        open={isAddDialogOpen} 
        onOpenChange={setIsAddDialogOpen} 
      />
    </>
  );
} 