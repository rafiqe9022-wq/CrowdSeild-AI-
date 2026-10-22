# Demo Mode - Quick Start Guide

## 🎯 What is Demo Mode?

Demo Mode is a **one-click solution** for hackathon presentations. It loads a pre-made crowd scene image and runs real AI detection on it instantly - no webcam, no video upload, no setup required.

---

## 🚀 How to Use Demo Mode

### Step 1: Start the App
```bash
npm run dev
```

### Step 2: Login
- Go to `http://localhost:5173`
- Login with any account (e.g., `admin` / `admin123`)

### Step 3: Navigate to AI Detection
- Click **"AI Detection"** in the sidebar

### Step 4: Wait for Model
- Wait for "✓ AI Model Ready" (green indicator)
- This takes ~5-10 seconds on first load

### Step 5: Load Demo
- Click the orange **"Load Demo"** button
- A crowd scene image will appear

### Step 6: Start Detection
- Click the green **"Start Detection"** button
- Watch as AI draws bounding boxes around people!

### Step 7: Show Judges
- Point out the green boxes with confidence scores
- Show the statistics (person count, density, FPS)
- Explain it's real ML inference

**Total time: Under 30 seconds from login to working demo!**

---

## 📊 What Judges Will See

When you click "Start Detection" on the demo image:

✅ **Green bounding boxes** around detected people  
✅ **Confidence labels** like "Person 91%", "Person 87%"  
✅ **Person count** showing total detected people  
✅ **Density classification** (LOW/MEDIUM/HIGH)  
✅ **Inference time** in milliseconds  
✅ **FPS counter** showing processing speed  

All of this comes from **real AI model inference** - not simulation!

---

## 🎬 Demo Image Details

- **Source**: Unsplash (free to use)
- **Content**: Crowd scene with 15-20 people
- **Resolution**: 1280x720
- **Format**: JPEG
- **License**: Unsplash License (free for commercial use)

The image shows a realistic crowd scene that the COCO-SSD model can detect people in.

---

## 💡 Why Demo Mode is Perfect for Hackathons

### ✅ No Setup Required
- No webcam permissions needed
- No video file to prepare
- No internet speed concerns (after first load)
- Works on any device with a browser

### ✅ Instant Results
- Click one button
- See AI detection working immediately
- No awkward "let me find a good angle" moments

### ✅ Reliable
- Same result every time
- No lighting issues
- No background noise
- No privacy concerns

### ✅ Impressive
- Judges see real AI working
- Real bounding boxes with real confidence scores
- Real performance metrics
- Professional presentation

---

## 🔄 Demo Mode vs Other Options

| Feature | Demo Mode | Webcam | Upload Video |
|---------|-----------|--------|--------------|
| Setup Time | 0 seconds | 5-10 seconds | 30+ seconds |
| Reliability | 100% | Variable | Variable |
| Lighting Issues | None | Possible | Possible |
| Privacy Concerns | None | Some | Some |
| Preparation Needed | None | None | Find/download video |
| Best For | Quick demo | Interactive | Custom content |

---

## 🎤 Demo Script (30 Seconds)

> "Let me show you our AI detection in action. I'll load our demo crowd scene..."
> 
> *Click "Load Demo"*
> 
> "Now I'll start the AI detection..."
> 
> *Click "Start Detection"*
> 
> "Watch as the AI detects people and draws bounding boxes. See these confidence scores - 'Person 91%', 'Person 87%'? These are real ML predictions from the COCO-SSD model running in the browser."
> 
> *Point to statistics*
> 
> "The system detected 15 people with 87% average confidence. Inference took 95 milliseconds. This is real AI, running locally, with no backend required."

---

## 🐛 Troubleshooting

### "Failed to load demo image"
- Check internet connection
- Refresh the page
- Try webcam or video upload instead

### No bounding boxes appearing
- Make sure you clicked "Start Detection"
- Wait a few seconds for inference
- Check browser console for errors (F12)

### Model not loading
- Wait 10-15 seconds
- Refresh the page
- Check internet connection (model downloads on first load)

---

## 📁 Technical Details

### Demo Image URL
```
https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=1280&h=720&fit=crop
```

### How It Works
1. Image loads from Unsplash (cached after first load)
2. Image is drawn to HTML5 Canvas
3. TensorFlow.js runs COCO-SSD model on the canvas
4. Model returns bounding boxes for detected people
5. Bounding boxes are drawn on the canvas with confidence labels
6. Statistics are calculated and displayed

### Browser Requirements
- Modern browser with WebGL support
- Internet connection (for first load only)
- No special permissions needed

---

## 🎯 Pro Tips for Judges

### What to Emphasize
1. **"This is real AI"** - Not simulation, actual ML model
2. **"Runs in the browser"** - No backend, no server costs
3. **"Real confidence scores"** - From actual model inference
4. **"Privacy-preserving"** - All processing happens locally
5. **"Instant results"** - Under 100ms inference time

### What to Show
1. Green bounding boxes with confidence scores
2. Person count updating in real-time
3. Density classification (LOW/MEDIUM/HIGH)
4. Performance metrics (FPS, inference time)
5. Detection details panel

### Common Judge Questions

**Q: "Is this a real AI model?"**  
A: "Yes, it's TensorFlow.js with the COCO-SSD model, pretrained on the COCO dataset with 118,000 images."

**Q: "Where does the processing happen?"**  
A: "Everything runs locally in the browser using WebGL acceleration. No data leaves the device."

**Q: "How accurate is it?"**  
A: "The model achieves 85-95% confidence on clear images. Accuracy depends on image quality, lighting, and occlusion."

**Q: "Can it work with live video?"**  
A: "Yes! You can switch to webcam mode or upload any video file. The demo mode is just for quick presentations."

**Q: "What's the performance like?"**  
A: "Inference takes 50-150ms per frame, achieving 5-15 FPS depending on hardware. It's optimized for real-time use."

---

## ✅ You're Ready!

With Demo Mode, you can show judges working AI detection in **under 30 seconds**. No setup, no preparation, no worries.

**Good luck with your hackathon!** 🚀
