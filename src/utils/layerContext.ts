import { LayerContext, Detection, FrameData, Dimensions, DeviceInfo } from '../types';

interface CreateLayerContextOptions {
  detections: Detection[];
  frame: FrameData;
  canvas: HTMLCanvasElement;
  dimensions: Dimensions;
  deviceInfo: DeviceInfo;
}

export function createLayerContext({
  detections,
  frame,
  canvas,
  dimensions,
  deviceInfo,
}: CreateLayerContextOptions): LayerContext {
  return {
    detections,
    frame,
    canvas,
    dimensions,
    deviceInfo,
  };
}

export function isPointInBoundingBox(
  x: number,
  y: number,
  bbox: Detection['bbox']
): boolean {
  return (
    x >= bbox.x &&
    x <= bbox.x + bbox.width &&
    y >= bbox.y &&
    y <= bbox.y + bbox.height
  );
}

export function findDetectionAtPoint(
  x: number,
  y: number,
  detections: Detection[]
): Detection | undefined {
  // Return the topmost detection (last in array, assuming they're sorted by z-order)
  for (let i = detections.length - 1; i >= 0; i--) {
    const detection = detections[i];
    if (isPointInBoundingBox(x, y, detection.bbox)) {
      return detection;
    }
  }
  return undefined;
}

export function scaleCoordinates(
  x: number,
  y: number,
  fromDimensions: Dimensions,
  toDimensions: Dimensions
): { x: number; y: number } {
  return {
    x: (x / fromDimensions.width) * toDimensions.width,
    y: (y / fromDimensions.height) * toDimensions.height,
  };
}

export function scaleBoundingBox(
  bbox: Detection['bbox'],
  fromDimensions: Dimensions,
  toDimensions: Dimensions
): Detection['bbox'] {
  const scaleX = toDimensions.width / fromDimensions.width;
  const scaleY = toDimensions.height / fromDimensions.height;
  
  return {
    x: bbox.x * scaleX,
    y: bbox.y * scaleY,
    width: bbox.width * scaleX,
    height: bbox.height * scaleY,
  };
}

export function getDetectionCenter(bbox: Detection['bbox']): { x: number; y: number } {
  return {
    x: bbox.x + bbox.width / 2,
    y: bbox.y + bbox.height / 2,
  };
}

export function getDetectionArea(bbox: Detection['bbox']): number {
  return bbox.width * bbox.height;
}

export function doDetectionsOverlap(
  bbox1: Detection['bbox'],
  bbox2: Detection['bbox']
): boolean {
  return !(
    bbox1.x + bbox1.width < bbox2.x ||
    bbox2.x + bbox2.width < bbox1.x ||
    bbox1.y + bbox1.height < bbox2.y ||
    bbox2.y + bbox2.height < bbox1.y
  );
}

export function getOverlapArea(
  bbox1: Detection['bbox'],
  bbox2: Detection['bbox']
): number {
  if (!doDetectionsOverlap(bbox1, bbox2)) {
    return 0;
  }
  
  const xOverlap = Math.min(bbox1.x + bbox1.width, bbox2.x + bbox2.width) - 
                   Math.max(bbox1.x, bbox2.x);
  const yOverlap = Math.min(bbox1.y + bbox1.height, bbox2.y + bbox2.height) - 
                   Math.max(bbox1.y, bbox2.y);
  
  return xOverlap * yOverlap;
}

export function getIoU(
  bbox1: Detection['bbox'],
  bbox2: Detection['bbox']
): number {
  const overlapArea = getOverlapArea(bbox1, bbox2);
  if (overlapArea === 0) return 0;
  
  const area1 = getDetectionArea(bbox1);
  const area2 = getDetectionArea(bbox2);
  const unionArea = area1 + area2 - overlapArea;
  
  return overlapArea / unionArea;
}

export function filterDetectionsByType(
  detections: Detection[],
  type: Detection['type']
): Detection[] {
  return detections.filter(d => d.type === type);
}

export function filterDetectionsByConfidence(
  detections: Detection[],
  minConfidence: number
): Detection[] {
  return detections.filter(d => d.confidence >= minConfidence);
}

export function sortDetectionsByConfidence(
  detections: Detection[],
  descending: boolean = true
): Detection[] {
  return [...detections].sort((a, b) => 
    descending ? b.confidence - a.confidence : a.confidence - b.confidence
  );
}

export function sortDetectionsByArea(
  detections: Detection[],
  descending: boolean = true
): Detection[] {
  return [...detections].sort((a, b) => {
    const areaA = getDetectionArea(a.bbox);
    const areaB = getDetectionArea(b.bbox);
    return descending ? areaB - areaA : areaA - areaB;
  });
}

export function groupDetectionsByLabel(
  detections: Detection[]
): Record<string, Detection[]> {
  return detections.reduce((groups, detection) => {
    const label = detection.label;
    if (!groups[label]) {
      groups[label] = [];
    }
    groups[label].push(detection);
    return groups;
  }, {} as Record<string, Detection[]>);
}