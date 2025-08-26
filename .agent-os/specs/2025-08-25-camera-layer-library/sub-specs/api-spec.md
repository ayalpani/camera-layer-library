# API Specification

This is the API specification for the spec detailed in @.agent-os/specs/2025-08-25-camera-layer-library/spec.md

> Created: 2025-08-25
> Version: 1.0.0

## Component API

### Main Component: `<Cam />`

```tsx
interface CamProps {
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
  
  // Performance
  targetFPS?: number; // default: 20
  quality?: 'low' | 'medium' | 'high' | 'auto';
  
  // Styling
  className?: string;
  style?: React.CSSProperties;
  width?: number | string;
  height?: number | string;
}
```

## Layer System API

### Base Layer Interface

```tsx
interface Layer {
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
  component?: React.ComponentType<LayerComponentProps>;
  
  // Interaction
  interactive?: boolean;
  onClick?: (event: LayerClickEvent) => void;
  onHover?: (event: LayerHoverEvent) => void;
}

interface LayerContext {
  detections: Detection[];
  frame: FrameData;
  canvas: HTMLCanvasElement;
  dimensions: { width: number; height: number };
  deviceInfo: DeviceInfo;
}
```

### Detection Configuration

```tsx
interface DetectionConfig {
  faces?: {
    enabled: boolean;
    model?: 'blazeface' | 'mediapipe';
    minConfidence?: number; // 0-1, default: 0.5
    maxFaces?: number;
    color?: string; // Hex color for visualization
  };
  objects?: {
    enabled: boolean;
    model?: 'coco-ssd' | 'mobilenet';
    minConfidence?: number; // 0-1, default: 0.5
    maxObjects?: number;
    color?: string; // Hex color for visualization
    categories?: string[]; // Filter specific object types
  };
  custom?: {
    model: any; // TensorFlow.js model
    preprocess?: (frame: ImageData) => any;
    postprocess?: (predictions: any) => Detection[];
  };
}
```

## Data Types

### Detection Object

```tsx
interface Detection {
  id: string;
  type: 'face' | 'object' | 'custom';
  label: string;
  confidence: number;
  bbox: BoundingBox;
  landmarks?: Landmark[];
  metadata?: Record<string, any>;
  timestamp: number;
}

interface BoundingBox {
  x: number;      // Top-left X coordinate
  y: number;      // Top-left Y coordinate
  width: number;   // Width in pixels
  height: number;  // Height in pixels
}

interface Landmark {
  name: string;
  x: number;
  y: number;
  z?: number;
}
```

### Frame Data

```tsx
interface FrameData {
  imageData: ImageData;
  timestamp: number;
  frameNumber: number;
  dimensions: { width: number; height: number };
}
```

### Event Types

```tsx
interface LayerClickEvent {
  x: number;
  y: number;
  layer?: Layer;
  detection?: Detection;
  nativeEvent: MouseEvent | TouchEvent;
}

interface LayerHoverEvent {
  x: number;
  y: number;
  layer?: Layer;
  detection?: Detection;
  nativeEvent: MouseEvent;
}

interface CameraError {
  type: 'permission' | 'device' | 'stream' | 'detection';
  message: string;
  details?: any;
}
```

## Hook APIs

### useCamera Hook

```tsx
const {
  stream,
  devices,
  currentDevice,
  switchCamera,
  toggleCamera,
  isActive,
  error
} = useCamera(options?: UseCameraOptions);
```

### useDetection Hook

```tsx
const {
  detections,
  isProcessing,
  startDetection,
  stopDetection,
  updateConfig
} = useDetection(config?: DetectionConfig);
```

### useLayer Hook

```tsx
const {
  addLayer,
  removeLayer,
  updateLayer,
  layers,
  getLayerById
} = useLayer();
```

## Usage Examples

### Basic Camera with Object Detection

```tsx
<Cam
  enableDetection={true}
  detectionConfig={{
    faces: { enabled: true, color: '#00ff00' },
    objects: { enabled: true, color: '#ff0000' }
  }}
  onDetection={(detections) => {
    console.log('Detected:', detections);
  }}
  targetFPS={20}
/>
```

### Custom Layer Implementation

```tsx
const customLayer: Layer = {
  id: 'highlight-layer',
  type: 'custom',
  onDetection: (detections, context) => {
    // React to detections
  },
  render: (canvas, context) => {
    // Draw on canvas
    context.detections.forEach(detection => {
      if (detection.type === 'face') {
        // Draw custom overlay
      }
    });
  }
};

<Cam layers={[customLayer]} />
```

### Interactive Detection

```tsx
<Cam
  enableDetection={true}
  onClick={(event) => {
    if (event.detection) {
      alert(`Clicked on: ${event.detection.label}`);
    }
  }}
/>
```

## Error Handling

The component provides comprehensive error handling through the `onError` callback:

- **Permission Denied**: User denies camera access
- **Device Not Found**: No camera available
- **Stream Error**: Camera stream fails
- **Detection Error**: ML model loading or processing fails

Each error includes type, message, and relevant details for debugging.