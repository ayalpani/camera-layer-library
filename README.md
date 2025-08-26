# Camera Layer Library

React-based camera view component library with multi-layer system and object detection.

## Installation

```bash
npm install camera-layer-library
```

## Usage

```tsx
import { Cam } from 'camera-layer-library';

function App() {
  return (
    <Cam 
      enableFaceDetection={true}
      enableObjectDetection={true}
      onDetection={(results) => console.log(results)}
    />
  );
}
```
