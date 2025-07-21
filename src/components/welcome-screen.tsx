"use client"

import { useState, useRef } from 'react';
import { Radio, Plus, Import } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AddPodcastDialog } from './add-podcast-dialog';
import { usePodcastStore } from '@/lib/store';
import { toast } from 'sonner';

export function WelcomeScreen() {
  const [addPodcastOpen, setAddPodcastOpen] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const { subscribeToPodcast } = usePodcastStore();

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    try {
      const text = await file.text();
      const parser = new DOMParser();
      const doc = parser.parseFromString(text, 'application/xml');
      
      const outlines = doc.querySelectorAll('outline[xmlUrl]');
      let imported = 0;
      let errors = 0;

      for (const outline of outlines) {
        const feedUrl = outline.getAttribute('xmlUrl');
        if (feedUrl) {
          try {
            await subscribeToPodcast(feedUrl);
            imported++;
          } catch (error) {
            console.error(`Failed to import podcast: ${feedUrl}`, error);
            errors++;
          }
        }
      }

      if (imported > 0) {
        toast.success(`Successfully imported ${imported} podcast(s)!`);
        if (errors > 0) {
          toast.warning(`${errors} podcast(s) failed to import. Check console for details.`);
        }
      } else {
        toast.error('No podcasts were imported. Please check the OPML file format.');
      }
    } catch (error) {
      console.error('OPML import error:', error);
      toast.error('Failed to import OPML file. Please check the file format.');
    } finally {
      setIsImporting(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  return (
    <div className="flex items-center justify-center h-full p-8">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
            <Radio className="w-8 h-8 text-primary" />
          </div>
          <CardTitle className="text-2xl">Welcome</CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-4 px-8">
          <p className="text-muted-foreground text-sm">
            A modern, privacy-focused progressive web app podcast player. Get started by adding your first podcast.
          </p>

          <div className="space-y-2">
            <Button 
              className="w-full" 
              size="lg" 
              onClick={() => setAddPodcastOpen(true)}
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Podcast
            </Button>

            <p className="text-sm text-muted-foreground mt-2">
              Or import your subscriptions from an OPML file
            </p>
          </div>

          <div className="space-y-2">
            <Button 
              className="w-full" 
              size="lg" 
              variant="outline"
              onClick={handleImportClick}
              disabled={isImporting}
            >
              <Import className="w-4 h-4 mr-2" />
              {isImporting ? 'Importing...' : 'Import OPML'}
            </Button>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept=".opml,.xml"
            onChange={handleFileSelect}
            className="hidden"
          />

        </CardContent>
      </Card>

      <AddPodcastDialog 
        open={addPodcastOpen} 
        onOpenChange={setAddPodcastOpen} 
      />
    </div>
  );
} 