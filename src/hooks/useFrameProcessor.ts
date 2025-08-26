import { useRef, useCallback, useEffect } from 'react';

interface FrameProcessorOptions {
  targetFPS: number;
  onFrame: () => void;
  enabled: boolean;
}

export function useFrameProcessor({
  targetFPS,
  onFrame,
  enabled,
}: FrameProcessorOptions) {
  const animationFrameRef = useRef<number>();
  const lastFrameTimeRef = useRef<number>(0);
  const frameCountRef = useRef<number>(0);
  const isProcessingRef = useRef<boolean>(false);
  
  // Calculate frame timing
  const targetFrameTime = 1000 / targetFPS;
  
  const processFrame = useCallback(() => {
    if (!enabled) return;
    
    const now = performance.now();
    const elapsed = now - lastFrameTimeRef.current;
    
    // Skip frame if not enough time has passed
    if (elapsed < targetFrameTime) {
      animationFrameRef.current = requestAnimationFrame(processFrame);
      return;
    }
    
    // Prevent concurrent processing
    if (isProcessingRef.current) {
      animationFrameRef.current = requestAnimationFrame(processFrame);
      return;
    }
    
    isProcessingRef.current = true;
    
    // Update timing (account for drift)
    lastFrameTimeRef.current = now - (elapsed % targetFrameTime);
    frameCountRef.current++;
    
    // Process frame
    try {
      onFrame();
    } catch (error) {
      console.error('Error processing frame:', error);
    } finally {
      isProcessingRef.current = false;
    }
    
    // Schedule next frame
    animationFrameRef.current = requestAnimationFrame(processFrame);
  }, [enabled, targetFrameTime, onFrame]);
  
  // Start/stop frame processing
  useEffect(() => {
    if (enabled) {
      lastFrameTimeRef.current = performance.now();
      frameCountRef.current = 0;
      animationFrameRef.current = requestAnimationFrame(processFrame);
    }
    
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [enabled, processFrame]);
  
  // Get current frame rate
  const getCurrentFPS = useCallback(() => {
    const now = performance.now();
    const elapsed = now - lastFrameTimeRef.current;
    if (elapsed > 0) {
      return Math.round((frameCountRef.current / elapsed) * 1000);
    }
    return 0;
  }, []);
  
  return {
    frameCount: frameCountRef.current,
    getCurrentFPS,
  };
}