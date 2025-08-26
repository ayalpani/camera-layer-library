import '@testing-library/jest-dom';
import 'jest-canvas-mock';

// Mock MediaDevices API
const mockMediaDevices = {
  getUserMedia: jest.fn(),
  enumerateDevices: jest.fn(),
  getDisplayMedia: jest.fn(),
  getSupportedConstraints: jest.fn(() => ({
    width: true,
    height: true,
    aspectRatio: true,
    frameRate: true,
    facingMode: true,
    deviceId: true,
  })),
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  dispatchEvent: jest.fn(),
};

// Mock MediaStream
class MockMediaStream {
  active: boolean = true;
  id: string = 'mock-stream-id';
  
  private tracks: MediaStreamTrack[] = [];
  
  constructor() {
    this.tracks = [
      new MockMediaStreamTrack('video'),
    ];
  }
  
  getTracks(): MediaStreamTrack[] {
    return this.tracks;
  }
  
  getVideoTracks(): MediaStreamTrack[] {
    return this.tracks.filter((track) => track.kind === 'video');
  }
  
  getAudioTracks(): MediaStreamTrack[] {
    return this.tracks.filter((track) => track.kind === 'audio');
  }
  
  addTrack(track: MediaStreamTrack): void {
    this.tracks.push(track);
  }
  
  removeTrack(track: MediaStreamTrack): void {
    const index = this.tracks.indexOf(track);
    if (index > -1) {
      this.tracks.splice(index, 1);
    }
  }
}

// Mock MediaStreamTrack
class MockMediaStreamTrack {
  enabled: boolean = true;
  id: string = 'mock-track-id';
  kind: string;
  label: string = 'Mock Camera';
  muted: boolean = false;
  readyState: 'live' | 'ended' = 'live';
  
  constructor(kind: string = 'video') {
    this.kind = kind;
  }
  
  stop(): void {
    this.readyState = 'ended';
  }
  
  clone(): MediaStreamTrack {
    return new MockMediaStreamTrack(this.kind) as unknown as MediaStreamTrack;
  }
  
  getCapabilities(): MediaTrackCapabilities {
    return {
      width: { min: 320, max: 1920 },
      height: { min: 240, max: 1080 },
      frameRate: { min: 1, max: 60 },
      facingMode: ['user', 'environment'],
    };
  }
  
  getConstraints(): MediaTrackConstraints {
    return {};
  }
  
  getSettings(): MediaTrackSettings {
    return {
      width: 1280,
      height: 720,
      frameRate: 30,
      facingMode: 'user',
      deviceId: 'mock-device-id',
    };
  }
  
  applyConstraints(constraints?: MediaTrackConstraints): Promise<void> {
    return Promise.resolve();
  }
  
  addEventListener(type: string, listener: EventListener): void {}
  removeEventListener(type: string, listener: EventListener): void {}
  dispatchEvent(event: Event): boolean { return true; }
}

// Setup global mocks
Object.defineProperty(global.navigator, 'mediaDevices', {
  writable: true,
  value: mockMediaDevices,
});

global.MediaStream = MockMediaStream as any;
global.MediaStreamTrack = MockMediaStreamTrack as any;

// Mock requestAnimationFrame for testing
global.requestAnimationFrame = jest.fn((callback) => {
  setTimeout(callback, 16); // ~60fps
  return 1;
}) as any;

global.cancelAnimationFrame = jest.fn();

// Mock IntersectionObserver
global.IntersectionObserver = jest.fn().mockImplementation((callback) => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
  root: null,
  rootMargin: '',
  thresholds: [],
  takeRecords: jest.fn(),
}));

// Mock ResizeObserver
global.ResizeObserver = jest.fn().mockImplementation((callback) => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

// Suppress console errors and warnings during tests
const originalError = console.error;
const originalWarn = console.warn;

beforeAll(() => {
  console.error = jest.fn();
  console.warn = jest.fn();
});

afterAll(() => {
  console.error = originalError;
  console.warn = originalWarn;
});

// Clean up after each test
afterEach(() => {
  jest.clearAllMocks();
});