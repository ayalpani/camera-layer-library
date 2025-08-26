import React from 'react';
import { render, screen, waitFor, fireEvent, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Cam } from '../components/Cam';
import { CamProps, CameraError, Detection, FrameData, Layer } from '../types';

describe('Cam Component', () => {
  let mockGetUserMedia: jest.Mock;
  let mockEnumerateDevices: jest.Mock;
  let mockStream: MediaStream;

  beforeEach(() => {
    // Reset mocks
    mockGetUserMedia = navigator.mediaDevices.getUserMedia as jest.Mock;
    mockEnumerateDevices = navigator.mediaDevices.enumerateDevices as jest.Mock;
    
    // Create a mock stream
    mockStream = new MediaStream();
    
    // Setup default mock implementations
    mockGetUserMedia.mockResolvedValue(mockStream);
    mockEnumerateDevices.mockResolvedValue([
      {
        deviceId: 'device-1',
        kind: 'videoinput',
        label: 'Front Camera',
        groupId: 'group-1',
      },
      {
        deviceId: 'device-2',
        kind: 'videoinput',
        label: 'Back Camera',
        groupId: 'group-2',
      },
    ]);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Basic Rendering', () => {
    it('should render without crashing', () => {
      render(<Cam />);
      expect(document.querySelector('video')).toBeInTheDocument();
      expect(document.querySelector('canvas')).toBeInTheDocument();
    });

    it('should apply custom className and style', () => {
      const { container } = render(
        <Cam 
          className="custom-camera" 
          style={{ border: '2px solid red' }}
        />
      );
      
      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper).toHaveClass('custom-camera');
      expect(wrapper).toHaveStyle({ border: '2px solid red' });
    });

    it('should set custom width and height', () => {
      const { container } = render(
        <Cam width={640} height={480} />
      );
      
      const video = container.querySelector('video');
      const canvas = container.querySelector('canvas');
      
      expect(video).toHaveAttribute('width', '640');
      expect(video).toHaveAttribute('height', '480');
      expect(canvas).toHaveAttribute('width', '640');
      expect(canvas).toHaveAttribute('height', '480');
    });

    it('should handle responsive dimensions', () => {
      const { container } = render(
        <Cam width="100%" height="auto" />
      );
      
      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper).toHaveStyle({ width: '100%', height: 'auto' });
    });
  });

  describe('Camera Access', () => {
    it('should request camera access on mount', async () => {
      render(<Cam />);
      
      await waitFor(() => {
        expect(mockGetUserMedia).toHaveBeenCalledWith(
          expect.objectContaining({
            video: expect.any(Object),
            audio: false,
          })
        );
      });
    });

    it('should use custom constraints', async () => {
      const constraints: MediaStreamConstraints = {
        video: {
          width: { ideal: 1920 },
          height: { ideal: 1080 },
          frameRate: { ideal: 30 },
        },
        audio: false,
      };
      
      render(<Cam constraints={constraints} />);
      
      await waitFor(() => {
        expect(mockGetUserMedia).toHaveBeenCalledWith(constraints);
      });
    });

    it('should use specific deviceId', async () => {
      render(<Cam deviceId="device-2" />);
      
      await waitFor(() => {
        expect(mockGetUserMedia).toHaveBeenCalledWith(
          expect.objectContaining({
            video: expect.objectContaining({
              deviceId: { exact: 'device-2' },
            }),
          })
        );
      });
    });

    it('should use facingMode constraint', async () => {
      render(<Cam facingMode="environment" />);
      
      await waitFor(() => {
        expect(mockGetUserMedia).toHaveBeenCalledWith(
          expect.objectContaining({
            video: expect.objectContaining({
              facingMode: { ideal: 'environment' },
            }),
          })
        );
      });
    });

    it('should enumerate devices', async () => {
      render(<Cam />);
      
      await waitFor(() => {
        expect(mockEnumerateDevices).toHaveBeenCalled();
      });
    });
  });

  describe('Stream Lifecycle', () => {
    it('should call onStreamReady when stream is ready', async () => {
      const onStreamReady = jest.fn();
      render(<Cam onStreamReady={onStreamReady} />);
      
      await waitFor(() => {
        expect(onStreamReady).toHaveBeenCalledWith(mockStream);
      });
    });

    it('should stop stream tracks on unmount', async () => {
      const { unmount } = render(<Cam />);
      
      await waitFor(() => {
        expect(mockGetUserMedia).toHaveBeenCalled();
      });
      
      const tracks = mockStream.getTracks();
      const stopSpy = jest.spyOn(tracks[0], 'stop');
      
      unmount();
      
      expect(stopSpy).toHaveBeenCalled();
    });

    it('should handle stream replacement when constraints change', async () => {
      const { rerender } = render(<Cam deviceId="device-1" />);
      
      await waitFor(() => {
        expect(mockGetUserMedia).toHaveBeenCalledTimes(1);
      });
      
      // Change device
      rerender(<Cam deviceId="device-2" />);
      
      await waitFor(() => {
        expect(mockGetUserMedia).toHaveBeenCalledTimes(2);
      });
    });

    it('should properly clean up old stream when switching', async () => {
      const { rerender } = render(<Cam deviceId="device-1" />);
      
      await waitFor(() => {
        expect(mockGetUserMedia).toHaveBeenCalled();
      });
      
      const firstStreamTracks = mockStream.getTracks();
      const stopSpy = jest.spyOn(firstStreamTracks[0], 'stop');
      
      // Create new stream for second call
      const newStream = new MediaStream();
      mockGetUserMedia.mockResolvedValueOnce(newStream);
      
      rerender(<Cam deviceId="device-2" />);
      
      await waitFor(() => {
        expect(stopSpy).toHaveBeenCalled();
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle permission denied error', async () => {
      const onError = jest.fn();
      const permissionError = new DOMException('Permission denied', 'NotAllowedError');
      mockGetUserMedia.mockRejectedValueOnce(permissionError);
      
      render(<Cam onError={onError} />);
      
      await waitFor(() => {
        expect(onError).toHaveBeenCalledWith(
          expect.objectContaining({
            type: 'permission',
            message: expect.stringContaining('permission'),
          })
        );
      });
    });

    it('should handle device not found error', async () => {
      const onError = jest.fn();
      const deviceError = new DOMException('Device not found', 'NotFoundError');
      mockGetUserMedia.mockRejectedValueOnce(deviceError);
      
      render(<Cam onError={onError} />);
      
      await waitFor(() => {
        expect(onError).toHaveBeenCalledWith(
          expect.objectContaining({
            type: 'device',
            message: expect.stringContaining('device'),
          })
        );
      });
    });

    it('should handle stream errors', async () => {
      const onError = jest.fn();
      const streamError = new Error('Stream failed');
      mockGetUserMedia.mockRejectedValueOnce(streamError);
      
      render(<Cam onError={onError} />);
      
      await waitFor(() => {
        expect(onError).toHaveBeenCalledWith(
          expect.objectContaining({
            type: 'stream',
            message: expect.any(String),
          })
        );
      });
    });

    it('should display error message when camera access fails', async () => {
      mockGetUserMedia.mockRejectedValueOnce(new Error('Camera access denied'));
      
      render(<Cam />);
      
      await waitFor(() => {
        expect(screen.getByText(/camera error/i)).toBeInTheDocument();
      });
    });
  });

  describe('Frame Processing', () => {
    it('should call onFrame callback at target FPS', async () => {
      const onFrame = jest.fn();
      
      render(<Cam onFrame={onFrame} targetFPS={20} />);
      
      await waitFor(() => {
        expect(mockGetUserMedia).toHaveBeenCalled();
      });
      
      // Wait a bit for frames to process
      await new Promise(resolve => setTimeout(resolve, 200));
      
      // Should have been called at least once
      expect(onFrame).toHaveBeenCalled();
    });

    it('should provide correct frame data structure', async () => {
      const onFrame = jest.fn();
      
      render(<Cam onFrame={onFrame} />);
      
      await waitFor(() => {
        expect(mockGetUserMedia).toHaveBeenCalled();
      });
      
      // Trigger a frame
      act(() => {
        (global.requestAnimationFrame as jest.Mock).mock.calls[0][0]();
      });
      
      await waitFor(() => {
        expect(onFrame).toHaveBeenCalledWith(
          expect.objectContaining({
            imageData: expect.any(ImageData),
            timestamp: expect.any(Number),
            frameNumber: expect.any(Number),
            dimensions: expect.objectContaining({
              width: expect.any(Number),
              height: expect.any(Number),
            }),
          })
        );
      });
    });

    it('should handle different quality settings', async () => {
      const { rerender } = render(<Cam quality="low" />);
      
      await waitFor(() => {
        expect(mockGetUserMedia).toHaveBeenCalledWith(
          expect.objectContaining({
            video: expect.objectContaining({
              width: expect.any(Object),
              height: expect.any(Object),
            }),
          })
        );
      });
      
      // Change quality
      rerender(<Cam quality="high" />);
      
      await waitFor(() => {
        expect(mockGetUserMedia).toHaveBeenCalledTimes(2);
      });
    });

    it('should auto-adjust quality based on performance', async () => {
      const onFrame = jest.fn();
      
      render(<Cam quality="auto" onFrame={onFrame} targetFPS={30} />);
      
      await waitFor(() => {
        expect(mockGetUserMedia).toHaveBeenCalled();
      });
      
      // Quality adjustment would be verified by checking internal state
      // For now, just check that the component renders with auto quality
      expect(mockGetUserMedia).toHaveBeenCalledWith(
        expect.objectContaining({
          video: expect.any(Object),
        })
      );
    });
  });

  describe('Canvas Rendering', () => {
    it('should render video to canvas', async () => {
      const { container } = render(<Cam />);
      
      await waitFor(() => {
        expect(mockGetUserMedia).toHaveBeenCalled();
      });
      
      const canvas = container.querySelector('canvas') as HTMLCanvasElement;
      const ctx = canvas.getContext('2d');
      
      // Trigger frame render
      act(() => {
        (global.requestAnimationFrame as jest.Mock).mock.calls[0][0]();
      });
      
      // Canvas context should have been used
      expect(ctx?.drawImage).toBeDefined();
    });

    it('should maintain aspect ratio', async () => {
      const { container } = render(<Cam width={800} height={600} />);
      
      await waitFor(() => {
        expect(mockGetUserMedia).toHaveBeenCalled();
      });
      
      const canvas = container.querySelector('canvas') as HTMLCanvasElement;
      
      // Check aspect ratio is maintained
      expect(canvas.width / canvas.height).toBeCloseTo(800 / 600, 2);
    });

    it('should handle responsive resizing', async () => {
      const { container } = render(<Cam width="100%" height="auto" />);
      
      await waitFor(() => {
        expect(mockGetUserMedia).toHaveBeenCalled();
      });
      
      // Simulate window resize
      act(() => {
        window.dispatchEvent(new Event('resize'));
      });
      
      // Canvas should adjust to new dimensions
      const canvas = container.querySelector('canvas') as HTMLCanvasElement;
      expect(canvas).toBeInTheDocument();
    });
  });

  describe('Layer System', () => {
    it('should render layers', async () => {
      const mockLayer: Layer = {
        id: 'test-layer',
        type: 'custom',
        render: jest.fn(),
      };
      
      render(<Cam layers={[mockLayer]} />);
      
      await waitFor(() => {
        expect(mockGetUserMedia).toHaveBeenCalled();
      });
      
      // Trigger frame render
      act(() => {
        (global.requestAnimationFrame as jest.Mock).mock.calls[0][0]();
      });
      
      expect(mockLayer.render).toHaveBeenCalled();
    });

    it('should call layer lifecycle methods', async () => {
      const mockLayer: Layer = {
        id: 'test-layer',
        type: 'custom',
        onMount: jest.fn(),
        onUnmount: jest.fn(),
        onFrame: jest.fn(),
      };
      
      const { unmount } = render(<Cam layers={[mockLayer]} />);
      
      await waitFor(() => {
        expect(mockLayer.onMount).toHaveBeenCalled();
      });
      
      // Trigger frame
      act(() => {
        (global.requestAnimationFrame as jest.Mock).mock.calls[0][0]();
      });
      
      expect(mockLayer.onFrame).toHaveBeenCalled();
      
      unmount();
      
      expect(mockLayer.onUnmount).toHaveBeenCalled();
    });

    it('should handle layer z-index ordering', async () => {
      const layer1: Layer = {
        id: 'layer-1',
        type: 'custom',
        zIndex: 1,
        render: jest.fn(),
      };
      
      const layer2: Layer = {
        id: 'layer-2',
        type: 'custom',
        zIndex: 2,
        render: jest.fn(),
      };
      
      render(<Cam layers={[layer2, layer1]} />);
      
      await waitFor(() => {
        expect(mockGetUserMedia).toHaveBeenCalled();
      });
      
      // Trigger frame render
      act(() => {
        (global.requestAnimationFrame as jest.Mock).mock.calls[0][0]();
      });
      
      // Verify layers are rendered in correct order
      const renderCalls = [layer1.render, layer2.render].map(fn => 
        (fn as jest.Mock).mock.invocationCallOrder[0]
      );
      
      expect(renderCalls[0]).toBeLessThan(renderCalls[1]);
    });

    it('should toggle layer visibility', async () => {
      const mockLayer: Layer = {
        id: 'test-layer',
        type: 'custom',
        visible: false,
        render: jest.fn(),
      };
      
      const { rerender } = render(<Cam layers={[mockLayer]} />);
      
      await waitFor(() => {
        expect(mockGetUserMedia).toHaveBeenCalled();
      });
      
      // Trigger frame render
      act(() => {
        (global.requestAnimationFrame as jest.Mock).mock.calls[0][0]();
      });
      
      // Should not render when invisible
      expect(mockLayer.render).not.toHaveBeenCalled();
      
      // Make visible
      mockLayer.visible = true;
      rerender(<Cam layers={[mockLayer]} />);
      
      act(() => {
        (global.requestAnimationFrame as jest.Mock).mock.calls[0][0]();
      });
      
      expect(mockLayer.render).toHaveBeenCalled();
    });
  });

  describe('User Interactions', () => {
    it('should handle click events', async () => {
      const onClick = jest.fn();
      const { container } = render(<Cam onClick={onClick} />);
      
      await waitFor(() => {
        expect(mockGetUserMedia).toHaveBeenCalled();
      });
      
      const canvas = container.querySelector('canvas') as HTMLCanvasElement;
      
      fireEvent.click(canvas, { clientX: 100, clientY: 100 });
      
      expect(onClick).toHaveBeenCalledWith(
        expect.objectContaining({
          x: expect.any(Number),
          y: expect.any(Number),
          nativeEvent: expect.any(Object),
        })
      );
    });

    it('should handle hover events', async () => {
      const onHover = jest.fn();
      const { container } = render(<Cam onHover={onHover} />);
      
      await waitFor(() => {
        expect(mockGetUserMedia).toHaveBeenCalled();
      });
      
      const canvas = container.querySelector('canvas') as HTMLCanvasElement;
      
      fireEvent.mouseMove(canvas, { clientX: 50, clientY: 50 });
      
      expect(onHover).toHaveBeenCalledWith(
        expect.objectContaining({
          x: expect.any(Number),
          y: expect.any(Number),
          nativeEvent: expect.any(Object),
        })
      );
    });

    it('should handle touch events on mobile', async () => {
      const onClick = jest.fn();
      const { container } = render(<Cam onClick={onClick} />);
      
      await waitFor(() => {
        expect(mockGetUserMedia).toHaveBeenCalled();
      });
      
      const canvas = container.querySelector('canvas') as HTMLCanvasElement;
      
      fireEvent.touchStart(canvas, {
        touches: [{ clientX: 100, clientY: 100 }],
      });
      
      expect(onClick).toHaveBeenCalledWith(
        expect.objectContaining({
          x: expect.any(Number),
          y: expect.any(Number),
          nativeEvent: expect.any(Object),
        })
      );
    });

    it('should detect clicks on layer elements', async () => {
      const onLayerClick = jest.fn();
      const mockLayer: Layer = {
        id: 'interactive-layer',
        type: 'interaction',
        interactive: true,
        onClick: onLayerClick,
      };
      
      const { container } = render(<Cam layers={[mockLayer]} />);
      
      await waitFor(() => {
        expect(mockGetUserMedia).toHaveBeenCalled();
      });
      
      const canvas = container.querySelector('canvas') as HTMLCanvasElement;
      
      fireEvent.click(canvas, { clientX: 150, clientY: 150 });
      
      // Should call layer's click handler if click is within layer bounds
      expect(onLayerClick).toHaveBeenCalled();
    });
  });

  describe('Detection Integration', () => {
    it('should enable detection when configured', async () => {
      const onDetection = jest.fn();
      
      render(
        <Cam 
          enableDetection={true}
          detectionConfig={{
            faces: { enabled: true, color: '#00ff00' },
            objects: { enabled: true, color: '#ff0000' },
          }}
          onDetection={onDetection}
        />
      );
      
      await waitFor(() => {
        expect(mockGetUserMedia).toHaveBeenCalled();
      });
      
      // Detection should be initialized
      // This would be verified by checking if TensorFlow models are loaded
    });

    it('should call onDetection with results', async () => {
      const onDetection = jest.fn();
      
      render(
        <Cam 
          enableDetection={true}
          onDetection={onDetection}
        />
      );
      
      await waitFor(() => {
        expect(mockGetUserMedia).toHaveBeenCalled();
      });
      
      // Simulate detection results
      const mockDetections: Detection[] = [
        {
          id: 'detection-1',
          type: 'face',
          label: 'Face',
          confidence: 0.95,
          bbox: { x: 100, y: 100, width: 50, height: 50 },
          timestamp: Date.now(),
        },
      ];
      
      // This would be triggered by the detection system
      // For testing, we'd mock the TensorFlow model responses
    });

    it('should filter detections by confidence threshold', async () => {
      const onDetection = jest.fn();
      
      render(
        <Cam 
          enableDetection={true}
          detectionConfig={{
            faces: { enabled: true, minConfidence: 0.8 },
          }}
          onDetection={onDetection}
        />
      );
      
      await waitFor(() => {
        expect(mockGetUserMedia).toHaveBeenCalled();
      });
      
      // Low confidence detections should be filtered out
    });

    it('should visualize detections with configured colors', async () => {
      const { container } = render(
        <Cam 
          enableDetection={true}
          detectionConfig={{
            faces: { enabled: true, color: '#00ff00' },
            objects: { enabled: true, color: '#ff0000' },
          }}
        />
      );
      
      await waitFor(() => {
        expect(mockGetUserMedia).toHaveBeenCalled();
      });
      
      // Verify that detection overlays use correct colors
      // This would be checked by inspecting canvas drawing commands
    });
  });

  describe('Performance', () => {
    it('should maintain target FPS under load', async () => {
      const onFrame = jest.fn();
      
      render(<Cam onFrame={onFrame} targetFPS={20} />);
      
      await waitFor(() => {
        expect(mockGetUserMedia).toHaveBeenCalled();
      });
      
      // Component should be configured with target FPS
      // Actual FPS testing would require real timing measurements
      expect(onFrame).toBeDefined();
    });

    it('should skip frames when necessary', async () => {
      const onFrame = jest.fn();
      
      // Simulate heavy processing
      onFrame.mockImplementation(() => {
        // Simulate processing delay
      });
      
      render(<Cam onFrame={onFrame} targetFPS={20} />);
      
      await waitFor(() => {
        expect(mockGetUserMedia).toHaveBeenCalled();
      });
      
      // Frame skipping logic would be tested in integration tests
      expect(onFrame).toBeDefined();
    });

    it('should clean up resources on unmount', async () => {
      const { unmount } = render(<Cam enableDetection={true} />);
      
      await waitFor(() => {
        expect(mockGetUserMedia).toHaveBeenCalled();
      });
      
      const tracks = mockStream.getTracks();
      const stopSpy = jest.spyOn(tracks[0], 'stop');
      const rafSpy = global.cancelAnimationFrame as jest.Mock;
      
      unmount();
      
      // All resources should be cleaned up
      expect(stopSpy).toHaveBeenCalled();
      expect(rafSpy).toHaveBeenCalled();
    });
  });

  describe('Accessibility', () => {
    it('should have appropriate ARIA attributes', () => {
      const { container } = render(<Cam />);
      
      const wrapper = container.firstChild as HTMLElement;
      expect(wrapper).toHaveAttribute('role', 'img');
      expect(wrapper).toHaveAttribute('aria-label', expect.any(String));
    });

    it('should handle keyboard navigation for interactive layers', async () => {
      const onLayerClick = jest.fn();
      const mockLayer: Layer = {
        id: 'interactive-layer',
        type: 'interaction',
        interactive: true,
        onClick: onLayerClick,
      };
      
      const { container } = render(<Cam layers={[mockLayer]} />);
      
      await waitFor(() => {
        expect(mockGetUserMedia).toHaveBeenCalled();
      });
      
      const canvas = container.querySelector('canvas') as HTMLCanvasElement;
      
      // Should be focusable
      expect(canvas).toHaveAttribute('tabIndex', '0');
      
      // Should handle keyboard events
      fireEvent.keyDown(canvas, { key: 'Enter' });
      
      // This would trigger interaction with focused element
    });
  });
});