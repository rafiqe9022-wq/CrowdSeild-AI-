# 🎯 Quick Start Guide - AI Detection Demo Mode

## ✅ Demo Mode is Ready!

You no longer need to upload a video. The AI Detection page now includes a **built-in demo mode** with an AI-generated crowd scene.

---

## 🚀 How to Use (3 Simple Steps)

### Step 1: Start the App
```bash
npm run dev
```
Open your browser to `http://localhost:5173`

### Step 2: Login
Click any demo account:
- `admin` / `admin123`
- `operator` / `operator123`
- etc.

### Step 3: Go to AI Detection
1. Click **"AI Detection"** in the sidebar (second item)
2. Wait for "✓ AI Model Ready" (first time only, ~10 seconds)
3. Click **"Load Demo"** button (orange button)
4. Click **"Start Detection"** button (green button)

**That's it!** You'll see:
- ✅ Green bounding boxes around detected people
- ✅ Confidence scores (e.g., "Person 87%")
- ✅ Person count
- ✅ Crowd density level
- ✅ FPS and inference time

---

## 🎨 What You'll See

The demo uses an **AI-generated crowd scene** with multiple people. The real TensorFlow.js COCO-SSD model will:

1. **Detect people** in the image
2. **Draw green boxes** around each person
3. **Show confidence scores** from the actual ML model
4. **Count people** and classify crowd density
5. **Display performance metrics** (FPS, inference time)

---

## 📊 Demo Script for Judges (2 minutes)

**30 seconds - Introduction:**
> "This is our AI-powered crowd detection system using real machine learning."

**30 seconds - Load Demo:**
> "I'll load our built-in demo crowd scene. Watch as the AI model detects people."
> 
> *Click "Load Demo" button*

**30 seconds - Start Detection:**
> "Now I'll start the detection. You'll see green bounding boxes appear around each detected person with confidence scores from the actual ML model."
> 
> *Click "Start Detection" button*
> 
> *Point to the boxes and scores*

**30 seconds - Show Results:**
> "The system detected [X] people with an average confidence of [Y]%. The crowd density is classified as [LOW/MEDIUM/HIGH]. All processing happens locally in the browser using TensorFlow.js."

---

## 🔄 Alternative Options

If you want to use your own content:

### Option 1: Webcam
- Click **"Use Webcam"** button
- Allow camera permissions
- Point camera at people

### Option 2: Upload Video
- Click **"Upload Video"** button
- Select an MP4 file (max 100MB)
- Download free crowd videos from:
  - https://www.pexels.com/videos/ (search "crowd")
  - https://pixabay.com/videos/ (search "people")

---

## 🐛 Troubleshooting

### "Failed to load demo image"
- Check your internet connection
- The demo image is hosted online (~1MB)
- Try refreshing the page
- Or use "Upload Video" instead

### "Failed to load AI model"
- First-time load downloads ~5MB model
- Check internet connection
- Refresh the page
- Try a different browser (Chrome recommended)

### No detections showing
- Make sure you clicked "Start Detection"
- Wait a few seconds for processing
- The demo image has people, so detections should appear

---

## ✨ Key Features to Highlight

1. **Real ML Model** - TensorFlow.js COCO-SSD, not simulation
2. **Browser-Based** - No backend required, runs locally
3. **Visible Results** - Real bounding boxes with confidence scores
4. **Performance Metrics** - FPS and inference time shown
5. **Crowd Analysis** - Automatic density classification
6. **Privacy** - All processing happens in the browser

---

## 🎉 You're Ready!

The demo mode works out of the box. No video upload needed. Just:

1. `npm run dev`
2. Login
3. AI Detection → Load Demo → Start Detection

**Good luck with your hackathon!** 🚀
