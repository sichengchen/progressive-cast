import "@fontsource/inter";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider } from "@tanstack/react-router";

import { AppInitializer } from "@/components/common/app-initializer";
import { ClientOnly } from "@/components/common/client-only";
import { KeyboardShortcuts } from "@/components/common/keyboard-shortcuts";
import { OfflineIndicator } from "@/components/common/offline-indicator";
import { ServiceWorkerProvider } from "@/components/common/service-worker-provider";
import { ThemeProvider } from "@/components/common/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { queryClient } from "@/query-client";
import { router } from "@/router";

import "./app/globals.css";

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("Root element not found");
}

createRoot(rootElement).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="system" disableTransitionOnChange enableSystem>
        <ClientOnly>
          <ServiceWorkerProvider>
            <AppInitializer />
            <KeyboardShortcuts />
            <RouterProvider router={router} />
            <OfflineIndicator />
            <Toaster />
          </ServiceWorkerProvider>
        </ClientOnly>
      </ThemeProvider>
    </QueryClientProvider>
  </StrictMode>,
);
