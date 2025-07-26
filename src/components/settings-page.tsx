"use client"

import { useState } from 'react';
import { Trash2, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
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
import { useTheme } from 'next-themes';
import { OPMLManager } from './opml-manager';
import { toast } from 'sonner';

export function SettingsPage() {
  const [isClearingData, setIsClearingData] = useState(false);
  const { theme, setTheme } = useTheme();

  const { preferences, setSkipInterval, setAutoPlay, setWhatsNewCount, setItunesSearchEnabled, clearAllData, podcasts } = usePodcastStore();

  const handleSkipIntervalChange = (value: string) => {
    setSkipInterval(parseInt(value));
  };

  const handleAutoPlayChange = (checked: boolean) => {
    setAutoPlay(checked);
  };

  const handleWhatsNewCountChange = (value: string) => {
    setWhatsNewCount(parseInt(value));
  };

  const handleItunesSearchEnabledChange = (checked: boolean) => {
    setItunesSearchEnabled(checked);
  };

  const handleThemeChange = (value: string) => {
    setTheme(value);
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
      <div className="px-6 py-3 my-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold">Settings</h1>
        </div>

        <div className="space-y-6 max-w-2xl mx-auto">
          {/* Theme Settings */}
          <Card>
            <CardHeader>
              <CardTitle>Appearance</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <Label>Theme</Label>
                  <p className="text-sm text-muted-foreground">Choose your preferred theme</p>
                </div>
                <div className="flex-shrink-0">
                  <Select
                    value={theme || "system"}
                    onValueChange={handleThemeChange}
                  >
                    <SelectTrigger className="w-[140px]">
                      <SelectValue placeholder="Select theme" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="system">Follow System</SelectItem>
                      <SelectItem value="light">Light</SelectItem>
                      <SelectItem value="dark">Dark</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
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
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <Label>Skip Interval</Label>
                  <p className="text-sm text-muted-foreground">Time to skip forward/backward</p>
                </div>
                <div className="flex-shrink-0">
                  <Select
                    value={(preferences.skipInterval || 30).toString()}
                    onValueChange={handleSkipIntervalChange}
                  >
                    <SelectTrigger className="w-[140px]">
                      <SelectValue placeholder="Select interval" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="5">5 seconds</SelectItem>
                      <SelectItem value="10">10 seconds</SelectItem>
                      <SelectItem value="15">15 seconds</SelectItem>
                      <SelectItem value="30">30 seconds</SelectItem>
                      <SelectItem value="60">60 seconds</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Auto Play */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <Label>Auto Play</Label>
                  <p className="text-sm text-muted-foreground">Automatically play next episode</p>
                </div>
                <div className="flex-shrink-0">
                  <Switch
                    checked={preferences.autoPlay || false}
                    onCheckedChange={handleAutoPlayChange}
                  />
                </div>
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
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <Label>Number of Episodes</Label>
                  <p className="text-sm text-muted-foreground">
                    Number of latest episodes to show in the What&apos;s New section
                  </p>
                </div>
                <div className="flex-shrink-0">
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
              </div>
            </CardContent>
          </Card>

          {/* Search Settings */}
          <Card>
            <CardHeader>
              <CardTitle>Search</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <Label>Search from iTunes</Label>
                  <p className="text-sm text-muted-foreground">
                    Enable iTunes search tab in the &quot;Add New Podcast&quot;
                  </p>
                </div>
                <div className="flex-shrink-0">
                  <Switch
                    checked={preferences.itunesSearchEnabled ?? true}
                    onCheckedChange={handleItunesSearchEnabledChange}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Data Management */}
          <Card>
            <CardHeader>
              <CardTitle>Data Management</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* OPML Import/Export */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <Label>OPML Management</Label>
                  <p className="text-sm text-muted-foreground">Import or export your podcast subscriptions</p>
                </div>
                <div className="flex-shrink-0">
                  <OPMLManager />
                </div>
              </div>

              {/* Clear All Data */}
              <div className="pt-4 border-t">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div>
                    <Label>Reset Application</Label>
                    <p className="text-sm text-muted-foreground">
                      Permanently delete all podcasts, episodes, and playback progress
                    </p>
                  </div>

                  <div className="flex-shrink-0">
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
                </div>
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