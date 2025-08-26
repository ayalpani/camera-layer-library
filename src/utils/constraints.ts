import { CamProps } from '../types';

interface QualityPreset {
  width: { ideal: number };
  height: { ideal: number };
  frameRate: { ideal: number };
}

const QUALITY_PRESETS: Record<NonNullable<CamProps['quality']>, QualityPreset> = {
  low: {
    width: { ideal: 640 },
    height: { ideal: 480 },
    frameRate: { ideal: 15 },
  },
  medium: {
    width: { ideal: 1280 },
    height: { ideal: 720 },
    frameRate: { ideal: 30 },
  },
  high: {
    width: { ideal: 1920 },
    height: { ideal: 1080 },
    frameRate: { ideal: 30 },
  },
  auto: {
    // Start with medium, will adjust based on performance
    width: { ideal: 1280 },
    height: { ideal: 720 },
    frameRate: { ideal: 30 },
  },
};

export function getQualityConstraints(
  quality: CamProps['quality'] = 'medium'
): MediaTrackConstraints {
  const preset = QUALITY_PRESETS[quality];
  
  return {
    ...preset,
    // Additional constraints for better compatibility
    resizeMode: 'crop-and-scale' as any,
    aspectRatio: { ideal: 16 / 9 },
  };
}

export function getMobileConstraints(): MediaTrackConstraints {
  // Optimized constraints for mobile devices
  return {
    width: { ideal: 1280, max: 1280 },
    height: { ideal: 720, max: 720 },
    frameRate: { ideal: 30, max: 30 },
    facingMode: { ideal: 'environment' }, // Default to back camera on mobile
  };
}

export function getConstraintsWithDeviceId(
  deviceId: string,
  baseConstraints?: MediaTrackConstraints
): MediaTrackConstraints {
  return {
    ...baseConstraints,
    deviceId: { exact: deviceId },
  };
}

export function getConstraintsWithFacingMode(
  facingMode: 'user' | 'environment',
  baseConstraints?: MediaTrackConstraints
): MediaTrackConstraints {
  return {
    ...baseConstraints,
    facingMode: { ideal: facingMode },
  };
}

export function isMobileDevice(): boolean {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  );
}

export function combineConstraints(
  ...constraints: (MediaTrackConstraints | undefined)[]
): MediaTrackConstraints {
  const combined: MediaTrackConstraints = {};
  
  for (const constraint of constraints) {
    if (constraint) {
      Object.assign(combined, constraint);
    }
  }
  
  return combined;
}

export function validateConstraints(
  constraints: MediaTrackConstraints
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  // Check width constraints
  if (constraints.width) {
    const width = constraints.width as ConstrainULongRange;
    if (width.min && width.max && width.min > width.max) {
      errors.push('Width min value is greater than max value');
    }
    if (width.exact && (width.min || width.max)) {
      errors.push('Width cannot have both exact and min/max constraints');
    }
  }
  
  // Check height constraints
  if (constraints.height) {
    const height = constraints.height as ConstrainULongRange;
    if (height.min && height.max && height.min > height.max) {
      errors.push('Height min value is greater than max value');
    }
    if (height.exact && (height.min || height.max)) {
      errors.push('Height cannot have both exact and min/max constraints');
    }
  }
  
  // Check frameRate constraints
  if (constraints.frameRate) {
    const frameRate = constraints.frameRate as ConstrainDoubleRange;
    if (frameRate.min && frameRate.max && frameRate.min > frameRate.max) {
      errors.push('FrameRate min value is greater than max value');
    }
    if (frameRate.ideal && frameRate.ideal < 1) {
      errors.push('FrameRate ideal value must be at least 1');
    }
  }
  
  // Check facingMode constraints
  if (constraints.facingMode) {
    const facingMode = constraints.facingMode as ConstrainDOMString;
    const validModes = ['user', 'environment', 'left', 'right'];
    
    if (typeof facingMode === 'string' && !validModes.includes(facingMode)) {
      errors.push(`Invalid facingMode: ${facingMode}`);
    }
    
    if (typeof facingMode === 'object') {
      const value = facingMode.exact || facingMode.ideal;
      if (value && !validModes.includes(value as string)) {
        errors.push(`Invalid facingMode value: ${value}`);
      }
    }
  }
  
  return {
    valid: errors.length === 0,
    errors,
  };
}

// Type helpers for constraint ranges
interface ConstrainULongRange {
  min?: number;
  max?: number;
  exact?: number;
  ideal?: number;
}

interface ConstrainDoubleRange {
  min?: number;
  max?: number;
  exact?: number;
  ideal?: number;
}

interface ConstrainDOMString {
  exact?: string;
  ideal?: string;
}