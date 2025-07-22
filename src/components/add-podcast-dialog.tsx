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
  
  const { subscribeToPodcast, clearError, progressDialog } = usePodcastStore();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!feedUrl.trim()) return;

    clearError();
    
    await subscribeToPodcast(feedUrl.trim());
    
    // Check if there was an error after the subscription attempt
    const currentState = usePodcastStore.getState();
    if (currentState.error) {
      toast.error(currentState.error);
    } else {
      setFeedUrl('');
      onOpenChange(false);
      toast.success('Podcast added successfully!');
    }
  };

  const handleClose = () => {
    setFeedUrl('');
    clearError();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent showCloseButton={false}>
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
              placeholder="https://example.com/feed.xml"
              value={feedUrl}
              onChange={(e) => setFeedUrl(e.target.value)}
              disabled={progressDialog.isOpen}
              className="mt-1"
            />
          </div>
          
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={progressDialog.isOpen}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={progressDialog.isOpen || !feedUrl.trim()}>
              {progressDialog.isOpen ? 'Adding...' : 'Add Podcast'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
} 