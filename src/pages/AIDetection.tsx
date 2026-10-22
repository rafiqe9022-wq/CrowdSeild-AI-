import React, { useRef, useState, useEffect, useCallback } from 'react';
import { detectionEngine, DetectionResult } from '../utils/detectionEngine';
import { Camera, Upload, Play, Pause, AlertTriangle, Activity, ImageIcon } from 'lucide-react';

export default function AIDetection() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number>();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isModelLoading, setIsModelLoading] = useState(false);
  const [isModelReady, setIsModelReady] = useState(false);
  const [isDetecting, setIsDetecting] = useState(false);
  const [videoSource, setVideoSource] = useState<'none' | 'webcam' | 'file' | 'demo'>('none');
  const [currentResult, setCurrentResult] = useState<DetectionResult | null>(null);
  const [fps, setFps] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [videoFileName, setVideoFileName] = useState<string>('');
  const [demoImage, setDemoImage] = useState<HTMLImageElement | null>(null);

  // Density thresholds (people detected in frame)
  const DENSITY_THRESHOLDS = {
    low: 5,
    medium: 15,
    high: 30,
  };

  // Initialize the AI model on component mount
  useEffect(() => {
    const loadModel = async () => {
      setIsModelLoading(true);
      setError(null);
      try {
        await detectionEngine.initialize();
        setIsModelReady(true);
      } catch (err) {
        setError('Failed to load AI model. Please refresh the page.');
        console.error(err);
      } finally {
        setIsModelLoading(false);
      }
    };

    loadModel();

    return () => {
      // Cleanup on unmount
      stopDetection();
      detectionEngine.dispose();
    };
  }, []);

  // Start webcam
  const startWebcam = async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480 },
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setVideoSource('webcam');
        setVideoFileName('Live Webcam');
      }
    } catch (err) {
      setError('Failed to access webcam. Please check permissions.');
      console.error(err);
    }
  };

  // Handle video file upload
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('video/')) {
      setError('Please upload a valid video file (MP4, WebM, etc.)');
      return;
    }

    // Validate file size (max 100MB)
    if (file.size > 100 * 1024 * 1024) {
      setError('Video file is too large. Maximum size is 100MB.');
      return;
    }

    setError(null);
    const url = URL.createObjectURL(file);
    if (videoRef.current) {
      videoRef.current.src = url;
      setVideoSource('file');
      setVideoFileName(file.name);
    }
  };

  // Load demo image
  const loadDemoImage = () => {
    setError(null);
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      setDemoImage(img);
      setVideoSource('demo');
      setVideoFileName('Demo Crowd Scene');
    };
    img.onerror = () => {
      setError('Failed to load demo image. Please check your internet connection.');
    };
    img.src = 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=1280&h=720&fit=crop';
  };

  // Start detection loop
  const startDetection = useCallback(async () => {
    if (!isModelReady || !canvasRef.current) {
      return;
    }

    // For demo mode, we need the demo image
    if (videoSource === 'demo' && !demoImage) {
      setError('Demo image not loaded yet. Please wait.');
      return;
    }

    // For video modes, we need the video element
    if ((videoSource === 'webcam' || videoSource === 'file') && !videoRef.current) {
      return;
    }

    setIsDetecting(true);
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    if (!ctx) return;

    let lastFrameTime = performance.now();
    let frameCount = 0;

    const detect = async () => {
      if (!isDetecting) return;

      try {
        // Handle demo mode (static image)
        if (videoSource === 'demo' && demoImage) {
          canvas.width = demoImage.width;
          canvas.height = demoImage.height;

          // Run AI detection on the image
          const result = await detectionEngine.detectFromImage(demoImage);
          setCurrentResult(result);

          // Calculate FPS
          frameCount++;
          const currentTime = performance.now();
          if (currentTime - lastFrameTime >= 1000) {
            setFps(frameCount);
            frameCount = 0;
            lastFrameTime = currentTime;
          }

          // Draw image
          ctx.drawImage(demoImage, 0, 0, canvas.width, canvas.height);

          // Draw bounding boxes
          result.detections.forEach((detection, index) => {
            const [x, y, width, height] = detection.bbox;

            ctx.strokeStyle = '#00ff00';
            ctx.lineWidth = 3;
            ctx.strokeRect(x, y, width, height);

            const label = `Person ${(detection.score * 100).toFixed(0)}%`;
            ctx.font = 'bold 16px Arial';
            const textWidth = ctx.measureText(label).width;
            ctx.fillStyle = '#00ff00';
            ctx.fillRect(x, y - 25, textWidth + 10, 25);

            ctx.fillStyle = '#000000';
            ctx.fillText(label, x + 5, y - 7);
          });

          // For demo mode, run detection once then stop the loop
          setIsDetecting(false);
          return;
        }

        // Handle video modes (webcam or file)
        if (!videoRef.current) return;
        const video = videoRef.current;

        canvas.width = video.videoWidth || 640;
        canvas.height = video.videoHeight || 480;

        // Run AI detection
        const result = await detectionEngine.detectFromVideo(video);
        setCurrentResult(result);

        // Calculate FPS
        frameCount++;
        const currentTime = performance.now();
        if (currentTime - lastFrameTime >= 1000) {
          setFps(frameCount);
          frameCount = 0;
          lastFrameTime = currentTime;
        }

        // Draw video frame
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        // Draw bounding boxes for each detected person
        result.detections.forEach((detection, index) => {
          const [x, y, width, height] = detection.bbox;

          // Draw bounding box
          ctx.strokeStyle = '#00ff00';
          ctx.lineWidth = 3;
          ctx.strokeRect(x, y, width, height);

          // Draw label background
          const label = `Person ${(detection.score * 100).toFixed(0)}%`;
          ctx.font = 'bold 16px Arial';
          const textWidth = ctx.measureText(label).width;
          ctx.fillStyle = '#00ff00';
          ctx.fillRect(x, y - 25, textWidth + 10, 25);

          // Draw label text
          ctx.fillStyle = '#000000';
          ctx.fillText(label, x + 5, y - 7);
        });

        // Continue loop for video modes
        animationFrameRef.current = requestAnimationFrame(detect);
      } catch (err) {
        console.error('Detection error:', err);
        setError('Detection failed. Please try again.');
        setIsDetecting(false);
      }
    };

    detect();
  }, [isModelReady, isDetecting, videoSource, demoImage]);

  // Stop detection
  const stopDetection = () => {
    setIsDetecting(false);
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    setCurrentResult(null);
    setFps(0);
  };

  // Stop video and cleanup
  const stopVideo = () => {
    stopDetection();
    if (videoRef.current) {
      if (videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach(track => track.stop());
        videoRef.current.srcObject = null;
      }
      videoRef.current.src = '';
    }
    setVideoSource('none');
    setVideoFileName('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Get density level
  const getDensityLevel = (count: number): { level: string; color: string } => {
    if (count >= DENSITY_THRESHOLDS.high) {
      return { level: 'HIGH', color: 'text-red-500' };
    } else if (count >= DENSITY_THRESHOLDS.medium) {
      return { level: 'MEDIUM', color: 'text-yellow-500' };
    } else {
      return { level: 'LOW', color: 'text-green-500' };
    }
  };

  const densityInfo = currentResult ? getDensityLevel(currentResult.personCount) : null;

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2">AI Crowd Detection</h1>
          <p className="text-gray-400">
            Real-time person detection using TensorFlow.js COCO-SSD model
          </p>
        </div>

        {/* Model Status */}
        <div className="mb-6 p-4 bg-gray-800 rounded-lg border border-gray-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {isModelLoading && (
                <>
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
                  <span className="text-blue-400">Loading AI Model...</span>
                </>
              )}
              {isModelReady && !isModelLoading && (
                <>
                  <div className="h-6 w-6 rounded-full bg-green-500 flex items-center justify-center">
                    <span className="text-xs">✓</span>
                  </div>
                  <span className="text-green-400">AI Model Ready</span>
                </>
              )}
              {error && (
                <>
                  <AlertTriangle className="text-red-500" size={24} />
                  <span className="text-red-400">{error}</span>
                </>
              )}
            </div>
            {isDetecting && (
              <div className="flex items-center gap-2 text-green-400">
                <div className="h-3 w-3 rounded-full bg-green-500 animate-pulse"></div>
                <span className="font-semibold">AI DETECTION ACTIVE</span>
              </div>
            )}
          </div>
        </div>

        {/* Controls */}
        <div className="mb-6 grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Load Demo Button */}
          <button
            onClick={loadDemoImage}
            disabled={!isModelReady || isDetecting}
            className="p-4 bg-orange-600 hover:bg-orange-700 disabled:bg-gray-700 disabled:cursor-not-allowed rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            <ImageIcon size={20} />
            <span>Load Demo</span>
          </button>

          {/* Webcam Button */}
          <button
            onClick={startWebcam}
            disabled={!isModelReady || isDetecting}
            className="p-4 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:cursor-not-allowed rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            <Camera size={20} />
            <span>Use Webcam</span>
          </button>

          {/* Upload Video Button */}
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={!isModelReady || isDetecting}
            className="p-4 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-700 disabled:cursor-not-allowed rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            <Upload size={20} />
            <span>Upload Video</span>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="video/*"
            onChange={handleFileUpload}
            className="hidden"
          />

          {/* Start/Stop Detection */}
          <button
            onClick={isDetecting ? stopDetection : startDetection}
            disabled={!isModelReady || videoSource === 'none'}
            className={`p-4 rounded-lg transition-colors flex items-center justify-center gap-2 ${
              isDetecting
                ? 'bg-red-600 hover:bg-red-700'
                : 'bg-green-600 hover:bg-green-700'
            } disabled:bg-gray-700 disabled:cursor-not-allowed`}
          >
            {isDetecting ? <Pause size={20} /> : <Play size={20} />}
            <span>{isDetecting ? 'Stop Detection' : 'Start Detection'}</span>
          </button>
        </div>

        {/* Video Display */}
        <div className="mb-6 relative bg-black rounded-lg overflow-hidden border border-gray-700">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className={`w-full h-auto ${videoSource === 'demo' ? 'hidden' : ''}`}
            onPlay={() => {
              if (videoSource === 'file' && videoRef.current) {
                videoRef.current.loop = true;
              }
            }}
          />
          <canvas
            ref={canvasRef}
            className={`absolute top-0 left-0 w-full h-full ${videoSource === 'demo' ? 'relative' : ''}`}
          />

          {/* Video Source Indicator */}
          {videoSource !== 'none' && (
            <div className="absolute top-4 left-4 bg-black bg-opacity-70 px-3 py-1 rounded text-sm">
              {videoSource === 'webcam' ? '📹 LIVE WEBCAM' : 
               videoSource === 'demo' ? '🖼️ DEMO IMAGE' : 
               `🎬 ${videoFileName}`}
            </div>
          )}

          {/* Placeholder when no video */}
          {videoSource === 'none' && (
            <div className="w-full h-96 flex items-center justify-center text-gray-500">
              <div className="text-center">
                <Camera size={64} className="mx-auto mb-4 opacity-50" />
                <p className="text-lg">Select a video source to begin</p>
                <p className="text-sm mt-2">Load demo, use webcam, or upload a video file</p>
              </div>
            </div>
          )}
        </div>

        {/* Statistics */}
        {currentResult && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            {/* Person Count */}
            <div className="p-4 bg-gray-800 rounded-lg border border-gray-700">
              <div className="text-gray-400 text-sm mb-1">People Detected</div>
              <div className="text-3xl font-bold text-blue-400">
                {currentResult.personCount}
              </div>
              <div className="text-xs text-gray-500 mt-1">Current frame</div>
            </div>

            {/* Density Level */}
            <div className="p-4 bg-gray-800 rounded-lg border border-gray-700">
              <div className="text-gray-400 text-sm mb-1">Crowd Density</div>
              <div className={`text-3xl font-bold ${densityInfo?.color}`}>
                {densityInfo?.level}
              </div>
              <div className="text-xs text-gray-500 mt-1">
                {currentResult.personCount < DENSITY_THRESHOLDS.low
                  ? `< ${DENSITY_THRESHOLDS.low} people`
                  : currentResult.personCount < DENSITY_THRESHOLDS.medium
                  ? `${DENSITY_THRESHOLDS.low}-${DENSITY_THRESHOLDS.medium} people`
                  : `> ${DENSITY_THRESHOLDS.medium} people`}
              </div>
            </div>

            {/* Inference Time */}
            <div className="p-4 bg-gray-800 rounded-lg border border-gray-700">
              <div className="text-gray-400 text-sm mb-1">Inference Time</div>
              <div className="text-3xl font-bold text-purple-400">
                {currentResult.inferenceTime.toFixed(0)}
              </div>
              <div className="text-xs text-gray-500 mt-1">milliseconds</div>
            </div>

            {/* FPS */}
            <div className="p-4 bg-gray-800 rounded-lg border border-gray-700">
              <div className="text-gray-400 text-sm mb-1">Processing Speed</div>
              <div className="text-3xl font-bold text-green-400">{fps}</div>
              <div className="text-xs text-gray-500 mt-1">frames per second</div>
            </div>
          </div>
        )}

        {/* Detection Details */}
        {currentResult && currentResult.detections.length > 0 && (
          <div className="p-4 bg-gray-800 rounded-lg border border-gray-700">
            <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <Activity size={20} />
              Detection Details
            </h3>
            <div className="space-y-2">
              {currentResult.detections.slice(0, 10).map((detection, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-2 bg-gray-900 rounded"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-green-600 rounded flex items-center justify-center text-sm font-bold">
                      {index + 1}
                    </div>
                    <div>
                      <div className="font-semibold">Person {index + 1}</div>
                      <div className="text-xs text-gray-400">
                        Position: ({detection.bbox[0].toFixed(0)}, {detection.bbox[1].toFixed(0)})
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-green-400 font-bold">
                      {(detection.score * 100).toFixed(1)}%
                    </div>
                    <div className="text-xs text-gray-400">confidence</div>
                  </div>
                </div>
              ))}
              {currentResult.detections.length > 10 && (
                <div className="text-center text-gray-400 text-sm py-2">
                  ... and {currentResult.detections.length - 10} more detections
                </div>
              )}
            </div>
          </div>
        )}

        {/* Stop Video Button */}
        {videoSource !== 'none' && (
          <div className="mt-6">
            <button
              onClick={stopVideo}
              className="w-full p-3 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
            >
              Stop Video & Release Resources
            </button>
          </div>
        )}

        {/* Info Panel */}
        <div className="mt-6 p-4 bg-blue-900 bg-opacity-30 border border-blue-700 rounded-lg">
          <h3 className="text-lg font-semibold mb-2 text-blue-400">About This Detection</h3>
          <ul className="text-sm text-gray-300 space-y-1">
            <li>• Uses TensorFlow.js COCO-SSD model (pretrained on COCO dataset)</li>
            <li>• Detects people with real ML inference, not simulation</li>
            <li>• Bounding boxes show actual model predictions with confidence scores</li>
            <li>• Density thresholds: Low (&lt;5), Medium (5-15), High (&gt;15 people)</li>
            <li>• Person count reflects current frame detection only</li>
            <li>• All processing happens locally in your browser</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
