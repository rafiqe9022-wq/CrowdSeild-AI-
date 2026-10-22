import React, { useRef, useState, useEffect } from 'react';
import * as tf from '@tensorflow/tfjs';
import * as cocoSsd from '@tensorflow-models/coco-ssd';
import { Camera, Upload, Play, Pause, AlertTriangle, Activity, ImageIcon, Users, Loader } from 'lucide-react';

interface Detection {
  class: string;
  score: number;
  bbox: [number, number, number, number];
}

export default function AIDetection() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const modelRef = useRef<cocoSsd.ObjectDetection | null>(null);
  const animationFrameRef = useRef<number>();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isDetectingRef = useRef(false);

  const [isModelLoading, setIsModelLoading] = useState(true);
  const [isModelReady, setIsModelReady] = useState(false);
  const [isDetecting, setIsDetecting] = useState(false);
  const [videoSource, setVideoSource] = useState<'none' | 'webcam' | 'file' | 'demo'>('none');
  const [fps, setFps] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [videoFileName, setVideoFileName] = useState<string>('');
  const [demoImage, setDemoImage] = useState<HTMLImageElement | null>(null);

  // Real AI counting state
  const [currentDetections, setCurrentDetections] = useState<Detection[]>([]);
  const [currentCount, setCurrentCount] = useState(0);
  const [peakCount, setPeakCount] = useState(0);
  const [totalDetected, setTotalDetected] = useState(0);

  // Load AI model on component mount
  useEffect(() => {
    loadModel();
    return () => {
      isDetectingRef.current = false;
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  const loadModel = async () => {
    try {
      setIsModelLoading(true);
      setError(null);
      
      // Load COCO-SSD model
      const model = await cocoSsd.load({
        base: 'lite_mobilenet_v2',
      });
      
      modelRef.current = model;
      setIsModelReady(true);
      console.log('✅ AI Model loaded successfully');
    } catch (err) {
      console.error('❌ Failed to load AI model:', err);
      setError('Failed to load AI model. Please refresh the page.');
    } finally {
      setIsModelLoading(false);
    }
  };

  // Load demo image
  const loadDemoImage = () => {
    if (!isModelReady) return;
    setError(null);
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      setDemoImage(img);
      setVideoSource('demo');
      setVideoFileName('Demo Crowd Scene');
      resetCounters();
    };
    img.onerror = () => {
      setError('Failed to load demo image.');
    };
    img.src = 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=1280&h=720&fit=crop';
  };

  // Start webcam
  const startWebcam = async () => {
    if (!isModelReady) return;
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480 },
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setVideoSource('webcam');
        setVideoFileName('Live Webcam');
        resetCounters();
      }
    } catch (err) {
      setError('Failed to access webcam. Please check permissions.');
      console.error(err);
    }
  };

  // Handle video file upload
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!isModelReady) return;
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('video/')) {
      setError('Please upload a valid video file (MP4, WebM, etc.)');
      return;
    }

    if (file.size > 100 * 1024 * 1024) {
      setError('Video file is too large. Maximum size is 100MB.');
      return;
    }

    setError(null);
    const url = URL.createObjectURL(file);
    if (videoRef.current) {
      videoRef.current.src = url;
      videoRef.current.loop = true; // Loop video for continuous detection
      setVideoSource('file');
      setVideoFileName(file.name);
      resetCounters();
      
      // Add event listeners for video
      videoRef.current.onloadeddata = () => {
        console.log('✅ Video loaded and ready for detection');
      };
      
      videoRef.current.onplay = () => {
        console.log('▶️ Video started playing');
        // Auto-start detection when video plays
        if (isModelReady && !isDetecting) {
          startDetection();
        }
      };
      
      videoRef.current.onpause = () => {
        console.log('⏸️ Video paused');
        // Pause detection when video pauses
        if (isDetecting) {
          stopDetection();
        }
      };
    }
  };

  // Reset counters
  const resetCounters = () => {
    setCurrentDetections([]);
    setCurrentCount(0);
    setPeakCount(0);
    setTotalDetected(0);
  };

  // REAL AI DETECTION - Process video frame with TensorFlow.js
  const detectFrame = async () => {
    if (!isDetectingRef.current || !modelRef.current) return;

    const canvas = canvasRef.current;
    const video = videoRef.current;
    
    if (!canvas || !video) {
      // Retry after short delay
      setTimeout(() => {
        if (isDetectingRef.current) {
          animationFrameRef.current = requestAnimationFrame(detectFrame);
        }
      }, 100);
      return;
    }

    // Check if video is ready
    if (video.readyState < 2) {
      // Video not ready, retry
      setTimeout(() => {
        if (isDetectingRef.current) {
          animationFrameRef.current = requestAnimationFrame(detectFrame);
        }
      }, 100);
      return;
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    try {
      // Set canvas size to match video
      if (video.videoWidth > 0 && video.videoHeight > 0) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
      }

      // Draw current video frame
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      // Run REAL AI detection on the frame
      const startTime = performance.now();
      const predictions = await modelRef.current.detect(canvas);
      const inferenceTime = performance.now() - startTime;

      // Filter for person detections with confidence > 50%
      const personDetections: Detection[] = predictions
        .filter(pred => pred.class === 'person' && pred.score > 0.5)
        .map(pred => ({
          class: pred.class,
          score: pred.score,
          bbox: pred.bbox as [number, number, number, number]
        }));

      // Update counts based on REAL detections
      const personCount = personDetections.length;
      setCurrentDetections(personDetections);
      setCurrentCount(personCount);
      
      // Update peak count
      setPeakCount(prev => Math.max(prev, personCount));
      
      // Accumulate total detected
      setTotalDetected(prev => prev + personCount);

      // Draw bounding boxes with REAL detection data
      personDetections.forEach((detection, index) => {
        const [x, y, width, height] = detection.bbox;

        // Draw bounding box
        ctx.strokeStyle = '#00ff00';
        ctx.lineWidth = 3;
        ctx.strokeRect(x, y, width, height);

        // Draw label with person number and confidence
        const label = `Person #${index + 1} (${(detection.score * 100).toFixed(0)}%)`;
        ctx.font = 'bold 14px Arial';
        const textWidth = ctx.measureText(label).width;

        // Label background
        ctx.fillStyle = '#00ff00';
        ctx.fillRect(x, y - 22, textWidth + 12, 22);

        // Label text
        ctx.fillStyle = '#000000';
        ctx.fillText(label, x + 6, y - 6);
      });

      // Draw counting overlay at top
      ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
      ctx.fillRect(0, 0, canvas.width, 60);

      ctx.font = 'bold 20px Arial';
      ctx.fillStyle = '#00ff00';
      ctx.fillText(`👥 CURRENT: ${personCount}`, 20, 38);

      ctx.fillStyle = '#ffff00';
      ctx.fillText(`📊 PEAK: ${Math.max(peakCount, personCount)}`, 250, 38);

      ctx.fillStyle = '#00ffff';
      ctx.fillText(`🔍 AI DETECTING`, 450, 38);

      // Calculate FPS
      if (inferenceTime > 0) {
        setFps(Math.round(1000 / inferenceTime));
      }

      // Continue detection loop - use requestAnimationFrame for smooth processing
      if (isDetectingRef.current && !video.paused && !video.ended) {
        animationFrameRef.current = requestAnimationFrame(detectFrame);
      }
    } catch (err) {
      console.error('Detection error:', err);
      setError('Detection failed. Please try again.');
      isDetectingRef.current = false;
      setIsDetecting(false);
    }
  };

  // Detect on demo image (single frame)
  const detectDemoImage = async () => {
    if (!modelRef.current || !demoImage || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    try {
      canvas.width = demoImage.width;
      canvas.height = demoImage.height;

      // Draw image
      ctx.drawImage(demoImage, 0, 0, canvas.width, canvas.height);

      // Run REAL AI detection
      const predictions = await modelRef.current.detect(canvas);
      
      const personDetections: Detection[] = predictions
        .filter(pred => pred.class === 'person' && pred.score > 0.5)
        .map(pred => ({
          class: pred.class,
          score: pred.score,
          bbox: pred.bbox as [number, number, number, number]
        }));

      setCurrentDetections(personDetections);
      setCurrentCount(personDetections.length);
      setPeakCount(personDetections.length);
      setTotalDetected(personDetections.length);

      // Draw bounding boxes
      personDetections.forEach((detection, index) => {
        const [x, y, width, height] = detection.bbox;

        ctx.strokeStyle = '#00ff00';
        ctx.lineWidth = 3;
        ctx.strokeRect(x, y, width, height);

        const label = `Person #${index + 1} (${(detection.score * 100).toFixed(0)}%)`;
        ctx.font = 'bold 14px Arial';
        const textWidth = ctx.measureText(label).width;

        ctx.fillStyle = '#00ff00';
        ctx.fillRect(x, y - 22, textWidth + 12, 22);

        ctx.fillStyle = '#000000';
        ctx.fillText(label, x + 6, y - 6);
      });

      setIsDetecting(false);
    } catch (err) {
      console.error('Detection error:', err);
      setError('Detection failed on demo image.');
      setIsDetecting(false);
    }
  };

  // Start detection
  const startDetection = () => {
    if (!isModelReady) {
      setError('AI model is still loading. Please wait.');
      return;
    }

    if (videoSource === 'none') {
      setError('Please load a video source first.');
      return;
    }

    if (videoSource === 'demo' && !demoImage) {
      setError('Demo image not loaded yet.');
      return;
    }

    if ((videoSource === 'webcam' || videoSource === 'file') && !videoRef.current) {
      setError('Video not ready. Please wait.');
      return;
    }

    setError(null);
    isDetectingRef.current = true;
    setIsDetecting(true);

    if (videoSource === 'demo') {
      detectDemoImage();
    } else {
      detectFrame();
    }
  };

  // Stop detection
  const stopDetection = () => {
    isDetectingRef.current = false;
    setIsDetecting(false);
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
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
    setDemoImage(null);
    setCurrentDetections([]);
    setCurrentCount(0);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    resetCounters();
  };

  // Get density level
  const getDensityLevel = (count: number): { level: string; color: string } => {
    if (count >= 30) return { level: 'HIGH', color: 'text-red-500' };
    if (count >= 15) return { level: 'MEDIUM', color: 'text-yellow-500' };
    return { level: 'LOW', color: 'text-green-500' };
  };

  const densityInfo = getDensityLevel(currentCount);

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2">AI Crowd Detection & Counting</h1>
          <p className="text-gray-400">
            Real TensorFlow.js COCO-SSD AI detection with automatic person counting
          </p>
        </div>

        {/* Model Status */}
        <div className="mb-6 p-4 bg-gray-800 rounded-lg border border-gray-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {isModelLoading && (
                <>
                  <Loader className="animate-spin text-blue-400" size={24} />
                  <span className="text-blue-400">Loading AI Model...</span>
                </>
              )}
              {isModelReady && !isModelLoading && (
                <>
                  <div className="h-6 w-6 rounded-full bg-green-500 flex items-center justify-center">
                    <span className="text-xs">✓</span>
                  </div>
                  <span className="text-green-400">TensorFlow.js COCO-SSD Model Ready</span>
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
          <button
            onClick={loadDemoImage}
            disabled={!isModelReady || isDetecting}
            className="p-4 bg-orange-600 hover:bg-orange-700 disabled:bg-gray-700 disabled:cursor-not-allowed rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            <ImageIcon size={20} />
            <span>Load Demo</span>
          </button>

          <button
            onClick={startWebcam}
            disabled={!isModelReady || isDetecting}
            className="p-4 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:cursor-not-allowed rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            <Camera size={20} />
            <span>Use Webcam</span>
          </button>

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
            className={`${videoSource === 'demo' ? 'w-full h-auto' : 'absolute top-0 left-0 w-full h-full'}`}
          />

          {/* Video Source Indicator */}
          {videoSource !== 'none' && (
            <div className="absolute top-4 left-4 bg-black bg-opacity-70 px-3 py-1 rounded text-sm z-10">
              {videoSource === 'webcam' ? '📹 LIVE WEBCAM' : 
               videoSource === 'demo' ? '🖼️ DEMO IMAGE' : 
               `🎬 ${videoFileName}`}
            </div>
          )}

          {/* Placeholder */}
          {videoSource === 'none' && (
            <div className="w-full h-96 flex items-center justify-center text-gray-500">
              <div className="text-center">
                <Camera size={64} className="mx-auto mb-4 opacity-50" />
                <p className="text-lg">Select a video source to begin</p>
                <p className="text-sm mt-2">Upload a video, use webcam, or load demo</p>
                <p className="text-xs mt-2 text-yellow-500">💡 AI will detect and count people automatically!</p>
              </div>
            </div>
          )}
        </div>

        {/* LIVE AI COUNTING DASHBOARD */}
        {videoSource !== 'none' && (
          <div className="mb-6 p-4 bg-gradient-to-r from-gray-800 to-gray-900 rounded-lg border-2 border-cyan-500">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2 text-cyan-400">
              <Users size={24} />
              REAL AI PERSON COUNTING
              {isDetecting && (
                <span className="ml-2 px-2 py-1 bg-green-600 rounded text-xs animate-pulse">
                  ● LIVE
                </span>
              )}
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="p-4 bg-gray-900 rounded-lg border-2 border-green-500">
                <div className="text-gray-400 text-sm mb-1">Current Frame</div>
                <div className="text-4xl font-bold text-green-400">
                  {currentCount}
                </div>
                <div className="text-xs text-gray-500 mt-1">people detected now</div>
              </div>

              <div className="p-4 bg-gray-900 rounded-lg border-2 border-yellow-500">
                <div className="text-gray-400 text-sm mb-1">Peak Count</div>
                <div className="text-4xl font-bold text-yellow-400">
                  {peakCount}
                </div>
                <div className="text-xs text-gray-500 mt-1">maximum seen</div>
              </div>

              <div className="p-4 bg-gray-900 rounded-lg border-2 border-blue-500">
                <div className="text-gray-400 text-sm mb-1">Total Detected</div>
                <div className="text-4xl font-bold text-blue-400">
                  {totalDetected}
                </div>
                <div className="text-xs text-gray-500 mt-1">cumulative count</div>
              </div>

              <div className="p-4 bg-gray-900 rounded-lg border-2 border-purple-500">
                <div className="text-gray-400 text-sm mb-1">Crowd Density</div>
                <div className={`text-4xl font-bold ${densityInfo.color}`}>
                  {densityInfo.level}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  {currentCount < 5 ? 'Safe' : currentCount < 15 ? 'Moderate' : 'Alert!'}
                </div>
              </div>
            </div>

            <div className="mt-4 flex gap-2">
              <button
                onClick={resetCounters}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors text-sm"
              >
                🔄 Reset Counters
              </button>
            </div>
          </div>
        )}

        {/* Detection Statistics */}
        {currentDetections.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="p-4 bg-gray-800 rounded-lg border border-gray-700">
              <div className="text-gray-400 text-sm mb-1">People Detected</div>
              <div className="text-3xl font-bold text-blue-400">
                {currentCount}
              </div>
              <div className="text-xs text-gray-500 mt-1">current frame</div>
            </div>

            <div className="p-4 bg-gray-800 rounded-lg border border-gray-700">
              <div className="text-gray-400 text-sm mb-1">Processing Speed</div>
              <div className="text-3xl font-bold text-green-400">{fps}</div>
              <div className="text-xs text-gray-500 mt-1">FPS</div>
            </div>

            <div className="p-4 bg-gray-800 rounded-lg border border-gray-700">
              <div className="text-gray-400 text-sm mb-1">Avg Confidence</div>
              <div className="text-3xl font-bold text-purple-400">
                {currentDetections.length > 0 
                  ? `${(currentDetections.reduce((sum, d) => sum + d.score, 0) / currentDetections.length * 100).toFixed(0)}%`
                  : '---'}
              </div>
              <div className="text-xs text-gray-500 mt-1">detection accuracy</div>
            </div>
          </div>
        )}

        {/* Detection Details */}
        {currentDetections.length > 0 && (
          <div className="p-4 bg-gray-800 rounded-lg border border-gray-700">
            <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <Activity size={20} />
              AI Detection Details ({currentDetections.length} people)
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {currentDetections.slice(0, 8).map((detection, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-2 bg-gray-900 rounded"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-green-600 rounded flex items-center justify-center text-sm font-bold">
                      #{index + 1}
                    </div>
                    <div>
                      <div className="font-semibold text-sm">Person {index + 1}</div>
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
          <h3 className="text-lg font-semibold mb-2 text-blue-400">About This AI Detection</h3>
          <ul className="text-sm text-gray-300 space-y-1">
            <li>• <strong>Real TensorFlow.js COCO-SSD model</strong> - not simulation</li>
            <li>• <strong>Automatic person detection</strong> - AI analyzes every video frame</li>
            <li>• <strong>Real-time counting</strong> - counts people as they appear</li>
            <li>• <strong>Confidence scores</strong> - shows detection accuracy (50%+ threshold)</li>
            <li>• <strong>Works with all sources</strong> - uploaded videos, webcam, demo images</li>
            <li>• <strong>Live dashboard</strong> - current count, peak count, total detected</li>
            <li>• <strong>Crowd density classification</strong> - Low/Medium/High alerts</li>
          </ul>
          <div className="mt-3 p-3 bg-green-900 bg-opacity-30 border border-green-700 rounded">
            <p className="text-xs text-green-300">
              <strong>💡 How it works:</strong> Upload any video → Click "Start Detection" → 
              TensorFlow.js COCO-SSD model analyzes each frame in real-time → 
              Detects people with bounding boxes → Automatically counts them → 
              Updates the live dashboard with real AI detection results!
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
