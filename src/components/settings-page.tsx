"use client"

import { useState } from 'react';
import { Trash2, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogAction,
  AlertDialogCancel
} from '@/components/ui/alert-dialog';
import { usePodcastStore } from '@/lib/store';
import { APP_VERSION } from '@/lib/constants';
import { ThemeToggle } from './theme-toggle';
import { OPMLManager } from './opml-manager';
import { toast } from 'sonner';

export function SettingsPage() {
  const [isClearingData, setIsClearingData] = useState(false);
  
  const { preferences, setSkipInterval, setAutoPlay, setWhatsNewCount, clearAllData, podcasts } = usePodcastStore();

  const handleSkipIntervalChange = (value: number[]) => {
    setSkipInterval(value[0]);
  };

  const handleAutoPlayChange = (checked: boolean) => {
    setAutoPlay(checked);
  };

  const handleWhatsNewCountChange = (value: string) => {
    setWhatsNewCount(parseInt(value));
  };

  const handleClearAllData = async () => {
    setIsClearingData(true);
    try {
      await clearAllData();
      toast.success('All data has been cleared successfully!');
    } catch (error) {
      toast.error('Failed to clear data. Please try again.');
      console.error('Clear data error:', error);
    } finally {
      setIsClearingData(false);
    }
  };

  return (
    <div className="h-full overflow-y-auto">
      <div className="p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold">Settings</h1>
        </div>
        
        <div className="space-y-6 max-w-2xl mx-auto">
          {/* Theme Settings */}
          <Card>
            <CardHeader>
              <CardTitle>Appearance</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div>
                  <Label>Theme</Label>
                  <p className="text-sm text-muted-foreground">Switch between light and dark mode</p>
                </div>
                <ThemeToggle />
              </div>
            </CardContent>
          </Card>

          {/* Playback Settings */}
          <Card>
            <CardHeader>
              <CardTitle>Playback</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Skip Interval */}
              <div className="space-y-2">
                <Label>Skip Interval: {preferences.skipInterval || 30} seconds</Label>
                <Slider
                  value={[preferences.skipInterval || 30]}
                  onValueChange={handleSkipIntervalChange}
                  max={60}
                  min={10}
                  step={5}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>10s</span>
                  <span>60s</span>
                </div>
              </div>

              {/* Auto Play */}
              <div className="flex items-center justify-between">
                <div>
                  <Label>Auto Play</Label>
                  <p className="text-sm text-muted-foreground">Automatically play next episode</p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleAutoPlayChange(!(preferences.autoPlay || false))}
                  className={(preferences.autoPlay || false) ? "bg-primary text-primary-foreground hover:bg-primary/90" : ""}
                >
                  {(preferences.autoPlay || false) ? "On" : "Off"}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* What's New Settings */}
          <Card>
            <CardHeader>
              <CardTitle>What&apos;s New</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Number of Episodes */}
              <div className="flex items-center justify-between">
                <div>
                  <Label>Number of Episodes</Label>
                  <p className="text-sm text-muted-foreground">
                    Number of latest episodes to show in the What&apos;s New section
                  </p>
                </div>
                <Select
                  value={(preferences.whatsNewCount || 10).toString()}
                  onValueChange={handleWhatsNewCountChange}
                >
                  <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder="Select count" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="5">5 episodes</SelectItem>
                    <SelectItem value="10">10 episodes</SelectItem>
                    <SelectItem value="20">20 episodes</SelectItem>
                    <SelectItem value="50">50 episodes</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Data Management */}
          <Card>
            <CardHeader>
              <CardTitle>Data Management</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* OPML Import/Export */}
              <div>
                <Label className="text-sm font-medium">OPML Management</Label>
                <p className="text-sm text-muted-foreground mb-2">Import or export your podcast subscriptions</p>
                <OPMLManager />
              </div>

              {/* Clear All Data */}
              <div className="pt-4 border-t">
                <Label className="text-sm font-medium">Reset Application</Label>
                <p className="text-sm text-muted-foreground mb-2">
                  Permanently delete all podcasts, episodes, and playback progress
                </p>
                
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button
                      variant="destructive"
                      size="sm"
                      disabled={podcasts.length === 0 || isClearingData}
                      className="flex items-center gap-2"
                    >
                      <Trash2 className="h-3 w-3" />
                      {isClearingData ? 'Clearing...' : 'Clear All Data'}
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="h-5 w-5 text-destructive" />
                        <AlertDialogTitle>Clear All Data</AlertDialogTitle>
                      </div>
                      <AlertDialogDescription>
                        This action will permanently delete:
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    
                    <div className="space-y-3">
                      <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                        <li>All podcast subscriptions ({podcasts.length} podcasts)</li>
                        <li>All downloaded episode information</li>
                        <li>All playback progress and history</li>
                        <li>All app preferences (except theme)</li>
                      </ul>
                      <div className="font-medium text-destructive text-sm">
                        This action cannot be undone.
                      </div>
                    </div>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction 
                        onClick={handleClearAllData}
                        className="bg-destructive hover:bg-destructive/90"
                        disabled={isClearingData}
                      >
                        {isClearingData ? 'Clearing...' : 'Clear All Data'}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </CardContent>
          </Card>

          <div className="text-xs text-muted-foreground text-center">
            Version {APP_VERSION} · Created by <a href="https://www.scchan.com" target="_blank" rel="noopener noreferrer" className="hover:underline">scchan</a> · View on <a href="https://github.com/sichengchen/progressive-cast" target="_blank" rel="noopener noreferrer" className="hover:underline">GitHub</a> 
        </div>
        </div>
      </div>
    </div>
  );
} 