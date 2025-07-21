import { Headphones } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CoverImageProps {
  src?: string;
  alt: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  children?: React.ReactNode;
}

const sizeClasses = {
  sm: 'w-10 h-10',
  md: 'w-12 h-12',
  lg: 'w-16 h-16'
};

const iconSizes = {
  sm: 'w-4 h-4',
  md: 'w-5 h-5',
  lg: 'w-6 h-6'
};

export function CoverImage({ src, alt, className, size = 'lg', children }: CoverImageProps) {
  // Determine icon size - use larger icon for custom className that appears to be large
  const isLargeCustom = className?.includes('w-32') || className?.includes('w-24');
  const iconSize = isLargeCustom ? 'w-8 h-8' : iconSizes[size];
  
  return (
    <div className={cn(
      'relative rounded overflow-hidden flex-shrink-0',
      className || sizeClasses[size]
    )}>
      {src ? (
        <img
          src={src}
          alt={alt}
          className="w-full h-full object-cover"
        />
      ) : (
        <div className="w-full h-full bg-muted flex items-center justify-center">
          <Headphones className={cn('text-muted-foreground', iconSize)} />
        </div>
      )}
      {children}
    </div>
  );
} 