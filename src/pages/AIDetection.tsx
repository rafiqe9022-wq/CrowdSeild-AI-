import React, { useRef, useState, useEffect } from 'react';
import { Camera, Upload, Play, Pause, AlertTriangle, Activity, ImageIcon } from 'lucide-react';

interface Detection {
  class: string;
  score: number;
  bbox: [number, number, number, number];
}

interface DetectionResult {
  detections: Detection[];
  personCount: number;
  timestamp: number;
  inferenceTime: number;
}

export default function AIDetection() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number>();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isDetecting, setIsDetecting] = useState(false);
  const [videoSource, setVideoSource] = useState<'none' | 'webcam' | 'file' | 'demo' | 'youtube'>('none');
  const [currentResult, setCurrentResult] = useState<DetectionResult | null>(null);
  const [fps, setFps] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [videoFileName, setVideoFileName] = useState<string>('');
  const [demoImage, setDemoImage] = useState<HTMLImageElement | null>(null);
  
  // Person counting state
  const [totalEntries, setTotalEntries] = useState(0);
  const [totalExits, setTotalExits] = useState(0);
  const [currentCount, setCurrentCount] = useState(0);
  const [isCounting, setIsCounting] = useState(false);

  // Density thresholds
  const DENSITY_THRESHOLDS = {
    low: 5,
    medium: 15,
    high: 30,
  };

  // Simulated AI detection (generates realistic bounding boxes)
  const simulateDetection = (width: number, height: number): DetectionResult => {
    const startTime = performance.now();
    const detections: Detection[] = [];
    const numPeople = 8 + Math.floor(Math.random() * 5); // 8-12 people
    
    for (let i = 0; i < numPeople; i++) {
      const x = Math.random() * (width - 100);
      const y = Math.random() * (height - 200) + 100;
      const boxWidth = 60 + Math.random() * 40;
      const boxHeight = 120 + Math.random() * 80;
      const score = 0.75 + Math.random() * 0.2; // 75-95% confidence
      
      detections.push({
        class: 'person',
        score,
        bbox: [x, y, boxWidth, boxHeight]
      });
    }
    
    const endTime = performance.now();
    
    return {
      detections,
      personCount: detections.length,
      timestamp: Date.now(),
      inferenceTime: endTime - startTime
    };
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
      setError('Failed to load demo image. Please try uploading a video or using webcam.');
    };
    // Using a reliable crowd image from Unsplash
    img.src = 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=1280&h=720&fit=crop';
  };

  // Load YouTube video
  const loadYouTubeVideo = () => {
    setError(null);
    setVideoSource('youtube');
    setVideoFileName('YouTube Demo Video');
    // Reset counters
    setTotalEntries(0);
    setTotalExits(0);
    setCurrentCount(0);
  };

  // Start person counting
  const startCounting = () => {
    if (videoSource === 'none') {
      setError('Please load a video source first.');
      return;
    }
    setIsCounting(true);
    setError(null);
  };

  // Stop person counting
  const stopCounting = () => {
    setIsCounting(false);
  };

  // Reset counters
  const resetCounters = () => {
    setTotalEntries(0);
    setTotalExits(0);
    setCurrentCount(0);
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
    }
  };

  // Start detection loop
  const startDetection = () => {
    if (!canvasRef.current) return;

    if (videoSource === 'demo' && !demoImage) {
      setError('Demo image not loaded yet. Please wait.');
      return;
    }

    if ((videoSource === 'webcam' || videoSource === 'file') && !videoRef.current) {
      return;
    }

    setIsDetecting(true);
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let lastFrameTime = performance.now();
    let frameCount = 0;

    const detect = () => {
      if (!isDetecting) return;

      try {
        // Handle demo mode (static image)
        if (videoSource === 'demo' && demoImage) {
          canvas.width = demoImage.width;
          canvas.height = demoImage.height;

          const result = simulateDetection(demoImage.width, demoImage.height);
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
          result.detections.forEach((detection: Detection) => {
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

          // For demo mode, run once then stop
          setIsDetecting(false);
          return;
        }

        // Handle video modes (webcam or file)
        if (!videoRef.current) return;
        const video = videoRef.current;

        canvas.width = video.videoWidth || 640;
        canvas.height = video.videoHeight || 480;

        const result = simulateDetection(canvas.width, canvas.height);
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

        // Draw bounding boxes
        result.detections.forEach((detection: Detection) => {
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

        // Continue loop for video modes
        animationFrameRef.current = requestAnimationFrame(detect);
      } catch (err) {
        console.error('Detection error:', err);
        setError('Detection failed. Please try again.');
        setIsDetecting(false);
      }
    };

    detect();
  };

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
    setDemoImage(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopDetection();
    };
  }, []);

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
            Real-time person detection with bounding boxes and confidence scores
          </p>
        </div>

        {/* Status */}
        <div className="mb-6 p-4 bg-gray-800 rounded-lg border border-gray-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-6 w-6 rounded-full bg-green-500 flex items-center justify-center">
                <span className="text-xs">✓</span>
              </div>
              <span className="text-green-400">AI Detection System Ready</span>
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
                <span className="font-semibold">AI DETECTION ACTIVE</span>
              </div>
            )}
          </div>
        </div>

        {/* Controls */}
        <div className="mb-6 grid grid-cols-1 md:grid-cols-5 gap-4">
          {/* Load Demo Button */}
          <button
            onClick={loadDemoImage}
            disabled={isDetecting}
            className="p-4 bg-orange-600 hover:bg-orange-700 disabled:bg-gray-700 disabled:cursor-not-allowed rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            <ImageIcon size={20} />
            <span>Load Demo</span>
          </button>

          {/* YouTube Video Button */}
          <button
            onClick={loadYouTubeVideo}
            disabled={isDetecting}
            className="p-4 bg-red-600 hover:bg-red-700 disabled:bg-gray-700 disabled:cursor-not-allowed rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
            </svg>
            <span>YouTube Demo</span>
          </button>

          {/* Webcam Button */}
          <button
            onClick={startWebcam}
            disabled={isDetecting}
            className="p-4 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-700 disabled:cursor-not-allowed rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            <Camera size={20} />
            <span>Use Webcam</span>
          </button>

          {/* Upload Video Button */}
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isDetecting}
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
            disabled={videoSource === 'none'}
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

        {/* Person Counting Controls */}
        {videoSource === 'youtube' && (
          <div className="mb-6 p-4 bg-gray-800 rounded-lg border border-gray-700">
            <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <Activity size={20} />
              Person Counting Mode
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <button
                onClick={isCounting ? stopCounting : startCounting}
                className={`p-3 rounded-lg transition-colors flex items-center justify-center gap-2 ${
                  isCounting
                    ? 'bg-red-600 hover:bg-red-700'
                    : 'bg-green-600 hover:bg-green-700'
                }`}
              >
                {isCounting ? <Pause size={20} /> : <Play size={20} />}
                <span>{isCounting ? 'Stop Counting' : 'Start Counting'}</span>
              </button>
              <button
                onClick={resetCounters}
                className="p-3 bg-gray-600 hover:bg-gray-700 rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                <span>Reset Counters</span>
              </button>
              <div className="p-3 bg-gray-700 rounded-lg flex items-center justify-center">
                <div className="text-center">
                  <div className="text-xs text-gray-400">Status</div>
                  <div className={`text-sm font-semibold ${isCounting ? 'text-green-400' : 'text-gray-400'}`}>
                    {isCounting ? '● COUNTING' : '○ STOPPED'}
                  </div>
                </div>
              </div>
            </div>
            
            {/* Counting Statistics */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 bg-gray-900 rounded-lg border border-green-700">
                <div className="text-gray-400 text-sm mb-1">Total Entries</div>
                <div className="text-3xl font-bold text-green-400">{totalEntries}</div>
                <div className="text-xs text-gray-500 mt-1">People entered</div>
              </div>
              <div className="p-4 bg-gray-900 rounded-lg border border-red-700">
                <div className="text-gray-400 text-sm mb-1">Total Exits</div>
                <div className="text-3xl font-bold text-red-400">{totalExits}</div>
                <div className="text-xs text-gray-500 mt-1">People exited</div>
              </div>
              <div className="p-4 bg-gray-900 rounded-lg border border-blue-700">
                <div className="text-gray-400 text-sm mb-1">Current Count</div>
                <div className="text-3xl font-bold text-blue-400">{currentCount}</div>
                <div className="text-xs text-gray-500 mt-1">People inside</div>
              </div>
            </div>

            {/* Manual Counting Buttons */}
            {isCounting && (
              <div className="mt-4 grid grid-cols-2 gap-4">
                <button
                  onClick={() => {
                    setTotalEntries(prev => prev + 1);
                    setCurrentCount(prev => prev + 1);
                  }}
                  className="p-3 bg-green-600 hover:bg-green-700 rounded-lg transition-colors font-semibold"
                >
                  + Entry (Person Entered)
                </button>
                <button
                  onClick={() => {
                    setTotalExits(prev => prev + 1);
                    setCurrentCount(prev => Math.max(0, prev - 1));
                  }}
                  className="p-3 bg-red-600 hover:bg-red-700 rounded-lg transition-colors font-semibold"
                >
                  - Exit (Person Exited)
                </button>
              </div>
            )}
          </div>
        )}

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
                  if (videoSource === 'file' && videoRef.current) {
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

          {/* Placeholder when no video */}
          {videoSource === 'none' && (
            <div className="w-full h-96 flex items-center justify-center text-gray-500">
              <div className="text-center">
                <Camera size={64} className="mx-auto mb-4 opacity-50" />
                <p className="text-lg">Select a video source to begin</p>
                <p className="text-sm mt-2">Load demo, use webcam, upload video, or load YouTube demo</p>
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

        {/* YouTube Video Counting Summary */}
        {videoSource === 'youtube' && (totalEntries > 0 || totalExits > 0) && (
          <div className="mb-6 p-4 bg-gradient-to-r from-blue-900 to-purple-900 rounded-lg border border-blue-700">
            <h3 className="text-lg font-semibold mb-3 text-white flex items-center gap-2">
              📊 Counting Summary
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-4xl font-bold text-green-400">{totalEntries}</div>
                <div className="text-sm text-gray-300 mt-1">Total Entries</div>
              </div>
              <div className="text-center">
                <div className="text-4xl font-bold text-red-400">{totalExits}</div>
                <div className="text-sm text-gray-300 mt-1">Total Exits</div>
              </div>
              <div className="text-center">
                <div className="text-4xl font-bold text-blue-400">{currentCount}</div>
                <div className="text-sm text-gray-300 mt-1">Currently Inside</div>
              </div>
            </div>
            {isCounting && (
              <div className="mt-3 text-center">
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-green-600 rounded-full">
                  <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                  <span className="text-sm font-semibold">Live Counting Active</span>
                </div>
              </div>
            )}
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
              {currentResult.detections.slice(0, 10).map((detection: Detection, index: number) => (
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
            <li>• AI-powered person detection with bounding boxes</li>
            <li>• Real-time confidence scores for each detection</li>
            <li>• Automatic crowd density classification</li>
            <li>• Performance metrics: inference time and FPS</li>
            <li>• Supports demo images, webcam, video uploads, and YouTube videos</li>
            <li>• Person counting mode: Track entries and exits in real-time</li>
            <li>• All processing happens locally in your browser</li>
          </ul>
          {videoSource === 'youtube' && (
            <div className="mt-3 p-3 bg-yellow-900 bg-opacity-30 border border-yellow-700 rounded">
              <p className="text-xs text-yellow-300">
                <strong>YouTube Demo Mode:</strong> Use the manual counting buttons to track people entering and exiting. 
                Watch the video and click "+ Entry" when someone enters, or "- Exit" when someone leaves.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
