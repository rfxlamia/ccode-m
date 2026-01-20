import { useState, useEffect, useRef, useCallback } from 'react';

/** Default typing speed: 33 chars/second ≈ 30ms per character */
const DEFAULT_CHARS_PER_SECOND = 33;

interface UseTypewriterOptions {
  speed?: number; // chars per second (default: 33 = ~30ms/char)
  enabled?: boolean;
  onComplete?: () => void;
}

interface UseTypewriterReturn {
  displayedText: string;
  isTyping: boolean;
  skipToEnd: () => void;
  progress: number;
}

export function useTypewriter(
  fullText: string,
  options: UseTypewriterOptions = {}
): UseTypewriterReturn {
  const { speed = DEFAULT_CHARS_PER_SECOND, enabled = true, onComplete } = options;
  const [displayedLength, setDisplayedLength] = useState(0);
  const [isTyping, setIsTyping] = useState(enabled && fullText.length > 0);
  const animationRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number | null>(null);
  const displayedLengthRef = useRef(displayedLength);
  const fullTextRef = useRef(fullText);
  const onCompleteRef = useRef(onComplete);

  const msPerChar = 1000 / speed;

  useEffect(() => {
    displayedLengthRef.current = displayedLength;
  }, [displayedLength]);

  useEffect(() => {
    fullTextRef.current = fullText;
  }, [fullText]);

  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  const stopAnimation = useCallback((): void => {
    if (animationRef.current !== null) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (!enabled) {
      stopAnimation();
      setIsTyping(false);
      return;
    }

    if (displayedLengthRef.current >= fullText.length) {
      setIsTyping(false);
      return;
    }

    setIsTyping(true);
    lastTimeRef.current = null;

    const animate = (currentTime: number): void => {
      if (lastTimeRef.current === null) {
        lastTimeRef.current = currentTime;
      }

      const elapsed = currentTime - lastTimeRef.current;
      if (elapsed >= msPerChar) {
        const charsToAdd = Math.floor(elapsed / msPerChar);
        lastTimeRef.current = currentTime - (elapsed % msPerChar);

        setDisplayedLength((prev) => {
          const next = Math.min(prev + charsToAdd, fullTextRef.current.length);
          displayedLengthRef.current = next;

          if (next >= fullTextRef.current.length) {
            setIsTyping(false);
            onCompleteRef.current?.();
          }

          return next;
        });
      }

      if (displayedLengthRef.current < fullTextRef.current.length) {
        animationRef.current = requestAnimationFrame(animate);
      }
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      stopAnimation();
    };
  }, [enabled, fullText, msPerChar, stopAnimation]);

  const skipToEnd = useCallback((): void => {
    stopAnimation();
    const finalLength = fullTextRef.current.length;
    displayedLengthRef.current = finalLength;
    setDisplayedLength(finalLength);
    setIsTyping(false);
    onCompleteRef.current?.();
  }, [stopAnimation]);

  useEffect(() => {
    if (fullText.length === 0) {
      displayedLengthRef.current = 0;
      setDisplayedLength(0);
      setIsTyping(false);
      lastTimeRef.current = null;
    }
  }, [fullText]);

  return {
    displayedText: fullText.slice(0, displayedLength),
    isTyping,
    skipToEnd,
    progress: fullText.length > 0 ? displayedLength / fullText.length : 0,
  };
}
