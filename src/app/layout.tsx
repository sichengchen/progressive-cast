import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/common/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { AppInitializer } from "@/components/common/app-initializer";
import { KeyboardShortcuts } from "@/components/common/keyboard-shortcuts";
import { ServiceWorkerProvider } from "@/components/common/service-worker-provider";
import { OfflineIndicator } from "@/components/common/offline-indicator";
import { ClientOnly } from "@/components/common/client-only";
import { APP_DESCRIPTION, APP_NAME } from "@/lib/constants";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
    title: APP_NAME,
    description: APP_DESCRIPTION,
    manifest: "/manifest.json",
};

export const viewport: Viewport = {
    themeColor: [
        { media: "(prefers-color-scheme: light)", color: "white" },
        { media: "(prefers-color-scheme: dark)", color: "black" },
    ],
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="en" suppressHydrationWarning>
            <body className={inter.className}>
                <ThemeProvider
                    attribute="class"
                    defaultTheme="system"
                    enableSystem
                    disableTransitionOnChange
                >
                    <ClientOnly>
                        <ServiceWorkerProvider>
                            <AppInitializer />
                            <KeyboardShortcuts />
                            {children}
                            <OfflineIndicator />
                            <Toaster />
                        </ServiceWorkerProvider>
                    </ClientOnly>
                </ThemeProvider>
            </body>
        </html>
    );
}
