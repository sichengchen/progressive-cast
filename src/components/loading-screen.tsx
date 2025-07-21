"use client"

import { LoadingSpinner } from './loading-spinner';

export function LoadingScreen() {
  return (
    <div className="fixed inset-0 bg-background flex items-center justify-center z-50">
      <div className="text-center">
        <LoadingSpinner size="lg" className="mb-4 mx-auto" />
        <p className="text-muted-foreground">Loading...</p>
      </div>
    </div>
  );
} 