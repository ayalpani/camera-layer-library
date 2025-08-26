// Main component export
export { Cam } from './components/Cam';

// Hook exports
export { useCamera } from './hooks/useCamera';
export { useDetection } from './hooks/useDetection';
export { useLayer } from './hooks/useLayer';
export { useFrameProcessor } from './hooks/useFrameProcessor';

// Type exports
export type {
  // Component Props
  CamProps,
  
  // Layer System
  Layer,
  LayerContext,
  LayerComponentProps,
  
  // Detection
  Detection,
  DetectionConfig,
  FaceDetectionConfig,
  ObjectDetectionConfig,
  CustomDetectionConfig,
  BoundingBox,
  Landmark,
  
  // Frame Data
  FrameData,
  Dimensions,
  
  // Device
  DeviceInfo,
  
  // Events
  LayerClickEvent,
  LayerHoverEvent,
  
  // Errors
  CameraError,
  
  // Hook Types
  UseCameraOptions,
  UseCameraReturn,
  UseDetectionOptions,
  UseDetectionReturn,
  UseLayerReturn,
} from './types';

// Utility exports
export {
  // Error handling
  handleCameraError,
  isRecoverableError,
  getErrorRecoveryAction,
} from './utils/errorHandling';

export {
  // Constraints
  getQualityConstraints,
  getMobileConstraints,
  getConstraintsWithDeviceId,
  getConstraintsWithFacingMode,
  isMobileDevice,
  combineConstraints,
  validateConstraints,
} from './utils/constraints';

export {
  // Layer context utilities
  createLayerContext,
  isPointInBoundingBox,
  findDetectionAtPoint,
  scaleCoordinates,
  scaleBoundingBox,
  getDetectionCenter,
  getDetectionArea,
  doDetectionsOverlap,
  getOverlapArea,
  getIoU,
  filterDetectionsByType,
  filterDetectionsByConfidence,
  sortDetectionsByConfidence,
  sortDetectionsByArea,
  groupDetectionsByLabel,
} from './utils/layerContext';