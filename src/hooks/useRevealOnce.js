import { useState, useEffect, useRef } from 'react';

// Hook for one-time reveal animations to prevent double bouncing
export function useRevealOnce(options = {}) {
  const [isRevealed, setIsRevealed] = useState(false);
  const elementRef = useRef(null);
  const observerRef = useRef(null);
  const hasRevealedRef = useRef(false);

  useEffect(() => {
    const element = elementRef.current;
    if (!element || hasRevealedRef.current) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasRevealedRef.current) {
          hasRevealedRef.current = true;
          setIsRevealed(true);
          observer.unobserve(element);
        }
      },
      {
        threshold: options.threshold || 0.2,
        rootMargin: options.rootMargin || '0px'
      }
    );

    observerRef.current = observer;
    observer.observe(element);

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [options.threshold, options.rootMargin]);

  return [elementRef, isRevealed];
}


