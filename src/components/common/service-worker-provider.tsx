'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { getServiceWorkerManager, ServiceWorkerManager } from '@/lib/service-worker';
import { toast } from 'sonner';

interface ServiceWorkerContextType {
  isSupported: boolean;
  isRegistered: boolean;
  isUpdateAvailable: boolean;
  version: string | null;
  manager: ServiceWorkerManager | null;
  updateApp: () => void;
  clearCache: () => Promise<void>;
}

const ServiceWorkerContext = createContext<ServiceWorkerContextType>({
  isSupported: false,
  isRegistered: false,
  isUpdateAvailable: false,
  version: null,
  manager: null,
  updateApp: () => {},
  clearCache: async () => {},
});

export function useServiceWorker() {
  return useContext(ServiceWorkerContext);
}

interface ServiceWorkerProviderProps {
  children: ReactNode;
}

export function ServiceWorkerProvider({ children }: ServiceWorkerProviderProps) {
  const [isSupported] = useState(() => 'serviceWorker' in navigator);
  const [isRegistered, setIsRegistered] = useState(false);
  const [isUpdateAvailable, setIsUpdateAvailable] = useState(false);
  const [version, setVersion] = useState<string | null>(null);
  const [manager] = useState(() => isSupported ? getServiceWorkerManager() : null);

  useEffect(() => {
    if (!isSupported || !manager) {
      return;
    }

    let mounted = true;

    const initializeServiceWorker = async () => {
      try {
        // Register service worker
        const registration = await manager.register();
        if (mounted && registration) {
          setIsRegistered(true);
          console.log('Service Worker registered successfully');

          // Get version
          const currentVersion = await manager.getVersion();
          if (mounted) {
            setVersion(currentVersion);
          }

          // Set up update detection
          manager.onUpdateAvailable(() => {
            if (mounted) {
              setIsUpdateAvailable(true);
              toast.info('App update available', {
                description: 'A new version of the app is ready to install.',
                action: {
                  label: 'Update',
                  onClick: updateApp,
                },
                duration: 0, // Keep visible until action is taken
              });
            }
          });

          // Handle controller changes (when SW takes control)
          manager.onControllerChange(() => {
            if (mounted) {
              console.log('Service Worker took control, reloading page');
              window.location.reload();
            }
          });
        }
      } catch (error) {
        console.error('Service Worker initialization failed:', error);
        toast.error('Failed to initialize offline support');
      }
    };

    initializeServiceWorker();

    return () => {
      mounted = false;
    };
  }, [isSupported, manager]);

  const updateApp = async () => {
    if (!manager) return;

    try {
      toast.loading('Updating app...');
      // Send skip waiting message to SW
      if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({ type: 'SKIP_WAITING' });
      }
      setIsUpdateAvailable(false);
    } catch (error) {
      console.error('Failed to update app:', error);
      toast.error('Failed to update app');
    }
  };

  const clearCache = async () => {
    if (!manager) return;

    try {
      toast.loading('Clearing cache...');
      const success = await manager.clearCache();
      if (success) {
        toast.success('Cache cleared successfully');
        // Reload to ensure fresh content
        setTimeout(() => window.location.reload(), 1000);
      } else {
        toast.error('Failed to clear cache');
      }
    } catch (error) {
      console.error('Failed to clear cache:', error);
      toast.error('Failed to clear cache');
    }
  };

  const contextValue: ServiceWorkerContextType = {
    isSupported,
    isRegistered,
    isUpdateAvailable,
    version,
    manager,
    updateApp,
    clearCache,
  };

  return (
    <ServiceWorkerContext.Provider value={contextValue}>
      {children}
    </ServiceWorkerContext.Provider>
  );
}