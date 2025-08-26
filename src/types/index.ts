import { CSSProperties, ComponentType, ReactNode } from 'react';

// Camera Component Props
export interface CamProps {
  // Camera Configuration
  constraints?: MediaStreamConstraints;
  deviceId?: string;
  facingMode?: 'user' | 'environment';
  
  // Layer Configuration
  layers?: Layer[];
  enableDetection?: boolean;
  detectionConfig?: DetectionConfig;
  
  // Event Handlers
  onFrame?: (frame: FrameData) => void;
  onDetection?: (detections: Detection[]) => void;
  onError?: (error: CameraError) => void;
  onStreamReady?: (stream: MediaStream) => void;
  onClick?: (event: LayerClickEvent) => void;
  onHover?: (event: LayerHoverEvent) => void;
  
  // Performance
  targetFPS?: number; // default: 20
  quality?: 'low' | 'medium' | 'high' | 'auto';
  
  // Styling
  className?: string;
  style?: CSSProperties;
  width?: number | string;
  height?: number | string;
  
  // Additional
  muted?: boolean;
  autoPlay?: boolean;
}

// Layer System
export interface Layer {
  id: string;
  type: 'detection' | 'annotation' | 'interaction' | 'custom';
  visible?: boolean;
  zIndex?: number;
  
  // Lifecycle
  onMount?: (context: LayerContext) => void;
  onUnmount?: () => void;
  onFrame?: (frame: FrameData, context: LayerContext) => void;
  onDetection?: (detections: Detection[], context: LayerContext) => void;
  
  // Rendering
  render?: (canvas: CanvasRenderingContext2D, context: LayerContext) => void;
  component?: ComponentType<LayerComponentProps>;
  
  // Interaction
  interactive?: boolean;
  onClick?: (event: LayerClickEvent) => void;
  onHover?: (event: LayerHoverEvent) => void;
}

export interface LayerContext {
  detections: Detection[];
  frame: FrameData;
  canvas: HTMLCanvasElement;
  dimensions: Dimensions;
  deviceInfo: DeviceInfo;
}

export interface LayerComponentProps {
  context: LayerContext;
  children?: ReactNode;
}

// Detection Configuration
export interface DetectionConfig {
  faces?: FaceDetectionConfig;
  objects?: ObjectDetectionConfig;
  custom?: CustomDetectionConfig;
}

export interface FaceDetectionConfig {
  enabled: boolean;
  model?: 'blazeface' | 'mediapipe';
  minConfidence?: number; // 0-1, default: 0.5
  maxFaces?: number;
  color?: string; // Hex color for visualization
}

export interface ObjectDetectionConfig {
  enabled: boolean;
  model?: 'coco-ssd' | 'mobilenet';
  minConfidence?: number; // 0-1, default: 0.5
  maxObjects?: number;
  color?: string; // Hex color for visualization
  categories?: string[]; // Filter specific object types
}

export interface CustomDetectionConfig {
  model: any; // TensorFlow.js model
  preprocess?: (frame: ImageData) => any;
  postprocess?: (predictions: any) => Detection[];
}

// Detection Data Types
export interface Detection {
  id: string;
  type: 'face' | 'object' | 'custom';
  label: string;
  confidence: number;
  bbox: BoundingBox;
  landmarks?: Landmark[];
  metadata?: Record<string, any>;
  timestamp: number;
}

export interface BoundingBox {
  x: number;      // Top-left X coordinate
  y: number;      // Top-left Y coordinate
  width: number;   // Width in pixels
  height: number;  // Height in pixels
}

export interface Landmark {
  name: string;
  x: number;
  y: number;
  z?: number;
}

// Frame Data
export interface FrameData {
  imageData: ImageData;
  timestamp: number;
  frameNumber: number;
  dimensions: Dimensions;
}

export interface Dimensions {
  width: number;
  height: number;
}

// Device Information
export interface DeviceInfo {
  deviceId: string;
  label: string;
  kind: MediaDeviceKind;
  facingMode?: 'user' | 'environment';
  capabilities?: MediaTrackCapabilities;
}

// Event Types
export interface LayerClickEvent {
  x: number;
  y: number;
  layer?: Layer;
  detection?: Detection;
  nativeEvent: MouseEvent | TouchEvent;
}

export interface LayerHoverEvent {
  x: number;
  y: number;
  layer?: Layer;
  detection?: Detection;
  nativeEvent: MouseEvent;
}

// Error Types
export interface CameraError {
  type: 'permission' | 'device' | 'stream' | 'detection';
  message: string;
  details?: any;
}

// Hook Types
export interface UseCameraOptions {
  constraints?: MediaStreamConstraints;
  deviceId?: string;
  facingMode?: 'user' | 'environment';
  autoStart?: boolean;
}

export interface UseCameraReturn {
  stream: MediaStream | null;
  devices: MediaDeviceInfo[];
  currentDevice: MediaDeviceInfo | null;
  switchCamera: () => Promise<void>;
  toggleCamera: () => void;
  isActive: boolean;
  error: CameraError | null;
}

export interface UseDetectionOptions {
  config?: DetectionConfig;
  enabled?: boolean;
}

export interface UseDetectionReturn {
  detections: Detection[];
  isProcessing: boolean;
  startDetection: () => void;
  stopDetection: () => void;
  updateConfig: (config: DetectionConfig) => void;
}

export interface UseLayerReturn {
  addLayer: (layer: Layer) => void;
  removeLayer: (layerId: string) => void;
  updateLayer: (layerId: string, updates: Partial<Layer>) => void;
  layers: Layer[];
  getLayerById: (layerId: string) => Layer | undefined;
}