"use client";

import { createContext, useContext, type ReactNode } from "react";

interface ServiceWorkerContextType {
  isSupported: boolean;
  isRegistered: boolean;
  isUpdateAvailable: boolean;
  version: string | null;
  manager: null;
  updateApp: () => void;
  clearCache: () => Promise<void>;
}

const ServiceWorkerContext = createContext<ServiceWorkerContextType>({
  clearCache: async () => {},
  isRegistered: false,
  isSupported: false,
  isUpdateAvailable: false,
  manager: null,
  updateApp: () => {},
  version: null,
});

export function useServiceWorker() {
  return useContext(ServiceWorkerContext);
}

export function ServiceWorkerProvider({ children }: { children: ReactNode }) {
  return <ServiceWorkerContext.Provider value={useServiceWorker()}>{children}</ServiceWorkerContext.Provider>;
}
