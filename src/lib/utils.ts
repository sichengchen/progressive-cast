import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatTime(seconds: number): string {
  if (!seconds || isNaN(seconds)) return "0:00";
  
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  } else {
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  }
}

// Parse timestamp string (like "36:01" or "1:23:45") to seconds
export function parseTimestamp(timestamp: string): number {
  const parts = timestamp.split(':').map(Number);
  
  if (parts.length === 2) {
    // MM:SS format
    const [minutes, seconds] = parts;
    return minutes * 60 + seconds;
  } else if (parts.length === 3) {
    // HH:MM:SS format
    const [hours, minutes, seconds] = parts;
    return hours * 3600 + minutes * 60 + seconds;
  }
  
  return 0;
}

// Check if a string is a valid timestamp
export function isValidTimestamp(timestamp: string): boolean {
  const timestampRegex = /^(\d{1,2}:)?([0-5]?\d):([0-5]\d)$/;
  return timestampRegex.test(timestamp);
}

// Replace timestamps in text with clickable elements
export function processTimestamps(
  text: string, 
  onTimestampClick: (seconds: number) => void
): string {
  // Match timestamp patterns: MM:SS or H:MM:SS or HH:MM:SS
  // Updated regex to be more precise and avoid false positives
  const timestampRegex = /\b(\d{1,2}:[0-5]\d:[0-5]\d|\d{1,3}:[0-5]\d)\b/g;
  
  return text.replace(timestampRegex, (match) => {
    if (isValidTimestamp(match)) {
      const seconds = parseTimestamp(match);
      return `<button class="timestamp-link" data-seconds="${seconds}">${match}</button>`;
    }
    return match;
  });
}
