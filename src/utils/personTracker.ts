/**
 * Person Tracker - Robust object tracking for person detection
 * 
 * Uses IoU (Intersection over Union) based matching with motion prediction
 * to maintain stable tracking IDs across video frames.
 */

import { Detection as MediaPipeDetection } from '@mediapipe/tasks-vision';

export interface TrackedPerson {
  id: number;
  x: number;
  y: number;
  width: number;
  height: number;
  lastSeen: number;
  // Motion prediction
  velocityX: number;
  velocityY: number;
  // Tracking metadata
  detectionCount: number;
  missedFrames: number;
  confidence: number;
}

export interface TrackingConfig {
  maxAge: number;           // How long to keep a track if not seen (ms)
  maxMissedFrames: number;  // Max consecutive frames without detection
  iouThreshold: number;     // Minimum IoU for matching (0-1)
  distanceThreshold: number; // Fallback distance threshold (pixels)
  enableMotionPrediction: boolean;
}

const DEFAULT_CONFIG: TrackingConfig = {
  maxAge: 1000,              // 1 second
  maxMissedFrames: 5,        // 5 frames
  iouThreshold: 0.3,         // 30% overlap
  distanceThreshold: 100,    // 100 pixels
  enableMotionPrediction: true
};

export class PersonTracker {
  private tracks: TrackedPerson[] = [];
  private nextId: number = 1;
  private config: TrackingConfig;
  private lastFrameTime: number = 0;

