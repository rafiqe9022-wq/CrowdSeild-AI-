import * as tf from '@tensorflow/tfjs';
import * as cocoSsd from '@tensorflow-models/coco-ssd';

export interface Detection {
  class: string;
  score: number;
  bbox: [number, number, number, number];
}

export interface DetectionResult {
  detections: Detection[];
  personCount: number;
  timestamp: number;
  inferenceTime: number;
}

export class AIDetectionEngine {
  private model: cocoSsd.ObjectDetection | null = null;
  private isLoading: boolean = false;
  private isReady: boolean = false;

  async initialize(): Promise<void> {
    if (this.isReady || this.isLoading) {
      return;
    }

    this.isLoading = true;
    try {
      console.log('🔄 Loading COCO-SSD AI model...');
      // Load the COCO-SSD model
      this.model = await cocoSsd.load({
        base: 'lite_mobilenet_v2',
      });
      this.isReady = true;
      console.log('✅ COCO-SSD model loaded successfully!');
    } catch (error) {
      console.error('❌ Failed to load AI model:', error);
      throw new Error('Failed to initialize AI detection model. Please check your internet connection and try again.');
    } finally {
      this.isLoading = false;
    }
  }

  async detectFromVideo(videoElement: HTMLVideoElement): Promise<DetectionResult> {
    if (!this.model || !this.isReady) {
      throw new Error('Model not initialized. Call initialize() first.');
    }

    const startTime = performance.now();
    
    // Run real AI detection on the video frame
    const predictions = await this.model.detect(videoElement);
    
    const endTime = performance.now();
    const inferenceTime = endTime - startTime;

    // Filter for person detections with confidence > 50%
    const personDetections: Detection[] = predictions
      .filter(pred => pred.class === 'person' && pred.score > 0.5)
      .map(pred => ({
        class: pred.class,
        score: pred.score,
        bbox: pred.bbox as [number, number, number, number],
      }));

    return {
      detections: personDetections,
      personCount: personDetections.length,
      timestamp: Date.now(),
      inferenceTime,
    };
  }

  async detectFromImage(imageElement: HTMLImageElement): Promise<DetectionResult> {
    if (!this.model || !this.isReady) {
      throw new Error('Model not initialized. Call initialize() first.');
    }

    const startTime = performance.now();
    const predictions = await this.model.detect(imageElement);
    const endTime = performance.now();
    const inferenceTime = endTime - startTime;

    const personDetections: Detection[] = predictions
      .filter(pred => pred.class === 'person' && pred.score > 0.5)
      .map(pred => ({
        class: pred.class,
        score: pred.score,
        bbox: pred.bbox as [number, number, number, number],
      }));

    return {
      detections: personDetections,
      personCount: personDetections.length,
      timestamp: Date.now(),
      inferenceTime,
    };
  }

  getStatus(): { isLoading: boolean; isReady: boolean } {
    return {
      isLoading: this.isLoading,
      isReady: this.isReady,
    };
  }

  dispose(): void {
    if (this.model) {
      this.model.dispose();
      this.model = null;
      this.isReady = false;
    }
  }
}

// Singleton instance
export const detectionEngine = new AIDetectionEngine();
