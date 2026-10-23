import React, { useRef, useState, useEffect } from 'react';
import { Camera, Upload, Play, Pause, AlertTriangle, Activity, ImageIcon, Users, Loader } from 'lucide-react';
import { ObjectDetector, FilesetResolver, Detection as MediaPipeDetection } from '@mediapipe/tasks-vision';
import { PersonTracker } from '../utils/personTracker';

export default function AIDetection() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const detectorRef = useRef<ObjectDetector | null>(null);
  const trackerRef = useRef<PersonTracker>(new PersonTracker());
  const animationFrameRef = useRef<number>();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isDetectingRef = useRef(false);
  const objectUrlRef = useRef<string | null>(null);
  
  // Phone camera WebRTC refs
  const wsRef = useRef<WebSocket | null>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const phoneStreamRef = useRef<MediaStream | null>(null);

  const [isModelLoading, setIsModelLoading] = useState(true);
  const [isModelReady, setIsModelReady] = useState(false);
  const [isDetecting, setIsDetecting] = useState(false);
  const [videoSource, setVideoSource] = useState<'none' | 'webcam' | 'file' | 'demo' | 'youtube' | 'phone'>('none');
  const [fps, setFps] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [videoFileName, setVideoFileName] = useState<string>('');
  const [demoImage, setDemoImage] = useState<HTMLImageElement | null>(null);
  
  // Phone camera state
  const [pairingToken, setPairingToken] = useState<string | null>(null);
  const [phoneConnected, setPhoneConnected] = useState(false);
  const [phoneConnectionStatus, setPhoneConnectionStatus] = useState<'disconnected' | 'waiting' | 'connecting' | 'connected'>('disconnected');
  
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
      // Clean up phone camera on unmount
      cleanupPhoneCamera();
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
    
    // Clean up phone camera if active
    if (videoSource === 'phone') {
      cleanupPhoneCamera();
    }
    
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
    
    // Clean up phone camera if active
    if (videoSource === 'phone') {
      cleanupPhoneCamera();
    }
    
    setVideoSource('youtube');
    setVideoFileName('YouTube Demo Video');
    setYoutubeEntries(0);
    setYoutubeExits(0);
  };

  // Start webcam
  const startWebcam = async () => {
    if (!isModelReady) return;
    setError(null);
    
    // Clean up phone camera if active
    if (videoSource === 'phone') {
      cleanupPhoneCamera();
    }
    
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

  // Start phone camera (WebRTC receiver)
  const startPhoneCamera = () => {
    if (!isModelReady) return;
    setError(null);
    setPhoneConnectionStatus('waiting');
    
    // Try WSS first (secure WebSocket), then fallback to WS
    const hostname = window.location.hostname;
    const wssUrl = `wss://${hostname}:3001`;
    const wsUrl = `ws://${hostname}:3001`;
    
    console.log('📱 Attempting to connect to signaling server...');
    console.log('   Primary:', wssUrl);
    console.log('   Fallback:', wsUrl);
    
    const connectWithFallback = (url: string, isPrimary: boolean) => {
      try {
        const ws = new WebSocket(url);
        wsRef.current = ws;
        
        const connectionTimeout = setTimeout(() => {
          if (ws.readyState !== WebSocket.OPEN) {
            console.warn(`⏱️ Connection timeout for ${url}`);
            ws.close();
            
            if (isPrimary) {
              console.log('🔄 Trying fallback connection (ws://)...');
              connectWithFallback(wsUrl, false);
            } else {
              setError('Failed to connect to signaling server. Please ensure:\n1. Run "npm run signaling" in a separate terminal\n2. Port 3001 is not blocked by firewall\n3. Both servers are running on the same network');
              setPhoneConnectionStatus('disconnected');
            }
          }
        }, 5000);
        
        ws.onopen = () => {
          clearTimeout(connectionTimeout);
          console.log(`✅ Connected to signaling server via ${isPrimary ? 'WSS' : 'WS'}`);
          // Request to create a room
          ws.send(JSON.stringify({
            type: 'create-room'
          }));
        };
        
        ws.onmessage = (event) => {
          const message = JSON.parse(event.data);
          handlePhoneSignalingMessage(message);
        };
        
        ws.onerror = (error) => {
          clearTimeout(connectionTimeout);
          console.error(`❌ WebSocket error on ${url}:`, error);
          
          if (isPrimary) {
            console.log('🔄 WSS failed, trying WS fallback...');
            ws.close();
            connectWithFallback(wsUrl, false);
          } else {
            setError('Failed to connect to signaling server. Please ensure:\n1. Run "npm run signaling" in a separate terminal\n2. Port 3001 is not blocked by firewall\n3. Both servers are running on the same network');
            setPhoneConnectionStatus('disconnected');
          }
        };
        
        ws.onclose = () => {
          clearTimeout(connectionTimeout);
          console.log('🔌 Disconnected from signaling server');
          if (phoneConnectionStatus !== 'connected') {
            setPhoneConnectionStatus('disconnected');
          }
        };
        
      } catch (error) {
        console.error(`❌ Failed to connect to ${url}:`, error);
        
        if (isPrimary) {
          console.log('🔄 WSS connection failed, trying WS fallback...');
          connectWithFallback(wsUrl, false);
        } else {
          setError('Failed to initialize phone camera connection. Please check your network and try again.');
          setPhoneConnectionStatus('disconnected');
        }
      }
    };
    
    // Start with WSS (secure WebSocket)
    connectWithFallback(wssUrl, true);
  };

  // Handle phone signaling messages
  const handlePhoneSignalingMessage = async (message: any) => {
    console.log('📨 Phone signaling message:', message.type);
    
    switch (message.type) {
      case 'room-created':
        // Display pairing token to user
        setPairingToken(message.token);
        console.log('🎫 Pairing token:', message.token);
        break;
      
      case 'phone-connected':
        console.log('📱 Phone connected!');
        setPhoneConnectionStatus('connecting');
        // Create peer connection
        await createPhonePeerConnection();
        break;
      
      case 'offer':
        // Phone sent an offer, we need to answer
        if (peerConnectionRef.current) {
          await peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(message.data));
          const answer = await peerConnectionRef.current.createAnswer();
          await peerConnectionRef.current.setLocalDescription(answer);
          
          // Send answer back to phone
          wsRef.current?.send(JSON.stringify({
            type: 'answer',
            roomId: message.roomId || pairingToken,
            data: answer
          }));
          console.log('✅ Sent answer to phone');
        }
        break;
      
      case 'ice-candidate':
        // Phone sent ICE candidate
        if (peerConnectionRef.current) {
          try {
            await peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(message.data));
            console.log('✅ Added ICE candidate from phone');
          } catch (error) {
            console.error('❌ Error adding ICE candidate:', error);
          }
        }
        break;
      
      case 'token-expired':
        setError('Pairing token expired. Please generate a new one.');
        setPhoneConnectionStatus('disconnected');
        setPairingToken(null);
        break;
      
      case 'peer-disconnected':
        console.log('📱 Phone disconnected');
        setPhoneConnectionStatus('disconnected');
        setPairingToken(null);
        cleanupPhoneCamera();
        break;
      
      case 'error':
        setError(`Phone connection error: ${message.message}`);
        setPhoneConnectionStatus('disconnected');
        break;
    }
  };

  // Create peer connection for phone camera
  const createPhonePeerConnection = async () => {
    const rtcConfig = {
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' }
      ]
    };
    
    const peerConnection = new RTCPeerConnection(rtcConfig);
    peerConnectionRef.current = peerConnection;
    
    // Handle incoming tracks from phone
    peerConnection.ontrack = (event) => {
      console.log('📹 Received track from phone:', event.track.kind);
      
      if (event.track.kind === 'video') {
        // Create a MediaStream and attach to video element
        const stream = new MediaStream([event.track]);
        phoneStreamRef.current = stream;
        
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          setVideoSource('phone');
          setVideoFileName('Phone Camera');
          setPhoneConnectionStatus('connected');
          resetCounters();
          
          // Start detection automatically
          setTimeout(() => {
            if (!isDetecting) {
              startDetection();
            }
          }, 500);
        }
      }
    };
    
    // Handle ICE candidates
    peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        console.log('📤 Sending ICE candidate to phone');
        wsRef.current?.send(JSON.stringify({
          type: 'ice-candidate',
          data: event.candidate
        }));
      }
    };
    
    // Handle connection state changes
    peerConnection.onconnectionstatechange = () => {
      console.log('🔄 Connection state:', peerConnection.connectionState);
      
      if (peerConnection.connectionState === 'connected') {
        setPhoneConnectionStatus('connected');
      } else if (peerConnection.connectionState === 'disconnected' || 
                 peerConnection.connectionState === 'failed') {
        setPhoneConnectionStatus('disconnected');
        cleanupPhoneCamera();
      }
    };
    
    // Handle ICE connection state
    peerConnection.oniceconnectionstatechange = () => {
      console.log('🔄 ICE state:', peerConnection.iceConnectionState);
    };
  };

  // Cleanup phone camera resources
  const cleanupPhoneCamera = () => {
    console.log('🧹 Cleaning up phone camera resources...');
    
    // Close peer connection
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }
    
    // Stop phone stream
    if (phoneStreamRef.current) {
      phoneStreamRef.current.getTracks().forEach(track => track.stop());
      phoneStreamRef.current = null;
    }
    
    // Close WebSocket
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    
    // Reset state
    setPairingToken(null);
    setPhoneConnected(false);
    setPhoneConnectionStatus('disconnected');
    
    // Clear video element if it was showing phone
    if (videoSource === 'phone' && videoRef.current) {
      videoRef.current.srcObject = null;
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
    
    // Clean up phone camera if active
    if (videoSource === 'phone') {
      cleanupPhoneCamera();
    }
    
    // Clean up previous object URL if exists
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
    }
    
    const url = URL.createObjectURL(file);
    objectUrlRef.current = url; // Store for cleanup
    
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

  // Reset counters and tracker
  const resetCounters = () => {
    setEntries(0);
    setCurrentInFrame(0);
    setPeakCount(0);
    trackerRef.current.reset();
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

      // Track people using the robust tracker
      const trackedPeople = trackerRef.current.update(personDetections, canvas.width, canvas.height);

      // Update counts
      const currentPeopleCount = trackedPeople.length;
      setCurrentInFrame(currentPeopleCount);
      setPeakCount(prev => Math.max(prev, currentPeopleCount));
      // Total tracks created (not unique visitors - tracker IDs can change)
      setEntries(trackerRef.current.getTotalTracksCreated());

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
      ctx.fillText(`👥 CURRENT: ${currentPeopleCount}`, 20, 35);

      ctx.fillStyle = '#ffff00';
      ctx.fillText(`📊 TRACKS: ${entries}`, 20, 65);

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

      // Track people using the robust tracker
      const trackedPeople = trackerRef.current.update(personDetections, canvas.width, canvas.height);

      // Update counts
      const currentPeopleCount = trackedPeople.length;
      setCurrentInFrame(currentPeopleCount);
      setPeakCount(currentPeopleCount);
      // Total tracks created
      setEntries(trackerRef.current.getTotalTracksCreated());

      // Draw bounding boxes with center dots and IDs
      trackedPeople.forEach((person) => {
        // Find matching detection for confidence score
        const matchingDet = personDetections.find(det => {
          if (!det.boundingBox) return false;
          const detX = det.boundingBox.originX * canvas.width;
          const detY = det.boundingBox.originY * canvas.height;
          const detWidth = det.boundingBox.width * canvas.width;
          const detHeight = det.boundingBox.height * canvas.height;
          const distance = Math.sqrt(
            Math.pow((detX + detWidth/2) - (person.x + person.width/2), 2) +
            Math.pow((detY + detHeight/2) - (person.y + person.height/2), 2)
          );
          return distance < 50;
        });
        const score = matchingDet?.categories[0]?.score || person.confidence;
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
    
    // Clean up phone camera if active
    if (videoSource === 'phone') {
      cleanupPhoneCamera();
    }
    
    if (videoRef.current) {
      if (videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach(track => track.stop());
        videoRef.current.srcObject = null;
      }
      videoRef.current.src = '';
    }
    // Clean up object URL to prevent memory leaks
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
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
    <div className="min-h-screen bg-[#070b1a] text-white p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2 text-white">AI Person Entry Counter</h1>
          <p className="text-slate-400">
            Real-time person detection and entry counting using MediaPipe AI
          </p>
        </div>

        {/* Model Status */}
        <div className="mb-6 p-4 bg-[#111b36] rounded-lg border border-[#1c2a4f]">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {isModelLoading && (
                <>
                  <Loader className="animate-spin text-violet-400" size={24} />
                  <span className="text-violet-400">Loading AI Model...</span>
                </>
              )}
              {isModelReady && !isModelLoading && (
                <>
                  <div className="h-6 w-6 rounded-full bg-emerald-500 flex items-center justify-center shadow-lg shadow-emerald-500/30">
                    <span className="text-xs">✓</span>
                  </div>
                  <span className="text-emerald-400">MediaPipe AI Model Ready</span>
                </>
              )}
              {error && (
                <>
                  <AlertTriangle className="text-rose-500" size={24} />
                  <span className="text-rose-400">{error}</span>
                </>
              )}
            </div>
            {isDetecting && (
              <div className="flex items-center gap-2 text-emerald-400">
                <div className="h-3 w-3 rounded-full bg-emerald-500 animate-pulse shadow-lg shadow-emerald-500/50"></div>
                <span className="font-semibold">AI DETECTION ACTIVE</span>
              </div>
            )}
          </div>
        </div>

        {/* Controls */}
        <div className="mb-6 grid grid-cols-1 md:grid-cols-6 gap-4">
          <button
            onClick={loadDemoImage}
            disabled={!isModelReady || isDetecting}
            className="p-4 bg-orange-500/15 hover:bg-orange-500/25 disabled:bg-[#111b36] disabled:text-slate-600 disabled:cursor-not-allowed rounded-lg transition-all flex items-center justify-center gap-2 border border-orange-500/30 text-orange-400"
          >
            <ImageIcon size={20} />
            <span>Load Demo</span>
          </button>

          <button
            onClick={loadYouTubeVideo}
            disabled={!isModelReady || isDetecting}
            className="p-4 bg-rose-500/15 hover:bg-rose-500/25 disabled:bg-[#111b36] disabled:text-slate-600 disabled:cursor-not-allowed rounded-lg transition-all flex items-center justify-center gap-2 border border-rose-500/30 text-rose-400"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
            </svg>
            <span>YouTube Demo</span>
          </button>

          <button
            onClick={startWebcam}
            disabled={!isModelReady || isDetecting}
            className="p-4 bg-sky-500/15 hover:bg-sky-500/25 disabled:bg-[#111b36] disabled:text-slate-600 disabled:cursor-not-allowed rounded-lg transition-all flex items-center justify-center gap-2 border border-sky-500/30 text-sky-400"
          >
            <Camera size={20} />
            <span>Use Webcam</span>
          </button>

          <button
            onClick={startPhoneCamera}
            disabled={!isModelReady || isDetecting || phoneConnectionStatus === 'connecting' || phoneConnectionStatus === 'connected'}
            className="p-4 bg-emerald-500/15 hover:bg-emerald-500/25 disabled:bg-[#111b36] disabled:text-slate-600 disabled:cursor-not-allowed rounded-lg transition-all flex items-center justify-center gap-2 border border-emerald-500/30 text-emerald-400"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
            <span>Phone Camera</span>
          </button>

          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={!isModelReady || isDetecting}
            className="p-4 bg-violet-500/15 hover:bg-violet-500/25 disabled:bg-[#111b36] disabled:text-slate-600 disabled:cursor-not-allowed rounded-lg transition-all flex items-center justify-center gap-2 border border-violet-500/30 text-violet-400"
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
            className={`p-4 rounded-lg transition-all flex items-center justify-center gap-2 border ${
              isDetecting
                ? 'bg-rose-500/15 hover:bg-rose-500/25 border-rose-500/30 text-rose-400'
                : 'bg-emerald-500/15 hover:bg-emerald-500/25 border-emerald-500/30 text-emerald-400'
            } disabled:bg-[#111b36] disabled:border-[#1c2a4f] disabled:text-slate-600 disabled:cursor-not-allowed`}
          >
            {isDetecting ? <Pause size={20} /> : <Play size={20} />}
            <span>{isDetecting ? 'Stop Detection' : 'Start Detection'}</span>
          </button>
        </div>

        {/* Phone Camera Pairing UI */}
        {(phoneConnectionStatus === 'waiting' || phoneConnectionStatus === 'connecting' || phoneConnectionStatus === 'connected') && (
          <div className="mb-6 p-4 bg-gradient-to-r from-emerald-500/10 to-teal-500/10 rounded-lg border border-emerald-500/30">
            <h3 className="text-lg font-semibold mb-3 flex items-center gap-2 text-emerald-400">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
              </svg>
              Phone Camera Connection
            </h3>
            
            {phoneConnectionStatus === 'waiting' && pairingToken && (
              <>
                <div className="mb-4 p-4 bg-[#0d1429] rounded-lg border border-emerald-500/20">
                  <p className="text-sm text-slate-400 mb-2">Pairing Token (valid for 5 minutes):</p>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 p-3 bg-[#070b1a] rounded border border-[#1c2a4f] text-emerald-400 font-mono text-sm break-all">
                      {pairingToken}
                    </code>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(pairingToken);
                        setError('Token copied to clipboard!');
                        setTimeout(() => setError(null), 2000);
                      }}
                      className="px-4 py-3 bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/30 rounded text-emerald-400 text-sm font-medium transition-all"
                    >
                      Copy
                    </button>
                  </div>
                </div>
                
                <div className="p-3 bg-sky-500/10 border border-sky-500/30 rounded">
                  <p className="text-xs text-sky-300">
                    <strong>📱 Instructions:</strong><br/>
                    1. On your phone, open: <code className="bg-[#070b1a] px-2 py-1 rounded">https://{window.location.hostname}:3000/phone-camera.html</code><br/>
                    2. Enter the pairing token above<br/>
                    3. Allow camera access when prompted<br/>
                    4. Your phone camera will appear on this dashboard
                  </p>
                </div>
                
                <button
                  onClick={() => {
                    cleanupPhoneCamera();
                    setVideoSource('none');
                  }}
                  className="mt-3 w-full px-4 py-2 bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 rounded text-rose-400 text-sm font-medium transition-all"
                >
                  Cancel Connection
                </button>
              </>
            )}
            
            {phoneConnectionStatus === 'connecting' && (
              <div className="flex items-center gap-3 p-3 bg-amber-500/10 border border-amber-500/30 rounded">
                <Loader className="animate-spin text-amber-400" size={20} />
                <span className="text-amber-400">Phone connected, establishing video stream...</span>
              </div>
            )}
            
            {phoneConnectionStatus === 'connected' && (
              <div className="flex items-center justify-between p-3 bg-emerald-500/10 border border-emerald-500/30 rounded">
                <div className="flex items-center gap-3">
                  <div className="h-3 w-3 rounded-full bg-emerald-500 animate-pulse shadow-lg shadow-emerald-500/50"></div>
                  <span className="text-emerald-400 font-medium">Phone camera streaming</span>
                </div>
                <button
                  onClick={() => {
                    cleanupPhoneCamera();
                    setVideoSource('none');
                  }}
                  className="px-4 py-2 bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 rounded text-rose-400 text-sm font-medium transition-all"
                >
                  Disconnect
                </button>
              </div>
            )}
          </div>
        )}

        {/* Video Display */}
        <div className="mb-6 relative bg-[#0a0f1f] rounded-lg overflow-hidden border border-[#1c2a4f]">
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
            <div className="absolute top-4 left-4 bg-[#0d1429]/90 backdrop-blur-sm px-3 py-1 rounded text-sm z-10 border border-[#1c2a4f]">
              {videoSource === 'webcam' ? '📹 LIVE WEBCAM' : 
               videoSource === 'demo' ? '🖼️ DEMO IMAGE' : 
               videoSource === 'youtube' ? '📺 YOUTUBE VIDEO' :
               videoSource === 'phone' ? '📱 PHONE CAMERA' :
               `🎬 ${videoFileName}`}
            </div>
          )}

          {/* Placeholder */}
          {videoSource === 'none' && (
            <div className="w-full h-96 flex items-center justify-center text-slate-500">
              <div className="text-center">
                <Camera size={64} className="mx-auto mb-4 opacity-30" />
                <p className="text-lg text-slate-400">Select a video source to begin</p>
                <p className="text-sm mt-2 text-slate-500">Upload a video, use webcam, connect phone camera, load demo, or watch YouTube</p>
                <p className="text-xs mt-2 text-amber-400">💡 AI will detect people with green boxes and yellow center dots!</p>
              </div>
            </div>
          )}
        </div>

        {/* YouTube Manual Counting */}
        {videoSource === 'youtube' && (
          <div className="mb-6 p-4 bg-gradient-to-r from-rose-500/10 to-rose-600/10 rounded-lg border border-rose-500/30">
            <h3 className="text-lg font-semibold mb-2 flex items-center gap-2 text-white">
              <Users size={24} className="text-rose-400" />
              <span>YOUTUBE VIDEO - MANUAL COUNTING</span>
              {isYoutubeCounting && (
                <span className="ml-2 px-2 py-1 bg-emerald-500/20 border border-emerald-500/30 rounded text-xs text-emerald-400 animate-pulse">
                  ● COUNTING
                </span>
              )}
            </h3>
            <div className="mb-4 p-3 bg-amber-500/10 border border-amber-500/30 rounded">
              <p className="text-xs text-amber-400">
                ⚠️ <strong>Why manual counting?</strong> YouTube videos are embedded in a secure iframe that prevents direct frame access for AI processing. 
                For automatic AI detection, please upload a video file using the "Upload Video" button above.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div className="p-4 bg-[#0d1429]/50 rounded-lg border border-emerald-500/30">
                <div className="text-slate-500 text-sm mb-1">Total Entries</div>
                <div className="text-4xl font-bold text-emerald-400">
                  {youtubeEntries}
                </div>
                <div className="text-xs text-slate-500 mt-1">people entered</div>
              </div>

              <div className="p-4 bg-[#0d1429]/50 rounded-lg border border-rose-500/30">
                <div className="text-slate-500 text-sm mb-1">Total Exits</div>
                <div className="text-4xl font-bold text-rose-400">
                  {youtubeExits}
                </div>
                <div className="text-xs text-slate-500 mt-1">people exited</div>
              </div>

              <div className="p-4 bg-[#0d1429]/50 rounded-lg border border-sky-500/30">
                <div className="text-slate-500 text-sm mb-1">Current Inside</div>
                <div className="text-4xl font-bold text-sky-400">
                  {youtubeEntries - youtubeExits}
                </div>
                <div className="text-xs text-slate-500 mt-1">people now</div>
              </div>
            </div>

            <div className="flex gap-2 mb-4">
              <button
                onClick={() => setIsYoutubeCounting(!isYoutubeCounting)}
                className={`flex-1 p-3 rounded-lg transition-all flex items-center justify-center gap-2 border ${
                  isYoutubeCounting
                    ? 'bg-rose-500/15 hover:bg-rose-500/25 border-rose-500/30 text-rose-400'
                    : 'bg-emerald-500/15 hover:bg-emerald-500/25 border-emerald-500/30 text-emerald-400'
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
                className="px-4 py-3 bg-[#162042] hover:bg-[#1c2a4f] border border-[#1c2a4f] rounded-lg transition-colors text-slate-300"
              >
                🔄 Reset
              </button>
            </div>

            {isYoutubeCounting && (
              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={() => setYoutubeEntries(prev => prev + 1)}
                  className="p-4 bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 rounded-lg transition-all font-semibold text-lg text-emerald-400"
                >
                  + Entry (Person Entered)
                </button>
                <button
                  onClick={() => setYoutubeExits(prev => prev + 1)}
                  className="p-4 bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 rounded-lg transition-all font-semibold text-lg text-rose-400"
                >
                  - Exit (Person Exited)
                </button>
              </div>
            )}
          </div>
        )}

        {/* LIVE ENTRY COUNTING DASHBOARD */}
        {videoSource !== 'none' && videoSource !== 'youtube' && (
          <div className="mb-6 p-4 bg-gradient-to-r from-[#111b36] to-[#0d1429] rounded-lg border border-amber-500/30">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2 text-amber-400">
              <Users size={24} />
              REAL AI PEOPLE COUNTING
              {isDetecting && (
                <span className="ml-2 px-2 py-1 bg-emerald-500/20 border border-emerald-500/30 rounded text-xs text-emerald-400 animate-pulse">
                  ● LIVE
                </span>
              )}
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 bg-[#0d1429]/50 rounded-lg border border-emerald-500/30">
                <div className="text-slate-500 text-sm mb-1">👥 Current People</div>
                <div className="text-5xl font-bold text-emerald-400">
                  {currentInFrame}
                </div>
                <div className="text-xs text-slate-500 mt-1">people in frame now</div>
              </div>

              <div className="p-4 bg-[#0d1429]/50 rounded-lg border border-amber-500/30">
                <div className="text-slate-500 text-sm mb-1">📊 Total Tracks Created</div>
                <div className="text-5xl font-bold text-amber-400">
                  {entries}
                </div>
                <div className="text-xs text-slate-500 mt-1">tracking IDs assigned</div>
              </div>

              <div className="p-4 bg-[#0d1429]/50 rounded-lg border border-sky-500/30">
                <div className="text-slate-500 text-sm mb-1">🔝 Peak Count</div>
                <div className="text-5xl font-bold text-sky-400">
                  {peakCount}
                </div>
                <div className="text-xs text-slate-500 mt-1">maximum at once</div>
              </div>
            </div>

            <div className="mt-4 flex gap-2">
              <button
                onClick={resetCounters}
                className="px-4 py-2 bg-[#162042] hover:bg-[#1c2a4f] border border-[#1c2a4f] rounded-lg transition-colors text-sm text-slate-300"
              >
                🔄 Reset Counters
              </button>
            </div>

            <div className="mt-4 p-3 bg-sky-500/10 border border-sky-500/30 rounded">
              <p className="text-xs text-sky-300">
                💡 <strong>How it works:</strong> AI detects people with green bounding boxes and yellow center dots. 
                Each person gets a stable tracking ID (#1, #2, #3) using IoU-based matching with motion prediction. 
                <strong> Current People</strong> = people visible now. 
                <strong> Total Tracks</strong> = number of tracking IDs created (may exceed actual unique people if tracking is lost). 
                <strong> Peak Count</strong> = maximum people seen at once.
              </p>
            </div>
          </div>
        )}

        {/* Statistics */}
        {videoSource !== 'none' && videoSource !== 'youtube' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div className="p-4 bg-[#111b36] rounded-lg border border-[#1c2a4f]">
              <div className="text-slate-500 text-sm mb-1">Processing Speed</div>
              <div className="text-3xl font-bold text-violet-400">{fps}</div>
              <div className="text-xs text-slate-500 mt-1">FPS</div>
            </div>

            <div className="p-4 bg-[#111b36] rounded-lg border border-[#1c2a4f]">
              <div className="text-slate-500 text-sm mb-1">AI Model</div>
              <div className="text-xl font-bold text-amber-400">MediaPipe</div>
              <div className="text-xs text-slate-500 mt-1">EfficientDet Lite0</div>
            </div>
          </div>
        )}

        {/* Stop Video Button */}
        {videoSource !== 'none' && (
          <div className="mt-6">
            <button
              onClick={stopVideo}
              className="w-full p-3 bg-[#162042] hover:bg-[#1c2a4f] border border-[#1c2a4f] rounded-lg transition-colors text-slate-300"
            >
              Stop Video & Release Resources
            </button>
          </div>
        )}

        {/* Info Panel */}
        <div className="mt-6 p-4 bg-[#111b36] border border-[#1c2a4f] rounded-lg">
          <h3 className="text-lg font-semibold mb-2 text-amber-400">About This AI Detection</h3>
          <ul className="text-sm text-slate-300 space-y-1">
            <li>• <strong>MediaPipe AI</strong> - Google's EfficientDet Lite0 object detection model</li>
            <li>• <strong>IoU-based tracking</strong> - Uses Intersection over Union with motion prediction for stable IDs</li>
            <li>• <strong>Dot-based visualization</strong> - Yellow dot at center of each person for easy identification</li>
            <li>• <strong>Stable tracking IDs</strong> - Each person keeps same ID (#1, #2, #3) across frames when possible</li>
            <li>• <strong>Current People</strong> - Live count of people visible in frame right now</li>
            <li>• <strong>Total Tracks</strong> - Number of tracking IDs created (may exceed unique people if tracking lost)</li>
            <li>• <strong>Peak Count</strong> - Maximum number of people detected at any one time</li>
            <li>• <strong>Works with uploaded videos, webcam, and demo images</strong></li>
            <li>• <strong>YouTube videos</strong> - Manual counting only (iframe restriction)</li>
          </ul>
          <div className="mt-3 p-3 bg-amber-500/10 border border-amber-500/30 rounded">
            <p className="text-xs text-amber-400">
              <strong>⚠️ Tracking Limitations:</strong> The system uses bounding-box tracking without facial recognition. 
              IDs may change if a person is occluded, leaves and re-enters the frame, or in very crowded scenes. 
              "Total Tracks" counts tracking IDs, not guaranteed unique people.
            </p>
          </div>
          <div className="mt-3 p-3 bg-emerald-500/10 border border-emerald-500/30 rounded">
            <p className="text-xs text-emerald-400">
              <strong>💡 Quick Start:</strong> Upload any crowd video → AI detects people with green boxes and yellow dots. 
              Each person gets a tracking ID that persists as they move. Current count updates in real-time!
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