  constructor(config: Partial<TrackingConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Calculate Intersection over Union (IoU) between two bounding boxes
   */
  private calculateIoU(
    box1: { x: number; y: number; width: number; height: number },
    box2: { x: number; y: number; width: number; height: number }
  ): number {
    const x1 = Math.max(box1.x, box2.x);
    const y1 = Math.max(box1.y, box2.y);
    const x2 = Math.min(box1.x + box1.width, box2.x + box2.width);
    const y2 = Math.min(box1.y + box1.height, box2.y + box2.height);

    const intersection = Math.max(0, x2 - x1) * Math.max(0, y2 - y1);
    const area1 = box1.width * box1.height;
    const area2 = box2.width * box2.height;
    const union = area1 + area2 - intersection;

    return union > 0 ? intersection / union : 0;
  }

  /**
   * Calculate center distance between two bounding boxes
   */
  private calculateDistance(
    box1: { x: number; y: number; width: number; height: number },
    box2: { x: number; y: number; width: number; height: number }
  ): number {
    const center1X = box1.x + box1.width / 2;
    const center1Y = box1.y + box1.height / 2;
    const center2X = box2.x + box2.width / 2;
    const center2Y = box2.y + box2.height / 2;

    return Math.sqrt(
      Math.pow(center2X - center1X, 2) + Math.pow(center2Y - center1Y, 2)
    );
  }

  /**
   * Predict next position based on velocity (simple linear prediction)
   */
  private predictPosition(track: TrackedPerson, deltaTime: number): { x: number; y: number } {
    if (!this.config.enableMotionPrediction) {
      return { x: track.x, y: track.y };
    }

    // Simple linear prediction
    const predictedX = track.x + track.velocityX * deltaTime;
    const predictedY = track.y + track.velocityY * deltaTime;

    return { x: predictedX, y: predictedY };
  }

  /**
   * Match detections to existing tracks using IoU and distance
   */
  private matchDetections(
    detections: MediaPipeDetection[],
    canvasWidth: number,
    canvasHeight: number
  ): Map<number, { detection: MediaPipeDetection; score: number }> {
    const matches = new Map<number, { detection: MediaPipeDetection; score: number }>();
    const usedDetections = new Set<number>();
    const usedTracks = new Set<number>();

    const now = Date.now();
    const deltaTime = this.lastFrameTime > 0 ? (now - this.lastFrameTime) / 1000 : 0;

    // Try to match each detection to an existing track
    detections.forEach((detection, detIdx) => {
      if (!detection.boundingBox) return;

      const detX = detection.boundingBox.originX * canvasWidth;
      const detY = detection.boundingBox.originY * canvasHeight;
      const detWidth = detection.boundingBox.width * canvasWidth;
      const detHeight = detection.boundingBox.height * canvasHeight;

      const detBox = { x: detX, y: detY, width: detWidth, height: detHeight };

      let bestTrackId = -1;
      let bestScore = -1;

      // Try to match with existing tracks
      this.tracks.forEach(track => {
        if (usedTracks.has(track.id)) return;

        // Predict position based on motion
        const predicted = this.predictPosition(track, deltaTime);
        const predictedBox = {
          x: predicted.x,
          y: predicted.y,
          width: track.width,
          height: track.height
        };

        // Calculate IoU
        const iou = this.calculateIoU(detBox, predictedBox);

        // Calculate distance as fallback
        const distance = this.calculateDistance(detBox, predictedBox);

        // Score based on IoU (primary) and distance (secondary)
        let score = 0;
        if (iou >= this.config.iouThreshold) {
          score = iou * 1000; // High score for good IoU match
        } else if (distance < this.config.distanceThreshold) {
          score = (1 - distance / this.config.distanceThreshold) * 100; // Lower score for distance match
        }

        if (score > bestScore) {
          bestScore = score;
          bestTrackId = track.id;
        }
      });

      // If we found a good match, record it
      if (bestTrackId >= 0 && bestScore > 0) {
        matches.set(bestTrackId, { detection, score: bestScore });
        usedTracks.add(bestTrackId);
        usedDetections.add(detIdx);
      }
    });

    return matches;
  }

  /**
   * Update tracks with new detections
   */
  update(
    detections: MediaPipeDetection[],
    canvasWidth: number,
    canvasHeight: number
  ): TrackedPerson[] {
    const now = Date.now();
    const deltaTime = this.lastFrameTime > 0 ? (now - this.lastFrameTime) / 1000 : 0;
    this.lastFrameTime = now;

    // Filter for person detections only
    const personDetections = detections.filter(
      det => det.categories[0]?.categoryName === 'person' && det.boundingBox
    );

    // Match detections to existing tracks
    const matches = this.matchDetections(personDetections, canvasWidth, canvasHeight);

    // Update matched tracks
    matches.forEach(({ detection }, trackId) => {
      const track = this.tracks.find(t => t.id === trackId);
      if (!track || !detection.boundingBox) return;

      const newX = detection.boundingBox.originX * canvasWidth;
      const newY = detection.boundingBox.originY * canvasHeight;
      const newWidth = detection.boundingBox.width * canvasWidth;
      const newHeight = detection.boundingBox.height * canvasHeight;

      // Update velocity (simple exponential smoothing)
      if (deltaTime > 0) {
        const newVelX = (newX - track.x) / deltaTime;
        const newVelY = (newY - track.y) / deltaTime;
        track.velocityX = track.velocityX * 0.7 + newVelX * 0.3;
        track.velocityY = track.velocityY * 0.7 + newVelY * 0.3;
      }

      // Update position and metadata
      track.x = newX;
      track.y = newY;
      track.width = newWidth;
      track.height = newHeight;
      track.lastSeen = now;
      track.detectionCount++;
      track.missedFrames = 0;
      track.confidence = detection.categories[0]?.score || 0;
    });

    // Create new tracks for unmatched detections
    personDetections.forEach((detection, idx) => {
      if (!matches.has(idx) && !Array.from(matches.values()).some(m => m.detection === detection)) {
        if (!detection.boundingBox) return;

        const newX = detection.boundingBox.originX * canvasWidth;
        const newY = detection.boundingBox.originY * canvasHeight;
        const newWidth = detection.boundingBox.width * canvasWidth;
        const newHeight = detection.boundingBox.height * canvasHeight;

        this.tracks.push({
          id: this.nextId++,
          x: newX,
          y: newY,
          width: newWidth,
          height: newHeight,
          lastSeen: now,
          velocityX: 0,
          velocityY: 0,
          detectionCount: 1,
          missedFrames: 0,
          confidence: detection.categories[0]?.score || 0
        });
      }
    });

    // Update missed frames for unmatched tracks
    this.tracks.forEach(track => {
      if (!matches.has(track.id)) {
        track.missedFrames++;
      }
    });

    // Remove old tracks
    this.tracks = this.tracks.filter(track => {
      const age = now - track.lastSeen;
      return age < this.config.maxAge && track.missedFrames < this.config.maxMissedFrames;
    });

    return this.tracks;
  }

  /**
   * Get current active tracks
   */
  getActiveTracks(): TrackedPerson[] {
    return this.tracks;
  }

  /**
   * Get total number of tracks created (not unique people, just track IDs)
   */
  getTotalTracksCreated(): number {
    return this.nextId - 1;
  }

  /**
   * Reset tracker state
   */
  reset(): void {
    this.tracks = [];
    this.nextId = 1;
    this.lastFrameTime = 0;
  }

  /**
   * Get tracking statistics
   */
  getStats(): {
    activeTracks: number;
    totalTracksCreated: number;
    averageDetectionsPerTrack: number;
  } {
    const activeTracks = this.tracks.length;
    const totalTracksCreated = this.nextId - 1;
    const totalDetections = this.tracks.reduce((sum, t) => sum + t.detectionCount, 0);
    const averageDetectionsPerTrack = activeTracks > 0 ? totalDetections / activeTracks : 0;

    return {
      activeTracks,
      totalTracksCreated,
      averageDetectionsPerTrack
    };
  }
}
