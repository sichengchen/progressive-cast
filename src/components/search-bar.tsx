"use client"

import { useState } from 'react';
import { Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { usePodcastStore } from '@/lib/store';

interface SearchBarProps {
  onClose?: () => void;
}

export function SearchBar({ onClose }: SearchBarProps) {
  const [query, setQuery] = useState('');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [results, setResults] = useState<{ podcasts: any[]; episodes: any[] }>({ podcasts: [], episodes: [] });
  const [isSearching, setIsSearching] = useState(false);
  
  const { podcasts, episodes, setSelectedPodcast, playEpisode } = usePodcastStore();

  const handleSearch = async (searchQuery: string) => {
    setQuery(searchQuery);
    
    if (!searchQuery.trim()) {
      setResults({ podcasts: [], episodes: [] });
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    
    // Search podcasts
    const filteredPodcasts = podcasts.filter(podcast =>
      podcast.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      podcast.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (podcast.author && podcast.author.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    // Search episodes
    const filteredEpisodes = episodes.filter(episode =>
      episode.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      episode.description.toLowerCase().includes(searchQuery.toLowerCase())
    );

    setResults({ podcasts: filteredPodcasts, episodes: filteredEpisodes });
    setIsSearching(false);
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handlePodcastSelect = (podcast: any) => {
    setSelectedPodcast(podcast.id);
    setQuery('');
    setResults({ podcasts: [], episodes: [] });
    onClose?.();
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleEpisodePlay = (episode: any) => {
    playEpisode(episode);
    setQuery('');
    setResults({ podcasts: [], episodes: [] });
    onClose?.();
  };

  const clearSearch = () => {
    setQuery('');
    setResults({ podcasts: [], episodes: [] });
  };

  return (
    <div className="relative w-full max-w-md">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search podcasts and episodes..."
          value={query}
          onChange={(e) => handleSearch(e.target.value)}
          className="pl-10 pr-10"
        />
        {query && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearSearch}
            className="absolute right-1 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0"
          >
            <X className="h-3 w-3" />
          </Button>
        )}
      </div>

      {/* Search Results */}
      {query && (
        <Card className="absolute top-full left-0 right-0 mt-1 z-50 max-h-96 overflow-y-auto">
          <CardContent className="p-2">
            {isSearching ? (
              <div className="p-4 text-center text-muted-foreground">
                Searching...
              </div>
            ) : (
              <div className="space-y-2">
                {/* Podcast Results */}
                {results.podcasts.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium mb-2 px-2">Podcasts</h4>
                    {results.podcasts.map((podcast) => (
                      <div
                        key={podcast.id}
                        className="p-2 rounded cursor-pointer hover:bg-accent"
                        onClick={() => handlePodcastSelect(podcast)}
                      >
                        <div className="flex items-center gap-2">
                          {podcast.imageUrl && (
                            <img
                              src={podcast.imageUrl}
                              alt={podcast.title}
                              className="w-8 h-8 rounded object-cover"
                            />
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{podcast.title}</p>
                            <p className="text-xs text-muted-foreground truncate">{podcast.author}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Episode Results */}
                {results.episodes.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium mb-2 px-2">Episodes</h4>
                    {results.episodes.map((episode) => (
                      <div
                        key={episode.id}
                        className="p-2 rounded hover:bg-accent"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{episode.title}</p>
                            <p className="text-xs text-muted-foreground truncate">{episode.description}</p>
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleEpisodePlay(episode)}
                            className="ml-2"
                          >
                            Play
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* No Results */}
                {results.podcasts.length === 0 && results.episodes.length === 0 && (
                  <div className="p-4 text-center text-muted-foreground">
                    No results found for &quot;{query}&quot;
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
} 