import { CameraError } from '../types';

export function handleCameraError(error: any): CameraError {
  let errorType: CameraError['type'] = 'stream';
  let errorMessage = 'An unexpected error occurred';
  
  if (!error) {
    return {
      type: errorType,
      message: errorMessage,
      details: null,
    };
  }
  
  // Handle DOMException errors from getUserMedia
  if (error instanceof DOMException || error.name) {
    switch (error.name) {
      case 'NotAllowedError':
      case 'PermissionDeniedError':
        errorType = 'permission';
        errorMessage = 'Camera permission denied. Please allow camera access and try again.';
        break;
        
      case 'NotFoundError':
      case 'DevicesNotFoundError':
        errorType = 'device';
        errorMessage = 'No camera device found. Please connect a camera and try again.';
        break;
        
      case 'NotReadableError':
      case 'TrackStartError':
        errorType = 'device';
        errorMessage = 'Camera is already in use by another application.';
        break;
        
      case 'OverconstrainedError':
      case 'ConstraintNotSatisfiedError':
        errorType = 'stream';
        errorMessage = 'Camera does not support the requested constraints.';
        break;
        
      case 'TypeError':
        errorType = 'stream';
        errorMessage = 'Invalid constraints provided for camera.';
        break;
        
      default:
        errorMessage = error.message || 'Failed to access camera';
    }
  }
  
  // Handle detection-related errors
  else if (error.message?.includes('detection') || error.message?.includes('model')) {
    errorType = 'detection';
    errorMessage = error.message || 'Detection model failed to load or process';
  }
  
  // Handle generic errors
  else if (error instanceof Error) {
    errorMessage = error.message;
    
    // Try to categorize based on message content
    if (errorMessage.includes('permission')) {
      errorType = 'permission';
    } else if (errorMessage.includes('device') || errorMessage.includes('camera')) {
      errorType = 'device';
    } else if (errorMessage.includes('detection') || errorMessage.includes('tensorflow')) {
      errorType = 'detection';
    }
  }
  
  return {
    type: errorType,
    message: errorMessage,
    details: error,
  };
}

export function isRecoverableError(error: CameraError): boolean {
  // Permission errors are not automatically recoverable
  if (error.type === 'permission') {
    return false;
  }
  
  // Device errors might be recoverable if device becomes available
  if (error.type === 'device') {
    return true;
  }
  
  // Stream errors might be recoverable with different constraints
  if (error.type === 'stream') {
    return true;
  }
  
  // Detection errors are usually recoverable
  if (error.type === 'detection') {
    return true;
  }
  
  return false;
}

export function getErrorRecoveryAction(error: CameraError): string {
  switch (error.type) {
    case 'permission':
      return 'Please grant camera permission in your browser settings and refresh the page.';
      
    case 'device':
      if (error.message.includes('in use')) {
        return 'Please close other applications using the camera and try again.';
      }
      return 'Please ensure a camera is connected and try again.';
      
    case 'stream':
      if (error.message.includes('constraints')) {
        return 'Trying with different camera settings...';
      }
      return 'Please try refreshing the page.';
      
    case 'detection':
      return 'Detection models will be reloaded automatically.';
      
    default:
      return 'Please try refreshing the page.';
  }
}