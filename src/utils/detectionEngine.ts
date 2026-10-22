// AI Detection Engine - Type Definitions
// This file provides type definitions for AI detection
// The actual detection logic is implemented directly in AIDetection.tsx

export interface Detection {
  class: string;
  score: number;
  bbox: [number, number, number, number]; // [x, y, width, height]
}

export interface DetectionResult {
  detections: Detection[];
  personCount: number;
  timestamp: number;
  inferenceTime: number; // ms
}

// Placeholder class - actual detection is done in AIDetection.tsx
export class AIDetectionEngine {
  async initialize(): Promise<void> {
    // No model loading needed - detection is simulated in the component
    console.log('✅ AI Detection Engine ready (simulation mode)');
  }

  getStatus(): { isLoading: boolean; isReady: boolean } {
    return {
      isLoading: false,
      isReady: true,
    };
  }

  dispose(): void {
    // Nothing to clean up
  }
}

// Singleton instance
export const detectionEngine = new AIDetectionEngine();
