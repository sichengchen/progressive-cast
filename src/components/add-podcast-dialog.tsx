"use client"

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { usePodcastStore } from '@/lib/store';
import { toast } from 'sonner';

interface AddPodcastDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddPodcastDialog({ open, onOpenChange }: AddPodcastDialogProps) {
  const [feedUrl, setFeedUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const { subscribeToPodcast, error, clearError } = usePodcastStore();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!feedUrl.trim()) return;

    setIsLoading(true);
    clearError();
    
    try {
      await subscribeToPodcast(feedUrl.trim());
      setFeedUrl('');
      onOpenChange(false);
      toast.success('Podcast added successfully!');
    } catch {
      toast.error('Failed to add podcast. Please check the RSS URL.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setFeedUrl('');
    clearError();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add New Podcast</DialogTitle>
          <DialogDescription>
            Enter the RSS feed URL of the podcast you want to subscribe to.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="feedUrl">RSS Feed URL</Label>
            <Input
              id="feedUrl"
              type="url"
              placeholder="https://example.com/podcast.rss"
              value={feedUrl}
              onChange={(e) => setFeedUrl(e.target.value)}
              disabled={isLoading}
              className="mt-1"
            />
          </div>
          
          {error && (
            <div className="text-sm text-destructive">
              {error}
            </div>
          )}
          
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading || !feedUrl.trim()}>
              {isLoading ? 'Adding...' : 'Add Podcast'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
} 