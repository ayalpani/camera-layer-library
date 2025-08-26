import { useState, useEffect, useCallback, useRef } from 'react';
import { UseCameraOptions, UseCameraReturn, CameraError } from '../types';

export function useCamera({
  constraints,
  deviceId,
  facingMode = 'user',
  autoStart = true,
}: UseCameraOptions = {}): UseCameraReturn {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [currentDevice, setCurrentDevice] = useState<MediaDeviceInfo | null>(null);
  const [isActive, setIsActive] = useState(false);
  const [error, setError] = useState<CameraError | null>(null);
  
  const streamRef = useRef<MediaStream | null>(null);
  const isMountedRef = useRef(true);
  
  // Enumerate available devices
  const enumerateDevices = useCallback(async () => {
    try {
      if (!navigator.mediaDevices?.enumerateDevices) {
        throw new Error('enumerateDevices is not supported');
      }
      
      const deviceList = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = deviceList.filter(device => device.kind === 'videoinput');
      
      if (isMountedRef.current) {
        setDevices(videoDevices);
        
        // Set current device if we have a stream
        if (streamRef.current) {
          const videoTrack = streamRef.current.getVideoTracks()[0];
          if (videoTrack) {
            const settings = videoTrack.getSettings();
            const currentDev = videoDevices.find(d => d.deviceId === settings.deviceId);
            setCurrentDevice(currentDev || null);
          }
        }
      }
    } catch (err) {
      console.error('Failed to enumerate devices:', err);
      if (isMountedRef.current) {
        setError({
          type: 'device',
          message: 'Failed to enumerate devices',
          details: err,
        });
      }
    }
  }, []);
  
  // Stop stream tracks
  const stopStream = useCallback((mediaStream: MediaStream | null) => {
    if (!mediaStream) return;
    
    mediaStream.getTracks().forEach(track => {
      track.stop();
    });
  }, []);
  
  // Start camera stream
  const startCamera = useCallback(async () => {
    try {
      // Check for getUserMedia support
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error('getUserMedia is not supported');
      }
      
      // Stop existing stream
      if (streamRef.current) {
        stopStream(streamRef.current);
        streamRef.current = null;
        setStream(null);
      }
      
      // Build constraints
      let videoConstraints: MediaTrackConstraints | boolean = true;
      
      if (constraints?.video) {
        videoConstraints = constraints.video;
      } else {
        videoConstraints = {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          frameRate: { ideal: 30 },
        };
        
        if (deviceId) {
          videoConstraints.deviceId = { exact: deviceId };
        } else if (facingMode) {
          videoConstraints.facingMode = { ideal: facingMode };
        }
      }
      
      const mediaConstraints: MediaStreamConstraints = {
        video: videoConstraints,
        audio: constraints?.audio || false,
      };
      
      // Request camera access
      const mediaStream = await navigator.mediaDevices.getUserMedia(mediaConstraints);
      
      if (!isMountedRef.current) {
        // Component unmounted during async operation
        stopStream(mediaStream);
        return;
      }
      
      streamRef.current = mediaStream;
      setStream(mediaStream);
      setIsActive(true);
      setError(null);
      
      // Get current device info
      const videoTrack = mediaStream.getVideoTracks()[0];
      if (videoTrack && devices.length > 0) {
        const settings = videoTrack.getSettings();
        const currentDev = devices.find(d => d.deviceId === settings.deviceId);
        setCurrentDevice(currentDev || null);
      }
      
      // Listen for track ended event
      videoTrack?.addEventListener('ended', () => {
        if (isMountedRef.current) {
          setIsActive(false);
          setStream(null);
          streamRef.current = null;
        }
      });
      
    } catch (err: any) {
      console.error('Failed to start camera:', err);
      
      if (!isMountedRef.current) return;
      
      let errorType: CameraError['type'] = 'stream';
      let errorMessage = 'Failed to access camera';
      
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        errorType = 'permission';
        errorMessage = 'Camera permission denied. Please allow camera access and try again.';
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        errorType = 'device';
        errorMessage = 'No camera device found. Please connect a camera and try again.';
      } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
        errorType = 'device';
        errorMessage = 'Camera is already in use by another application.';
      } else if (err.name === 'OverconstrainedError' || err.name === 'ConstraintNotSatisfiedError') {
        errorType = 'stream';
        errorMessage = 'Camera does not support the requested constraints.';
      }
      
      setError({
        type: errorType,
        message: errorMessage,
        details: err,
      });
      setIsActive(false);
      setStream(null);
      streamRef.current = null;
    }
  }, [constraints, deviceId, facingMode, devices, stopStream]);
  
  // Switch to next camera
  const switchCamera = useCallback(async () => {
    if (devices.length < 2) {
      console.warn('Not enough cameras to switch');
      return;
    }
    
    const currentIndex = currentDevice 
      ? devices.findIndex(d => d.deviceId === currentDevice.deviceId)
      : -1;
    
    const nextIndex = (currentIndex + 1) % devices.length;
    const nextDevice = devices[nextIndex];
    
    if (!nextDevice) return;
    
    // Update constraints with new device ID
    const newConstraints: MediaStreamConstraints = {
      video: {
        deviceId: { exact: nextDevice.deviceId },
        width: { ideal: 1280 },
        height: { ideal: 720 },
        frameRate: { ideal: 30 },
      },
      audio: constraints?.audio || false,
    };
    
    try {
      // Stop current stream
      if (streamRef.current) {
        stopStream(streamRef.current);
      }
      
      // Start with new device
      const mediaStream = await navigator.mediaDevices.getUserMedia(newConstraints);
      
      if (!isMountedRef.current) {
        stopStream(mediaStream);
        return;
      }
      
      streamRef.current = mediaStream;
      setStream(mediaStream);
      setCurrentDevice(nextDevice);
      setIsActive(true);
      setError(null);
      
    } catch (err) {
      console.error('Failed to switch camera:', err);
      if (isMountedRef.current) {
        setError({
          type: 'device',
          message: 'Failed to switch camera',
          details: err,
        });
      }
    }
  }, [devices, currentDevice, constraints, stopStream]);
  
  // Toggle camera on/off
  const toggleCamera = useCallback(() => {
    if (isActive && streamRef.current) {
      // Stop camera
      stopStream(streamRef.current);
      streamRef.current = null;
      setStream(null);
      setIsActive(false);
    } else {
      // Start camera
      startCamera();
    }
  }, [isActive, startCamera, stopStream]);
  
  // Initialize devices list
  useEffect(() => {
    enumerateDevices();
    
    // Listen for device changes
    const handleDeviceChange = () => {
      enumerateDevices();
    };
    
    navigator.mediaDevices?.addEventListener('devicechange', handleDeviceChange);
    
    return () => {
      navigator.mediaDevices?.removeEventListener('devicechange', handleDeviceChange);
    };
  }, [enumerateDevices]);
  
  // Auto-start camera if enabled
  useEffect(() => {
    if (autoStart) {
      startCamera();
    }
    
    return () => {
      isMountedRef.current = false;
      if (streamRef.current) {
        stopStream(streamRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run on mount
  
  // Handle constraint changes
  useEffect(() => {
    if (!isActive || !autoStart) return;
    if (!deviceId && !facingMode) return; // Skip if no specific constraints
    
    // Restart camera with new constraints
    startCamera();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deviceId, facingMode]); // React to device/facing mode changes
  
  return {
    stream,
    devices,
    currentDevice,
    switchCamera,
    toggleCamera,
    isActive,
    error,
  };
}