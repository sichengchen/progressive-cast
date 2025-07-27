"use client"

import { useEffect, useRef, useState } from 'react';

interface ScrollingTextProps {
  text: string;
  className?: string;
  speed?: number; // pixels per second
  pauseDuration?: number; // pause duration in ms at start/end
}

export function ScrollingText({ 
  text, 
  className = "", 
  speed = 40,
  pauseDuration = 1500 
}: ScrollingTextProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLDivElement>(null);
  const [shouldScroll, setShouldScroll] = useState(false);
  const [scrollDistance, setScrollDistance] = useState(0);

  useEffect(() => {
    const checkOverflow = () => {
      if (containerRef.current && textRef.current) {
        const containerWidth = containerRef.current.offsetWidth;
        const textWidth = textRef.current.scrollWidth;
        
        if (textWidth > containerWidth) {
          setShouldScroll(true);
          setScrollDistance(textWidth - containerWidth + 20); // Add some padding
        } else {
          setShouldScroll(false);
          setScrollDistance(0);
        }
      }
    };

    // Check initially with a small delay to ensure DOM is ready
    const timer = setTimeout(checkOverflow, 100);

    // Check on resize
    window.addEventListener('resize', checkOverflow);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', checkOverflow);
    };
  }, [text]);

  const scrollDuration = shouldScroll ? (scrollDistance / speed) + (pauseDuration * 2 / 1000) : 0;

  return (
    <div 
      ref={containerRef}
      className={`overflow-hidden relative ${className}`}
    >
      <div
        ref={textRef}
        className={`whitespace-nowrap ${shouldScroll ? 'animate-text-scroll' : ''}`}
        style={{
          '--scroll-distance': `-${scrollDistance}px`,
          '--scroll-duration': `${scrollDuration}s`,
          '--pause-percent': `${(pauseDuration / 1000 / scrollDuration) * 100}%`,
        } as React.CSSProperties}
      >
        {text}
      </div>
    </div>
  );
}