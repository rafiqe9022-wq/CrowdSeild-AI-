import React, { useRef, useState, useEffect } from 'react';
import { Camera, Upload, Play, Pause, AlertTriangle, Activity, ImageIcon, Users, Loader } from 'lucide-react';
import { ObjectDetector, FilesetResolver, Detection as MediaPipeDetection } from '@mediapipe/tasks-vision';

interface TrackedPerson {
  id: number;
  x: number;
  y: number;
  width: number;
  height: number;
  lastSeen: number;
}

export default function AIDetection() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const detectorRef = useRef<ObjectDetector | null>(null);
  const animationFrameRef = useRef<number>();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isDetectingRef = useRef(false);
  const trackedPeopleRef = useRef<TrackedPerson[]>([]);
  const nextPersonIdRef = useRef(1);

  const [isModelLoading, setIsModelLoading] = useState(true);
  const [isModelReady, setIsModelReady] = useState(false);
  const [isDetecting, setIsDetecting] = useState(false);
  const [videoSource, setVideoSource] = useState<'none' | 'webcam' | 'file' | 'demo' | 'youtube'>('none');
  const [fps, setFps] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [videoFileName, setVideoFileName] = useState<string>('');
  const [demoImage, setDemoImage] = useState<HTMLImageElement | null>(null);
  
  // Entry counting state
  const [entries, setEntries] = useState(0);
  const [currentInFrame, setCurrentInFrame] = useState(0);
  const [peakCount, setPeakCount] = useState(0);
  
  // YouTube manual counting state
  const [youtubeEntries, setYoutubeEntries] = useState(0);
  const [youtubeExits, setYoutubeExits] = useState(0);
  const [isYoutubeCounting, setIsYoutubeCounting] = useState(false);

  // Load MediaPipe model on component mount
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
      
      console.log('🔄 Loading MediaPipe Object Detector...');
      
      // Initialize MediaPipe vision tasks
      const vision = await FilesetResolver.forVisionTasks(
        'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm'
      );
      
      // Create object detector with person detection model
      detectorRef.current = await ObjectDetector.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/object_detector/efficientdet_lite0/float16/1/efficientdet_lite0.tflite',
          delegate: 'GPU'
        },
        scoreThreshold: 0.5,
        maxResults: 20
      });
      
      setIsModelReady(true);
      console.log('✅ MediaPipe model loaded successfully!');
    } catch (err) {
      console.error('❌ Failed to load MediaPipe model:', err);
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

  // Load YouTube video
  const loadYouTubeVideo = () => {
    setError(null);
    setVideoSource('youtube');
    setVideoFileName('YouTube Demo Video');
    setYoutubeEntries(0);
    setYoutubeExits(0);
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
      videoRef.current.loop = true;
      setVideoSource('file');
      setVideoFileName(file.name);
      resetCounters();
      
      videoRef.current.onloadeddata = () => {
        console.log('✅ Video loaded, starting AI detection...');
        setTimeout(() => {
          if (!isDetecting) {
            startDetection();
          }
        }, 300);
      };
    }
  };

  // Reset counters
  const resetCounters = () => {
    setEntries(0);
    setCurrentInFrame(0);
    setPeakCount(0);
    trackedPeopleRef.current = [];
    nextPersonIdRef.current = 1; // Reset ID counter so total starts from 0
  };

  // Track people across frames accurately
  const trackPeople = (detections: MediaPipeDetection[], canvasWidth: number, canvasHeight: number) => {
    const now = Date.now();
    const MAX_AGE = 500; // 0.5 seconds - shorter for more accurate tracking
    const MATCH_DISTANCE = 80; // pixels - closer match for accuracy
    
    // Update tracked people
    const currentTracked = trackedPeopleRef.current;
    const matchedIds = new Set<number>();
    
    // Match detections to tracked people
    detections.forEach(detection => {
      if (detection.categories[0]?.categoryName !== 'person') return;
      if (!detection.boundingBox) return;
      
      const detX = detection.boundingBox.originX * canvasWidth;
      const detY = detection.boundingBox.originY * canvasHeight;
      const detWidth = detection.boundingBox.width * canvasWidth;
      const detHeight = detection.boundingBox.height * canvasHeight;
      const detCenterX = detX + detWidth / 2;
      const detCenterY = detY + detHeight / 2;
      
      // Find closest tracked person
      let bestMatch = null;
      let bestDistance = Infinity;
      
      for (let person of currentTracked) {
        if (matchedIds.has(person.id)) continue; // Already matched
        
        const personCenterX = person.x + person.width / 2;
        const personCenterY = person.y + person.height / 2;
        const distance = Math.sqrt(
          Math.pow(detCenterX - personCenterX, 2) + 
          Math.pow(detCenterY - personCenterY, 2)
        );
        
        if (distance < bestDistance && distance < MATCH_DISTANCE) {
          bestDistance = distance;
          bestMatch = person;
        }
      }
      
      // Update matched person or create new one
      if (bestMatch) {
        bestMatch.x = detX;
        bestMatch.y = detY;
        bestMatch.width = detWidth;
        bestMatch.height = detHeight;
        bestMatch.lastSeen = now;
        matchedIds.add(bestMatch.id);
      } else {
        // New person detected
        currentTracked.push({
          id: nextPersonIdRef.current++,
          x: detX,
          y: detY,
          width: detWidth,
          height: detHeight,
          lastSeen: now
        });
      }
    });
    
    // Remove old tracked people (not seen recently)
    trackedPeopleRef.current = currentTracked.filter(p => {
      const age = now - p.lastSeen;
      return age < MAX_AGE || matchedIds.has(p.id);
    });
    
    return trackedPeopleRef.current;
  };

  // AI Detection loop with MediaPipe
  const detectFrame = async () => {
    if (!isDetectingRef.current || !detectorRef.current) return;

    const canvas = canvasRef.current;
    const video = videoRef.current;
    
    if (!canvas || !video) {
      setTimeout(() => {
        if (isDetectingRef.current) {
          animationFrameRef.current = requestAnimationFrame(detectFrame);
        }
      }, 100);
      return;
    }

    if (video.readyState < 2) {
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
      if (video.videoWidth > 0 && video.videoHeight > 0) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
      }

      // Draw current video frame
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      // Run MediaPipe detection
      const startTime = performance.now();
      const result = detectorRef.current.detect(video);
      const inferenceTime = performance.now() - startTime;

      // Filter for person detections
      const personDetections = result.detections.filter(
        det => det.categories[0]?.categoryName === 'person'
      );

      // Track people accurately
      const trackedPeople = trackPeople(personDetections, canvas.width, canvas.height);

      // Update counts
      const uniquePeopleCount = trackedPeople.length;
      setCurrentInFrame(uniquePeopleCount);
      setPeakCount(prev => Math.max(prev, uniquePeopleCount));
      // Total unique = highest ID ever assigned (new people get new IDs)
      setEntries(nextPersonIdRef.current - 1);

      // Draw detection info
      ctx.fillStyle = 'rgba(0, 255, 0, 0.1)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw bounding boxes for tracked people (with IDs and dots)
      trackedPeople.forEach((person) => {
        // Find the detection that matches this tracked person to get confidence score
        const matchingDetection = personDetections.find(det => {
          if (!det.boundingBox) return false;
          const detX = det.boundingBox.originX * canvas.width;
          const detY = det.boundingBox.originY * canvas.height;
          const detWidth = det.boundingBox.width * canvas.width;
          const detHeight = det.boundingBox.height * canvas.height;
          const detCenterX = detX + detWidth / 2;
          const detCenterY = detY + detHeight / 2;
          const personCenterX = person.x + person.width / 2;
          const personCenterY = person.y + person.height / 2;
          const distance = Math.sqrt(
            Math.pow(detCenterX - personCenterX, 2) + 
            Math.pow(detCenterY - personCenterY, 2)
          );
          return distance < 50; // Close match
        });
        
        const score = matchingDetection?.categories[0]?.score || 0;

        // Green bounding box
        ctx.strokeStyle = '#00ff00';
        ctx.lineWidth = 3;
        ctx.strokeRect(person.x, person.y, person.width, person.height);

        // Draw center dot
        const centerX = person.x + person.width / 2;
        const centerY = person.y + person.height / 2;
        ctx.beginPath();
        ctx.arc(centerX, centerY, 8, 0, 2 * Math.PI);
        ctx.fillStyle = '#ffff00';
        ctx.fill();
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Label with ID and confidence
        const label = `#${person.id} (${(score * 100).toFixed(0)}%)`;
        ctx.font = 'bold 14px Arial';
        const textWidth = ctx.measureText(label).width;

        ctx.fillStyle = '#00ff00';
        ctx.fillRect(person.x, person.y - 22, textWidth + 12, 22);

        ctx.fillStyle = '#000000';
        ctx.fillText(label, person.x + 6, person.y - 6);
      });

      // Draw counting overlay at top
      ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
      ctx.fillRect(0, 0, canvas.width, 80);

      ctx.font = 'bold 24px Arial';
      ctx.fillStyle = '#00ff00';
      ctx.fillText(`👥 CURRENT: ${uniquePeopleCount}`, 20, 35);

      ctx.fillStyle = '#ffff00';
      ctx.fillText(`📊 TOTAL: ${entries}`, 20, 65);

      ctx.fillStyle = '#00ffff';
      ctx.fillText(`🔝 PEAK: ${peakCount}`, 400, 35);

      ctx.fillStyle = '#ff00ff';
      ctx.fillText(`🔍 TRACKING ACTIVE`, 400, 65);

      // Calculate FPS
      if (inferenceTime > 0) {
        setFps(Math.round(1000 / inferenceTime));
      }

      // Continue detection loop
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

  // Detect on demo image
  const detectDemoImage = async () => {
    if (!detectorRef.current || !demoImage || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    try {
      canvas.width = demoImage.width;
      canvas.height = demoImage.height;

      ctx.drawImage(demoImage, 0, 0, canvas.width, canvas.height);

      // Run MediaPipe detection
      const result = detectorRef.current.detect(demoImage);
      
      const personDetections = result.detections.filter(
        det => det.categories[0]?.categoryName === 'person'
      );

      setCurrentInFrame(personDetections.length);
      setPeakCount(personDetections.length);
      setEntries(personDetections.length);

      // Track people
      const trackedPeople = trackPeople(personDetections, canvas.width, canvas.height);

      // Update counts
      setCurrentInFrame(trackedPeople.length);
      setPeakCount(trackedPeople.length);
      // Total unique = highest ID ever assigned
      setEntries(nextPersonIdRef.current - 1);

      // Draw bounding boxes with center dots and IDs
      trackedPeople.forEach((person, index) => {
        const score = personDetections[index]?.categories[0]?.score || 0;
        const centerX = person.x + person.width / 2;
        const centerY = person.y + person.height / 2;

        // Green bounding box
        ctx.strokeStyle = '#00ff00';
        ctx.lineWidth = 3;
        ctx.strokeRect(person.x, person.y, person.width, person.height);

        // Draw center dot
        ctx.beginPath();
        ctx.arc(centerX, centerY, 8, 0, 2 * Math.PI);
        ctx.fillStyle = '#ffff00';
        ctx.fill();
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Label with ID and confidence
        const label = `#${person.id} (${(score * 100).toFixed(0)}%)`;
        ctx.font = 'bold 14px Arial';
        const textWidth = ctx.measureText(label).width;

        ctx.fillStyle = '#00ff00';
        ctx.fillRect(person.x, person.y - 22, textWidth + 12, 22);

        ctx.fillStyle = '#000000';
        ctx.fillText(label, person.x + 6, person.y - 6);
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
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    resetCounters();
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2">AI Person Entry Counter</h1>
          <p className="text-gray-400">
            Real-time person detection and entry counting using MediaPipe AI
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
                  <span className="text-green-400">MediaPipe AI Model Ready</span>
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
        <div className="mb-6 grid grid-cols-1 md:grid-cols-5 gap-4">
          <button
            onClick={loadDemoImage}
            disabled={!isModelReady || isDetecting}
            className="p-4 bg-orange-600 hover:bg-orange-700 disabled:bg-gray-700 disabled:cursor-not-allowed rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            <ImageIcon size={20} />
            <span>Load Demo</span>
          </button>

          <button
            onClick={loadYouTubeVideo}
            disabled={!isModelReady || isDetecting}
            className="p-4 bg-red-600 hover:bg-red-700 disabled:bg-gray-700 disabled:cursor-not-allowed rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
            </svg>
            <span>YouTube Demo</span>
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
            disabled={!isModelReady || videoSource === 'none' || videoSource === 'youtube'}
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

          {/* Placeholder */}
          {videoSource === 'none' && (
            <div className="w-full h-96 flex items-center justify-center text-gray-500">
              <div className="text-center">
                <Camera size={64} className="mx-auto mb-4 opacity-50" />
                <p className="text-lg">Select a video source to begin</p>
                <p className="text-sm mt-2">Upload a video, use webcam, load demo, or watch YouTube</p>
                <p className="text-xs mt-2 text-yellow-500">💡 AI will detect people with green boxes and yellow center dots!</p>
              </div>
            </div>
          )}
        </div>

        {/* YouTube Manual Counting */}
        {videoSource === 'youtube' && (
          <div className="mb-6 p-4 bg-gradient-to-r from-red-900 to-red-800 rounded-lg border-2 border-red-500">
            <h3 className="text-lg font-semibold mb-2 flex items-center gap-2 text-white">
              <Users size={24} />
              YOUTUBE VIDEO - MANUAL COUNTING
              {isYoutubeCounting && (
                <span className="ml-2 px-2 py-1 bg-green-600 rounded text-xs animate-pulse">
                  ● COUNTING
                </span>
              )}
            </h3>
            <div className="mb-4 p-3 bg-yellow-900 bg-opacity-30 border border-yellow-700 rounded">
              <p className="text-xs text-yellow-300">
                ⚠️ <strong>Why manual counting?</strong> YouTube videos are embedded in a secure iframe that prevents direct frame access for AI processing. 
                For automatic AI detection, please upload a video file using the "Upload Video" button above.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div className="p-4 bg-gray-900 rounded-lg border-2 border-green-500">
                <div className="text-gray-400 text-sm mb-1">Total Entries</div>
                <div className="text-4xl font-bold text-green-400">
                  {youtubeEntries}
                </div>
                <div className="text-xs text-gray-500 mt-1">people entered</div>
              </div>

              <div className="p-4 bg-gray-900 rounded-lg border-2 border-red-500">
                <div className="text-gray-400 text-sm mb-1">Total Exits</div>
                <div className="text-4xl font-bold text-red-400">
                  {youtubeExits}
                </div>
                <div className="text-xs text-gray-500 mt-1">people exited</div>
              </div>

              <div className="p-4 bg-gray-900 rounded-lg border-2 border-blue-500">
                <div className="text-gray-400 text-sm mb-1">Current Inside</div>
                <div className="text-4xl font-bold text-blue-400">
                  {youtubeEntries - youtubeExits}
                </div>
                <div className="text-xs text-gray-500 mt-1">people now</div>
              </div>
            </div>

            <div className="flex gap-2 mb-4">
              <button
                onClick={() => setIsYoutubeCounting(!isYoutubeCounting)}
                className={`flex-1 p-3 rounded-lg transition-colors flex items-center justify-center gap-2 ${
                  isYoutubeCounting
                    ? 'bg-red-600 hover:bg-red-700'
                    : 'bg-green-600 hover:bg-green-700'
                }`}
              >
                {isYoutubeCounting ? <Pause size={20} /> : <Play size={20} />}
                <span>{isYoutubeCounting ? 'Stop Counting' : 'Start Counting'}</span>
              </button>
              <button
                onClick={() => {
                  setYoutubeEntries(0);
                  setYoutubeExits(0);
                }}
                className="px-4 py-3 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors"
              >
                🔄 Reset
              </button>
            </div>

            {isYoutubeCounting && (
              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => setYoutubeEntries(prev => prev + 1)}
                  className="p-4 bg-green-600 hover:bg-green-700 rounded-lg transition-colors font-semibold text-lg"
                >
                  + Entry (Person Entered)
                </button>
                <button
                  onClick={() => setYoutubeExits(prev => prev + 1)}
                  className="p-4 bg-red-600 hover:bg-red-700 rounded-lg transition-colors font-semibold text-lg"
                >
                  - Exit (Person Exited)
                </button>
              </div>
            )}
          </div>
        )}

        {/* LIVE ENTRY COUNTING DASHBOARD */}
        {videoSource !== 'none' && videoSource !== 'youtube' && (
          <div className="mb-6 p-4 bg-gradient-to-r from-gray-800 to-gray-900 rounded-lg border-2 border-cyan-500">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2 text-cyan-400">
              <Users size={24} />
              REAL AI PEOPLE COUNTING
              {isDetecting && (
                <span className="ml-2 px-2 py-1 bg-green-600 rounded text-xs animate-pulse">
                  ● LIVE
                </span>
              )}
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 bg-gray-900 rounded-lg border-2 border-green-500">
                <div className="text-gray-400 text-sm mb-1">👥 Current People</div>
                <div className="text-5xl font-bold text-green-400">
                  {currentInFrame}
                </div>
                <div className="text-xs text-gray-500 mt-1">people in frame now</div>
              </div>

              <div className="p-4 bg-gray-900 rounded-lg border-2 border-yellow-500">
                <div className="text-gray-400 text-sm mb-1">📊 Total Unique Visitors</div>
                <div className="text-5xl font-bold text-yellow-400">
                  {entries}
                </div>
                <div className="text-xs text-gray-500 mt-1">all unique people seen</div>
              </div>

              <div className="p-4 bg-gray-900 rounded-lg border-2 border-blue-500">
                <div className="text-gray-400 text-sm mb-1">🔝 Peak Count</div>
                <div className="text-5xl font-bold text-blue-400">
                  {peakCount}
                </div>
                <div className="text-xs text-gray-500 mt-1">maximum at once</div>
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

            <div className="mt-4 p-3 bg-blue-900 bg-opacity-30 border border-blue-700 rounded">
              <p className="text-xs text-blue-300">
                💡 <strong>How it works:</strong> AI detects people with green bounding boxes and yellow center dots. 
                Each person gets a stable tracking ID (#1, #2, #3) that persists as they move. 
                Current count shows people in frame now. Total unique shows all different people seen.
              </p>
            </div>
          </div>
        )}

        {/* Statistics */}
        {videoSource !== 'none' && videoSource !== 'youtube' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div className="p-4 bg-gray-800 rounded-lg border border-gray-700">
              <div className="text-gray-400 text-sm mb-1">Processing Speed</div>
              <div className="text-3xl font-bold text-purple-400">{fps}</div>
              <div className="text-xs text-gray-500 mt-1">FPS</div>
            </div>

            <div className="p-4 bg-gray-800 rounded-lg border border-gray-700">
              <div className="text-gray-400 text-sm mb-1">AI Model</div>
              <div className="text-xl font-bold text-cyan-400">MediaPipe</div>
              <div className="text-xs text-gray-500 mt-1">EfficientDet Lite0</div>
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
            <li>• <strong>MediaPipe AI</strong> - Google's advanced object detection model</li>
            <li>• <strong>Dot-based tracking</strong> - Yellow dot at center of each person for easy identification</li>
            <li>• <strong>Stable tracking IDs</strong> - Each person keeps same ID (#1, #2, #3) across frames</li>
            <li>• <strong>Accurate counting</strong> - Current people count updates as people enter/leave frame</li>
            <li>• <strong>No double-counting</strong> - Same person tracked continuously, not counted multiple times</li>
            <li>• <strong>Real-time detection</strong> - Green bounding boxes with center dots and IDs</li>
            <li>• <strong>Works with uploaded videos, webcam, and demo images</strong></li>
            <li>• <strong>YouTube videos</strong> - Manual counting only (iframe restriction)</li>
          </ul>
          <div className="mt-3 p-3 bg-green-900 bg-opacity-30 border border-green-700 rounded">
            <p className="text-xs text-green-300">
              <strong>💡 Quick Start:</strong> Upload any crowd video → AI detects people with green boxes and yellow center dots. 
              Each person gets a stable ID (#1, #2, #3) that persists as they move. The current count updates automatically!
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
