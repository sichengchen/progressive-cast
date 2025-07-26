// Service Worker management utilities for Progressive Cast

export interface ServiceWorkerConfig {
  scope?: string;
  updateViaCache?: 'imports' | 'all' | 'none';
}

export interface ServiceWorkerManager {
  register: () => Promise<ServiceWorkerRegistration | null>;
  unregister: () => Promise<boolean>;
  update: () => Promise<ServiceWorkerRegistration | null>;
  getVersion: () => Promise<string | null>;
  clearCache: () => Promise<boolean>;
  cacheAudioFile: (url: string) => Promise<boolean>;
  onUpdateAvailable: (callback: () => void) => void;
  onControllerChange: (callback: () => void) => void;
}

class ServiceWorkerManagerImpl implements ServiceWorkerManager {
  private registration: ServiceWorkerRegistration | null = null;
  private config: ServiceWorkerConfig;
  private updateCallbacks: (() => void)[] = [];
  private controllerCallbacks: (() => void)[] = [];

  constructor(config: ServiceWorkerConfig = {}) {
    this.config = {
      scope: '/',
      updateViaCache: 'none',
      ...config,
    };
  }

  async register(): Promise<ServiceWorkerRegistration | null> {
    if (!('serviceWorker' in navigator)) {
      console.warn('Service Worker not supported');
      return null;
    }

    try {
      console.log('Registering Service Worker...');
      
      this.registration = await navigator.serviceWorker.register('/sw.js', {
        scope: this.config.scope,
        updateViaCache: this.config.updateViaCache,
      });

      console.log('Service Worker registered:', this.registration);

      // Set up event listeners
      this.setupEventListeners();

      // Check for updates immediately in development
      if (process.env.NODE_ENV === 'development') {
        await this.checkForUpdates();
      }

      return this.registration;
    } catch (error) {
      console.error('Service Worker registration failed:', error);
      return null;
    }
  }

  async unregister(): Promise<boolean> {
    if (!this.registration) {
      return false;
    }

    try {
      const result = await this.registration.unregister();
      console.log('Service Worker unregistered:', result);
      this.registration = null;
      return result;
    } catch (error) {
      console.error('Service Worker unregistration failed:', error);
      return false;
    }
  }

  async update(): Promise<ServiceWorkerRegistration | null> {
    if (!this.registration) {
      console.warn('No Service Worker registration to update');
      return null;
    }

    try {
      console.log('Checking for Service Worker updates...');
      await this.registration.update();
      return this.registration;
    } catch (error) {
      console.error('Service Worker update failed:', error);
      return null;
    }
  }

  async getVersion(): Promise<string | null> {
    if (!('serviceWorker' in navigator) || !navigator.serviceWorker.controller) {
      return null;
    }

    return new Promise((resolve) => {
      const messageChannel = new MessageChannel();
      messageChannel.port1.onmessage = (event) => {
        resolve(event.data.version || null);
      };

      navigator.serviceWorker.controller?.postMessage(
        { type: 'GET_VERSION' },
        [messageChannel.port2]
      );
    });
  }

  async clearCache(): Promise<boolean> {
    if (!('serviceWorker' in navigator) || !navigator.serviceWorker.controller) {
      return false;
    }

    return new Promise((resolve) => {
      const messageChannel = new MessageChannel();
      messageChannel.port1.onmessage = (event) => {
        resolve(event.data.success || false);
      };

      navigator.serviceWorker.controller?.postMessage(
        { type: 'CLEAR_CACHE' },
        [messageChannel.port2]
      );
    });
  }

  async cacheAudioFile(url: string): Promise<boolean> {
    if (!('serviceWorker' in navigator) || !navigator.serviceWorker.controller) {
      return false;
    }

    return new Promise((resolve) => {
      const messageChannel = new MessageChannel();
      messageChannel.port1.onmessage = (event) => {
        resolve(event.data.success || false);
      };

      navigator.serviceWorker.controller?.postMessage(
        { type: 'CACHE_AUDIO', payload: { url } },
        [messageChannel.port2]
      );
    });
  }

  onUpdateAvailable(callback: () => void): void {
    this.updateCallbacks.push(callback);
  }

  onControllerChange(callback: () => void): void {
    this.controllerCallbacks.push(callback);
  }

  private setupEventListeners(): void {
    if (!this.registration) return;

    // Listen for updates
    this.registration.addEventListener('updatefound', () => {
      const newWorker = this.registration!.installing;
      if (!newWorker) return;

      console.log('New Service Worker found, installing...');

      newWorker.addEventListener('statechange', () => {
        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
          console.log('New Service Worker installed, update available');
          this.updateCallbacks.forEach(callback => callback());
        }
      });
    });

    // Listen for controller changes
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      console.log('Service Worker controller changed');
      this.controllerCallbacks.forEach(callback => callback());
    });
  }

  private async checkForUpdates(): Promise<void> {
    // In development, check for updates more frequently
    if (process.env.NODE_ENV === 'development') {
      setInterval(async () => {
        await this.update();
      }, 5000); // Check every 5 seconds in dev
    } else {
      // In production, check for updates every 30 minutes
      setInterval(async () => {
        await this.update();
      }, 30 * 60 * 1000);
    }
  }

  async skipWaiting(): Promise<void> {
    if (!('serviceWorker' in navigator) || !navigator.serviceWorker.controller) {
      return;
    }

    navigator.serviceWorker.controller?.postMessage({ type: 'SKIP_WAITING' });
  }
}

// Singleton instance
let swManager: ServiceWorkerManager | null = null;

export function getServiceWorkerManager(config?: ServiceWorkerConfig): ServiceWorkerManager {
  if (!swManager) {
    swManager = new ServiceWorkerManagerImpl(config);
  }
  return swManager;
}

// Utility functions for download integration
export async function cacheDownloadedAudio(url: string): Promise<boolean> {
  const manager = getServiceWorkerManager();
  return await manager.cacheAudioFile(url);
}

export async function isAudioCached(url: string): Promise<boolean> {
  if (!('caches' in window)) {
    return false;
  }

  try {
    const cacheNames = await caches.keys();
    const audioCaches = cacheNames.filter(name => name.includes('audio-'));
    
    for (const cacheName of audioCaches) {
      const cache = await caches.open(cacheName);
      const response = await cache.match(url);
      if (response) {
        return true;
      }
    }
    return false;
  } catch (error) {
    console.error('Error checking audio cache:', error);
    return false;
  }
}