import React, { useRef, useState, useEffect } from 'react';
import { Camera, Upload, Play, Pause, AlertTriangle, Activity, ImageIcon, Users, Loader } from 'lucide-react';
import { detectionEngine, DetectionResult } from '../utils/detectionEngine';

export default function AIDetection() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number>();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isDetectingRef = useRef(false);

  const [isModelLoading, setIsModelLoading] = useState(true);
  const [isModelReady, setIsModelReady] = useState(false);
  const [isDetecting, setIsDetecting] = useState(false);
  const [videoSource, setVideoSource] = useState<'none' | 'webcam' | 'file' | 'demo' | 'youtube'>('none');
  const [currentResult, setCurrentResult] = useState<DetectionResult | null>(null);
  const [fps, setFps] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [videoFileName, setVideoFileName] = useState<string>('');
  const [demoImage, setDemoImage] = useState<HTMLImageElement | null>(null);

  // Person counting state
  const [totalPeopleSeen, setTotalPeopleSeen] = useState(0);
  const [peakCount, setPeakCount] = useState(0);
  const [currentFrameCount, setCurrentFrameCount] = useState(0);

  // Density thresholds
  const DENSITY_THRESHOLDS = {
    low: 5,
    medium: 15,
    high: 30,
  };

  // Load AI model on component mount
  useEffect(() => {
    const loadModel = async () => {
      try {
        setIsModelLoading(true);
        await detectionEngine.initialize();
        setIsModelReady(true);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load AI model');
        setIsModelReady(false);
      } finally {
        setIsModelLoading(false);
      }
    };

    loadModel();

    return () => {
      isDetectingRef.current = false;
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  // Load demo image
  const loadDemoImage = () => {
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

  // Load YouTube video
  const loadYouTubeVideo = () => {
    setError(null);
    setVideoSource('youtube');
    setVideoFileName('YouTube Demo Video');
    resetCounters();
  };

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
        resetCounters();
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
      setVideoSource('file');
      setVideoFileName(file.name);
      resetCounters();
    }
  };

  // Reset counters
  const resetCounters = () => {
    setTotalPeopleSeen(0);
    setPeakCount(0);
    setCurrentFrameCount(0);
  };

  // Draw bounding boxes with person numbers
  const drawDetections = (ctx: CanvasRenderingContext2D, result: DetectionResult) => {
    result.detections.forEach((detection, index) => {
      const [x, y, width, height] = detection.bbox;

      // Draw bounding box
      ctx.strokeStyle = '#00ff00';
      ctx.lineWidth = 3;
      ctx.strokeRect(x, y, width, height);

      // Draw label with person number
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
  };

  // Draw counting overlay on video
  const drawCountingOverlay = (ctx: CanvasRenderingContext2D, width: number, currentCount: number, peakCount: number) => {
    // Semi-transparent bar at top
    ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.fillRect(0, 0, width, 50);

    // Draw counting info
    ctx.font = 'bold 18px Arial';
    ctx.fillStyle = '#00ff00';
    ctx.fillText(`👥 CURRENT: ${currentCount}`, 15, 32);

    ctx.fillStyle = '#ffff00';
    ctx.fillText(`📊 PEAK: ${peakCount}`, 200, 32);

    ctx.fillStyle = '#00ffff';
    ctx.fillText(`🔍 AI DETECTION ACTIVE`, 350, 32);
  };

  // Start detection loop - REAL AI DETECTION
  const startDetection = async () => {
    if (!isModelReady) {
      setError('AI model is still loading. Please wait.');
      return;
    }

    if (!canvasRef.current) return;

    if (videoSource === 'demo' && !demoImage) {
      setError('Demo image not loaded yet.');
      return;
    }

    if ((videoSource === 'webcam' || videoSource === 'file') && !videoRef.current) {
      setError('Video not ready. Please wait.');
      return;
    }

    if (videoSource === 'youtube') {
      setError('YouTube videos cannot be processed due to browser security restrictions. Please upload a video file instead.');
      return;
    }

    isDetectingRef.current = true;
    setIsDetecting(true);
    setError(null);

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let lastFrameTime = performance.now();
    let frameCount = 0;
    let maxPeopleInFrame = 0;

    const detect = async () => {
      if (!isDetectingRef.current) return;

      try {
        // Handle demo mode (static image) - detect once
        if (videoSource === 'demo' && demoImage) {
          canvas.width = demoImage.width;
          canvas.height = demoImage.height;

          const result = await detectionEngine.detectFromImage(demoImage);
          setCurrentResult(result);
          setCurrentFrameCount(result.personCount);
          setTotalPeopleSeen(result.personCount);
          setPeakCount(result.personCount);

          // Draw image
          ctx.drawImage(demoImage, 0, 0, canvas.width, canvas.height);

          // Draw bounding boxes with numbers
          drawDetections(ctx, result);

          isDetectingRef.current = false;
          setIsDetecting(false);
          return;
        }

        // Handle video modes (webcam, file)
        if (!videoRef.current) return;
        const video = videoRef.current;

        // Skip if video not ready
        if (video.readyState < 2) {
          animationFrameRef.current = requestAnimationFrame(detect);
          return;
        }

        canvas.width = video.videoWidth || 640;
        canvas.height = video.videoHeight || 480;

        // Run REAL AI detection
        const result = await detectionEngine.detectFromVideo(video);
        setCurrentResult(result);
        setCurrentFrameCount(result.personCount);

        // Track peak count
        if (result.personCount > maxPeopleInFrame) {
          maxPeopleInFrame = result.personCount;
          setPeakCount(maxPeopleInFrame);
        }

        // Accumulate total unique people seen
        setTotalPeopleSeen(prev => prev + result.personCount);

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

        // Draw bounding boxes with person numbers
        drawDetections(ctx, result);

        // Draw counting overlay at top
        drawCountingOverlay(ctx, canvas.width, result.personCount, maxPeopleInFrame);

        // Continue loop
        animationFrameRef.current = requestAnimationFrame(detect);
      } catch (err) {
        console.error('Detection error:', err);
        setError('Detection failed. Please try again.');
        isDetectingRef.current = false;
        setIsDetecting(false);
      }
    };

    detect();
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
    setCurrentResult(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    resetCounters();
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
          <h1 className="text-3xl font-bold mb-2">AI Crowd Detection & Counting</h1>
          <p className="text-gray-400">
            Real-time person detection with TensorFlow.js COCO-SSD model
          </p>
        </div>

        {/* Status */}
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
                  <span className="text-green-400">AI Model Ready (TensorFlow.js COCO-SSD)</span>
                </>
              )}
              {error && (
                <>
                  <AlertTriangle className="text-red-500 ml-4" size={24} />
                  <span className="text-red-400">{error}</span>
                </>
              )}
            </div>
            {isDetecting && (
              <div className="flex items-center gap-2 text-green-400">
                <div className="h-3 w-3 rounded-full bg-green-500 animate-pulse"></div>
                <span className="font-semibold">AI DETECTION & COUNTING ACTIVE</span>
              </div>
            )}
          </div>
        </div>

        {/* Video Source Controls */}
        <div className="mb-6 grid grid-cols-1 md:grid-cols-5 gap-4">
          <button
            onClick={loadDemoImage}
            disabled={isDetecting || !isModelReady}
            className="p-4 bg-orange-600 hover:bg-orange-700 disabled:bg-gray-700 disabled:cursor-not-allowed rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            <ImageIcon size={20} />
            <span>Load Demo</span>
          </button>

          <button
            onClick={loadYouTubeVideo}
            disabled={isDetecting || !isModelReady}
            className="p-4 bg-red-600 hover:bg-red-700 disabled:bg-gray-700 disabled:cursor-not-allowed rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
            </svg>
            <span>YouTube Demo</span>
          </button>

          <button
            onClick={startWebcam}
            disabled={isDetecting || !isModelReady}
            className="p-4 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:cursor-not-allowed rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            <Camera size={20} />
            <span>Use Webcam</span>
          </button>

          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isDetecting || !isModelReady}
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
            disabled={videoSource === 'none' || !isModelReady}
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
          {/* YouTube Video */}
          {videoSource === 'youtube' && (
            <div className="relative w-full" style={{ paddingBottom: '56.25%' }}>
              <iframe
                className="absolute top-0 left-0 w-full h-full"
                src="https://www.youtube.com/embed/lPDU-xx8S_8?autoplay=0&rel=0"
                title="YouTube Demo Video"
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          )}

          {/* Regular Video Element */}
          {videoSource !== 'youtube' && (
            <>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className={`w-full h-auto ${videoSource === 'demo' ? 'hidden' : ''}`}
                onPlay={() => {
                  if ((videoSource === 'file') && videoRef.current) {
                    videoRef.current.loop = true;
                  }
                }}
              />
              <canvas
                ref={canvasRef}
                className={`${videoSource === 'demo' ? 'w-full h-auto' : 'absolute top-0 left-0 w-full h-full'}`}
              />
            </>
          )}

          {/* Video Source Indicator */}
          {videoSource !== 'none' && (
            <div className="absolute top-4 left-4 bg-black bg-opacity-70 px-3 py-1 rounded text-sm z-10">
              {videoSource === 'webcam' ? '📹 LIVE WEBCAM' :
               videoSource === 'demo' ? '🖼️ DEMO IMAGE' :
               videoSource === 'youtube' ? '📺 YOUTUBE VIDEO' :
               `🎬 ${videoFileName}`}
            </div>
          )}

          {/* Placeholder */}
          {videoSource === 'none' && (
            <div className="w-full h-96 flex items-center justify-center text-gray-500">
              <div className="text-center">
                <Camera size={64} className="mx-auto mb-4 opacity-50" />
                <p className="text-lg">Select a video source to begin</p>
                <p className="text-sm mt-2">Upload a video, use webcam, load demo, or watch YouTube</p>
                <p className="text-xs mt-2 text-yellow-500">💡 Upload any crowd video to see REAL AI counting in action!</p>
              </div>
            </div>
          )}
        </div>

        {/* LIVE COUNTING DASHBOARD */}
        {videoSource !== 'none' && videoSource !== 'youtube' && (
          <div className="mb-6 p-4 bg-gradient-to-r from-gray-800 to-gray-900 rounded-lg border-2 border-cyan-500">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2 text-cyan-400">
              <Users size={24} />
              LIVE PERSON COUNTING
              {isDetecting && (
                <span className="ml-2 px-2 py-1 bg-green-600 rounded text-xs animate-pulse">
                  ● COUNTING
                </span>
              )}
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* Current Frame Count */}
              <div className="p-4 bg-gray-900 rounded-lg border-2 border-green-500">
                <div className="text-gray-400 text-sm mb-1">Current Frame</div>
                <div className="text-4xl font-bold text-green-400">
                  {currentFrameCount}
                </div>
                <div className="text-xs text-gray-500 mt-1">people detected now</div>
              </div>

              {/* Peak Count */}
              <div className="p-4 bg-gray-900 rounded-lg border-2 border-yellow-500">
                <div className="text-gray-400 text-sm mb-1">Peak Count</div>
                <div className="text-4xl font-bold text-yellow-400">
                  {peakCount}
                </div>
                <div className="text-xs text-gray-500 mt-1">maximum seen</div>
              </div>

              {/* Total People Seen */}
              <div className="p-4 bg-gray-900 rounded-lg border-2 border-blue-500">
                <div className="text-gray-400 text-sm mb-1">Total Seen</div>
                <div className="text-4xl font-bold text-blue-400">
                  {totalPeopleSeen}
                </div>
                <div className="text-xs text-gray-500 mt-1">cumulative count</div>
              </div>

              {/* Density Level */}
              <div className="p-4 bg-gray-900 rounded-lg border-2 border-purple-500">
                <div className="text-gray-400 text-sm mb-1">Crowd Density</div>
                <div className={`text-4xl font-bold ${densityInfo?.color || 'text-gray-400'}`}>
                  {densityInfo?.level || '---'}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  {currentFrameCount < DENSITY_THRESHOLDS.low ? 'Safe' :
                   currentFrameCount < DENSITY_THRESHOLDS.medium ? 'Moderate' : 'Alert!'}
                </div>
              </div>
            </div>

            {/* Reset Button */}
            <div className="mt-4">
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
        {currentResult && videoSource !== 'youtube' && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="p-4 bg-gray-800 rounded-lg border border-gray-700">
              <div className="text-gray-400 text-sm mb-1">People in Frame</div>
              <div className="text-3xl font-bold text-blue-400">
                {currentResult.personCount}
              </div>
              <div className="text-xs text-gray-500 mt-1">current detection</div>
            </div>

            <div className="p-4 bg-gray-800 rounded-lg border border-gray-700">
              <div className="text-gray-400 text-sm mb-1">Crowd Density</div>
              <div className={`text-3xl font-bold ${densityInfo?.color}`}>
                {densityInfo?.level}
              </div>
              <div className="text-xs text-gray-500 mt-1">
                {currentResult.personCount < DENSITY_THRESHOLDS.low
                  ? `< ${DENSITY_THRESHOLDS.low} people`
                  : currentResult.personCount < DENSITY_THRESHOLDS.medium
                  ? `${DENSITY_THRESHOLDS.low}-${DENSITY_THRESHOLDS.medium}`
                  : `> ${DENSITY_THRESHOLDS.medium}`}
              </div>
            </div>

            <div className="p-4 bg-gray-800 rounded-lg border border-gray-700">
              <div className="text-gray-400 text-sm mb-1">Inference Time</div>
              <div className="text-3xl font-bold text-purple-400">
                {currentResult.inferenceTime.toFixed(0)}
              </div>
              <div className="text-xs text-gray-500 mt-1">milliseconds</div>
            </div>

            <div className="p-4 bg-gray-800 rounded-lg border border-gray-700">
              <div className="text-gray-400 text-sm mb-1">Processing Speed</div>
              <div className="text-3xl font-bold text-green-400">{fps}</div>
              <div className="text-xs text-gray-500 mt-1">frames per second</div>
            </div>
          </div>
        )}

        {/* Detection Details */}
        {currentResult && currentResult.detections.length > 0 && videoSource !== 'youtube' && (
          <div className="p-4 bg-gray-800 rounded-lg border border-gray-700">
            <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <Activity size={20} />
              Detection Details ({currentResult.detections.length} people)
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {currentResult.detections.slice(0, 8).map((detection, index) => (
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
          <h3 className="text-lg font-semibold mb-2 text-blue-400">About This Detection</h3>
          <ul className="text-sm text-gray-300 space-y-1">
            <li>• <strong>Real AI Detection</strong> using TensorFlow.js COCO-SSD model</li>
            <li>• <strong>Automatic counting</strong> - AI detects and counts people in real-time</li>
            <li>• <strong>Live dashboard</strong> - shows current count, peak count, and total seen</li>
            <li>• Works with uploaded videos, webcam, and demo images</li>
            <li>• All processing happens locally in your browser</li>
            <li>• No manual counting needed - AI does it automatically!</li>
          </ul>
          <div className="mt-3 p-3 bg-green-900 bg-opacity-30 border border-green-700 rounded">
            <p className="text-xs text-green-300">
              <strong>💡 How it works:</strong> Upload any crowd video → Click "Start Detection" → 
              The AI model analyzes each frame and automatically detects people with bounding boxes and confidence scores.
              The counting dashboard updates in real-time showing how many people are detected!
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
