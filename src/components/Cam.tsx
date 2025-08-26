import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import {
  CamProps,
  CameraError,
  Detection,
  DeviceInfo,
  Dimensions,
  FrameData,
  Layer,
  LayerClickEvent,
  LayerContext,
  LayerHoverEvent,
} from '../types';
import { useCamera } from '../hooks/useCamera';
import { useDetection } from '../hooks/useDetection';
import { useLayer } from '../hooks/useLayer';
import { useFrameProcessor } from '../hooks/useFrameProcessor';
import { getQualityConstraints } from '../utils/constraints';
import { createLayerContext } from '../utils/layerContext';
import { handleCameraError } from '../utils/errorHandling';

export const Cam: React.FC<CamProps> = ({
  // Camera Configuration
  constraints: userConstraints,
  deviceId,
  facingMode = 'user',
  
  // Layer Configuration
  layers: initialLayers = [],
  enableDetection = false,
  detectionConfig,
  
  // Event Handlers
  onFrame,
  onDetection,
  onError,
  onStreamReady,
  onClick,
  onHover,
  
  // Performance
  targetFPS = 20,
  quality = 'medium',
  
  // Styling
  className = '',
  style,
  width = 640,
  height = 480,
  
  // Additional
  muted = true,
  autoPlay = true,
}) => {
  // Refs
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number>();
  const lastFrameTimeRef = useRef<number>(0);
  const frameCounterRef = useRef<number>(0);
  
  // State
  const [dimensions, setDimensions] = useState<Dimensions>({
    width: typeof width === 'number' ? width : 640,
    height: typeof height === 'number' ? height : 480,
  });
  const [isReady, setIsReady] = useState(false);
  const [error, setError] = useState<CameraError | null>(null);
  const [currentDeviceInfo, setCurrentDeviceInfo] = useState<DeviceInfo | null>(null);
  
  // Build constraints
  const constraints = useMemo(() => {
    if (userConstraints) return userConstraints;
    
    const qualityConstraints = getQualityConstraints(quality);
    const videoConstraints: MediaTrackConstraints = {
      ...qualityConstraints,
      deviceId: deviceId ? { exact: deviceId } : undefined,
      facingMode: !deviceId ? { ideal: facingMode } : undefined,
    };
    
    return {
      video: videoConstraints,
      audio: false,
    };
  }, [userConstraints, deviceId, facingMode, quality]);
  
  // Hooks
  const {
    stream,
    devices,
    currentDevice,
    switchCamera,
    toggleCamera,
    isActive,
    error: cameraError,
  } = useCamera({
    constraints,
    deviceId,
    facingMode,
    autoStart: true,
  });
  
  const {
    detections,
    isProcessing,
    startDetection,
    stopDetection,
    updateConfig,
  } = useDetection({
    config: detectionConfig,
    enabled: enableDetection,
  });
  
  const {
    layers: managedLayers,
    addLayer,
    removeLayer,
    updateLayer,
    getLayerById,
  } = useLayer(initialLayers);
  
  // Frame processing hook
  const processFrame = useCallback(() => {
    if (!videoRef.current || !canvasRef.current || !isReady) return;
    
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    if (!ctx || video.readyState !== 4) return;
    
    // Calculate frame timing
    const now = performance.now();
    const targetFrameTime = 1000 / targetFPS;
    const elapsed = now - lastFrameTimeRef.current;
    
    // Skip frame if not enough time has passed
    if (elapsed < targetFrameTime) {
      animationFrameRef.current = requestAnimationFrame(processFrame);
      return;
    }
    
    // Update timing
    lastFrameTimeRef.current = now - (elapsed % targetFrameTime);
    frameCounterRef.current++;
    
    // Draw video to canvas
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    // Get image data for processing
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    
    // Create frame data
    const frameData: FrameData = {
      imageData,
      timestamp: now,
      frameNumber: frameCounterRef.current,
      dimensions: {
        width: canvas.width,
        height: canvas.height,
      },
    };
    
    // Create layer context
    const layerContext: LayerContext = createLayerContext({
      detections,
      frame: frameData,
      canvas,
      dimensions,
      deviceInfo: currentDeviceInfo!,
    });
    
    // Process layers
    const sortedLayers = [...managedLayers].sort((a, b) => 
      (a.zIndex || 0) - (b.zIndex || 0)
    );
    
    for (const layer of sortedLayers) {
      if (layer.visible === false) continue;
      
      // Call layer's onFrame callback
      if (layer.onFrame) {
        layer.onFrame(frameData, layerContext);
      }
      
      // Render layer
      if (layer.render) {
        ctx.save();
        layer.render(ctx, layerContext);
        ctx.restore();
      }
    }
    
    // Call onFrame callback
    if (onFrame) {
      onFrame(frameData);
    }
    
    // Schedule next frame
    animationFrameRef.current = requestAnimationFrame(processFrame);
  }, [
    isReady,
    targetFPS,
    detections,
    managedLayers,
    dimensions,
    currentDeviceInfo,
    onFrame,
  ]);
  
  // Start/stop frame processing
  useEffect(() => {
    if (isReady && stream) {
      // Start frame processing after a small delay to ensure canvas is ready
      const timeout = setTimeout(() => {
        animationFrameRef.current = requestAnimationFrame(processFrame);
      }, 100);
      
      return () => {
        clearTimeout(timeout);
        if (animationFrameRef.current) {
          cancelAnimationFrame(animationFrameRef.current);
        }
      };
    }
    
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isReady, stream, processFrame]);
  
  // Handle stream setup
  useEffect(() => {
    if (!stream || !videoRef.current) return;
    
    const video = videoRef.current;
    video.srcObject = stream;
    
    const handleLoadedMetadata = () => {
      // Update dimensions based on video
      const videoWidth = video.videoWidth;
      const videoHeight = video.videoHeight;
      
      if (typeof width === 'number' && typeof height === 'number') {
        setDimensions({ width, height });
      } else {
        setDimensions({ width: videoWidth, height: videoHeight });
      }
      
      // Get device info
      const videoTrack = stream.getVideoTracks()[0];
      if (videoTrack) {
        const settings = videoTrack.getSettings();
        const capabilities = videoTrack.getCapabilities ? 
          videoTrack.getCapabilities() : undefined;
        
        setCurrentDeviceInfo({
          deviceId: settings.deviceId || '',
          label: videoTrack.label,
          kind: 'videoinput',
          facingMode: settings.facingMode as 'user' | 'environment' | undefined,
          capabilities,
        });
      }
      
      setIsReady(true);
      
      if (onStreamReady) {
        onStreamReady(stream);
      }
    };
    
    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    
    return () => {
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
    };
  }, [stream, width, height, onStreamReady]);
  
  // Handle errors
  useEffect(() => {
    if (cameraError) {
      const formattedError = handleCameraError(cameraError);
      setError(formattedError);
      
      if (onError) {
        onError(formattedError);
      }
    }
  }, [cameraError, onError]);
  
  // Handle detections
  useEffect(() => {
    if (!enableDetection || !detections.length) return;
    
    // Notify layers about detections
    for (const layer of managedLayers) {
      if (layer.onDetection) {
        const layerContext = createLayerContext({
          detections,
          frame: null as any, // Will be provided in next frame
          canvas: canvasRef.current!,
          dimensions,
          deviceInfo: currentDeviceInfo!,
        });
        
        layer.onDetection(detections, layerContext);
      }
    }
    
    // Call onDetection callback
    if (onDetection) {
      onDetection(detections);
    }
  }, [detections, managedLayers, enableDetection, dimensions, currentDeviceInfo, onDetection]);
  
  // Layer lifecycle management
  useEffect(() => {
    if (!isReady || !canvasRef.current) return;
    
    const layerContext = createLayerContext({
      detections: [],
      frame: null as any,
      canvas: canvasRef.current,
      dimensions,
      deviceInfo: currentDeviceInfo!,
    });
    
    // Mount layers
    for (const layer of managedLayers) {
      if (layer.onMount) {
        layer.onMount(layerContext);
      }
    }
    
    // Unmount on cleanup
    return () => {
      for (const layer of managedLayers) {
        if (layer.onUnmount) {
          layer.onUnmount();
        }
      }
    };
  }, [managedLayers, isReady, dimensions, currentDeviceInfo]);
  
  // Handle canvas interactions
  const handleCanvasClick = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current) return;
    
    const rect = canvasRef.current.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    
    const clickEvent: LayerClickEvent = {
      x,
      y,
      nativeEvent: event.nativeEvent,
    };
    
    // Check for layer interactions
    for (const layer of managedLayers) {
      if (layer.interactive && layer.onClick) {
        // Check if click is within layer bounds (simplified for now)
        layer.onClick(clickEvent);
      }
    }
    
    // Call global onClick
    if (onClick) {
      onClick(clickEvent);
    }
  }, [managedLayers, onClick]);
  
  const handleCanvasHover = useCallback((event: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current) return;
    
    const rect = canvasRef.current.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    
    const hoverEvent: LayerHoverEvent = {
      x,
      y,
      nativeEvent: event.nativeEvent,
    };
    
    // Check for layer interactions
    for (const layer of managedLayers) {
      if (layer.interactive && layer.onHover) {
        layer.onHover(hoverEvent);
      }
    }
    
    // Call global onHover
    if (onHover) {
      onHover(hoverEvent);
    }
  }, [managedLayers, onHover]);
  
  const handleCanvasTouch = useCallback((event: React.TouchEvent<HTMLCanvasElement>) => {
    if (!canvasRef.current || !event.touches.length) return;
    
    const rect = canvasRef.current.getBoundingClientRect();
    const touch = event.touches[0];
    const x = touch.clientX - rect.left;
    const y = touch.clientY - rect.top;
    
    const clickEvent: LayerClickEvent = {
      x,
      y,
      nativeEvent: event.nativeEvent,
    };
    
    // Check for layer interactions
    for (const layer of managedLayers) {
      if (layer.interactive && layer.onClick) {
        layer.onClick(clickEvent);
      }
    }
    
    // Call global onClick
    if (onClick) {
      onClick(clickEvent);
    }
  }, [managedLayers, onClick]);
  
  // Handle responsive sizing
  useEffect(() => {
    if (typeof width !== 'string' && typeof height !== 'string') return;
    
    const handleResize = () => {
      if (!containerRef.current) return;
      
      const container = containerRef.current;
      const containerWidth = container.clientWidth;
      const containerHeight = container.clientHeight;
      
      setDimensions({
        width: width === '100%' ? containerWidth : dimensions.width,
        height: height === 'auto' ? containerHeight : dimensions.height,
      });
    };
    
    window.addEventListener('resize', handleResize);
    handleResize(); // Initial size
    
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [width, height, dimensions]);
  
  // Compute styles
  const containerStyle: React.CSSProperties = {
    position: 'relative',
    width: typeof width === 'string' ? width : `${width}px`,
    height: typeof height === 'string' ? height : `${height}px`,
    overflow: 'hidden',
    backgroundColor: '#000',
    ...style,
  };
  
  const videoStyle: React.CSSProperties = {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    display: 'none', // Hide video, show canvas only
  };
  
  const canvasStyle: React.CSSProperties = {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    cursor: managedLayers.some(l => l.interactive) ? 'pointer' : 'default',
  };
  
  return (
    <div
      ref={containerRef}
      className={`cam-container ${className}`}
      style={containerStyle}
      role="img"
      aria-label="Camera view with interactive layers"
    >
      <video
        ref={videoRef}
        autoPlay={autoPlay}
        muted={muted}
        playsInline
        style={videoStyle}
        width={dimensions.width}
        height={dimensions.height}
      />
      
      <canvas
        ref={canvasRef}
        width={dimensions.width}
        height={dimensions.height}
        style={canvasStyle}
        onClick={handleCanvasClick}
        onMouseMove={handleCanvasHover}
        onTouchStart={handleCanvasTouch}
        tabIndex={managedLayers.some(l => l.interactive) ? 0 : -1}
      />
      
      {error && (
        <div className="cam-error" style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          color: 'white',
          backgroundColor: 'rgba(255, 0, 0, 0.8)',
          padding: '10px 20px',
          borderRadius: '4px',
          fontSize: '14px',
          textAlign: 'center',
        }}>
          Camera Error: {error.message}
        </div>
      )}
      
      {!isReady && !error && (
        <div className="cam-loading" style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          color: 'white',
          fontSize: '14px',
        }}>
          Initializing camera...
        </div>
      )}
    </div>
  );
};