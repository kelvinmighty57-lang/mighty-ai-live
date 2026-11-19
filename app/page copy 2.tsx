"use client";

import { useState, useRef, useEffect } from "react";
let faceapi: typeof import("@vladmandic/face-api");

export default function Home() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const loopRef = useRef<number | null>(null);

  const [cameraOn, setCameraOn] = useState(false);
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [trackingOn, setTrackingOn] = useState(false);
  const [error, setError] = useState("");
  const [faceImage, setFaceImage] = useState("");
  const [status, setStatus] = useState("LOADING AI...");
  const [styleMode, setStyleMode] = useState("Face Swap");

  useEffect(() => {
    const loadModels = async () => {
              faceapi = await import("@vladmandic/face-api");
      try {
        await Promise.all([
          faceapi.nets.tinyFaceDetector.loadFromUri("/models"),
          faceapi.nets.faceLandmark68Net.loadFromUri("/models"),
        ]);
        setModelsLoaded(true);
        setStatus("IDLE");
      } catch (err) {
        setError("Failed to load AI models from /models");
        console.error(err);
      }
    };
    loadModels();
    return () => { if (loopRef.current) cancelAnimationFrame(loopRef.current); };
  }, []);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" }, audio: false });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setCameraOn(true);
        setStatus("LIVE");
        setError("");
      }
    } catch (err) {
      setError("Camera access denied or not available");
      console.error(err);
    }
  };

  const stopCamera = () => {
    if (loopRef.current) cancelAnimationFrame(loopRef.current);
    setTrackingOn(false);
    const stream = videoRef.current?.srcObject as MediaStream | null;
    stream?.getTracks().forEach((t) => t.stop());
    if (videoRef.current) videoRef.current.srcObject = null;
    setCameraOn(false);
    setStatus("IDLE");
  };

  const detectFace = async () => {
    if (!cameraOn || !videoRef.current || !canvasRef.current) {
      alert("Please click Start Camera first!");
      return;
    }
    if (!modelsLoaded) {
      alert("AI models are still loading, wait 2 seconds!");
      return;
    }

    setTrackingOn(true);
    setStatus("TRACKING FACE");

    const video = videoRef.current;
    const canvas = canvasRef.current;

    const renderLoop = async () => {
      if (!video || video.paused || video.ended) return;
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      const ctx = canvas.getContext("2d");

      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const detection = await faceapi
          .detectSingleFace(video, new faceapi.TinyFaceDetectorOptions())
          .withFaceLandmarks();

        if (detection) {
          const resized = faceapi.resizeResults(detection, { width: canvas.width, height: canvas.height });
          faceapi.draw.drawDetections(canvas, resized);
          faceapi.draw.drawFaceLandmarks(canvas, resized);
        }
      }
      loopRef.current = requestAnimationFrame(renderLoop);
    };

    renderLoop();
  };

  return (
    <div style={{ backgroundColor: "#0a0a0c", minHeight: "100vh", color: "#f4f4f5", fontFamily: "sans-serif", display: "flex", flexDirection: "column" }}>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 24px", borderBottom: "1px solid #1f1f23", backgroundColor: "#0f0f12" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <span style={{ background: "linear-gradient(135deg,#ec4899,#8b5cf6)", padding: "4px 10px", borderRadius: "6px", fontWeight: "bold" }}>M</span>
          <strong style={{ fontSize: "16px" }}>MIGHTY AI LIVE</strong>
          <span style={{ fontSize: "11px", padding: "2px 8px", borderRadius: "4px", backgroundColor: "#1e1b4b", color: "#a78bfa" }}>LIVE STUDIO</span>
        </div>
        <span style={{ fontSize: "12px", padding: "4px 12px", borderRadius: "999px", backgroundColor: cameraOn ? "#064e3b" : "#18181b", color: cameraOn ? "#34d399" : "#a1a1aa" }}>
          ● {status}
        </span>
      </header>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 24px", borderBottom: "1px solid #1f1f23", backgroundColor: "#111114" }}>
        <div style={{ display: "flex", gap: "10px" }}>
          <button onClick={startCamera} disabled={cameraOn} style={{ padding: "8px 16px", backgroundColor: cameraOn ? "#27272a" : "#e11d48", color: "white", border: "none", borderRadius: "6px", cursor: "pointer", fontWeight: "600" }}>
            ▶ Start Camera
          </button>
          <button onClick={stopCamera} disabled={!cameraOn} style={{ padding: "8px 16px", backgroundColor: "#18181b", color: cameraOn ? "white" : "#52525b", border: "1px solid #27272a", borderRadius: "6px", cursor: "pointer" }}>
            ■ Stop
          </button>
          <button onClick={detectFace} style={{ padding: "8px 16px", backgroundColor: "#16a34a", color: "white", border: "none", borderRadius: "6px", cursor: "pointer", fontWeight: "600" }}>
            ⚡ Swap Face (Beta)
          </button>
        </div>
        <span style={{ fontSize: "12px", color: "#a1a1aa" }}>Mode: <strong style={{ color: "white" }}>{styleMode}</strong></span>
      </div>

      {error && <div style={{ backgroundColor: "#450a0a", color: "#fca5a5", padding: "8px 24px", fontSize: "13px" }}>⚠ {error}</div>}

      <div style={{ display: "grid", gridTemplateColumns: "280px 1fr", flex: 1 }}>
        <aside style={{ borderRight: "1px solid #1f1f23", backgroundColor: "#0e0e11", padding: "16px", display: "flex", flexDirection: "column", gap: "18px" }}>
          <div>
            <div style={{ fontSize: "11px", fontWeight: "700", color: "#a1a1aa", marginBottom: "8px" }}>TRANSFORM MODE</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
              {["Face Swap", "Cinema", "Anime", "Cyberpunk"].map((m) => (
                <button key={m} onClick={() => setStyleMode(m)} style={{ padding: "6px 10px", fontSize: "12px", borderRadius: "6px", border: styleMode === m ? "1px solid #ec4899" : "1px solid #27272a", backgroundColor: styleMode === m ? "#3b0764" : "#18181b", color: "white", cursor: "pointer" }}>
                  {m}
                </button>
              ))}
            </div>
          </div>

          <div>
            <div style={{ fontSize: "11px", fontWeight: "700", color: "#a1a1aa", marginBottom: "8px" }}>CHARACTER REFERENCE FACE</div>
            <input ref={fileInputRef} type="file" accept="image/*" style={{ display: "none" }} onChange={(e) => { const f = e.target.files?.item(0); if (f) setFaceImage(URL.createObjectURL(f)); }} />
            <div onClick={() => fileInputRef.current?.click()} style={{ border: "1px dashed #3f3f46", borderRadius: "10px", padding: "14px", textAlign: "center", backgroundColor: "#141418", cursor: "pointer" }}>
              {faceImage ? (
                <div>
                  <img src={faceImage} alt="Uploaded Face" style={{ width: "100%", maxHeight: "200px", objectFit: "cover", borderRadius: "8px", marginBottom: "8px" }} />
                  <span style={{ fontSize: "12px", color: "#60a5fa" }}>Click to change face</span>
                </div>
              ) : (
                <div style={{ padding: "20px 6px" }}>
                  <div style={{ fontSize: "24px", marginBottom: "6px" }}>🖼️</div>
                  <div style={{ fontSize: "13px", fontWeight: "600" }}>Upload Target Face</div>
                  <div style={{ fontSize: "11px", color: "#71717a", marginTop: "4px" }}>Click to select photo</div>
                </div>
              )}
            </div>
          </div>

          <button onClick={detectFace} style={{ marginTop: "auto", width: "100%", padding: "12px", background: "linear-gradient(90deg,#2563eb,#7c3aed)", color: "white", border: "none", borderRadius: "8px", fontWeight: "700", cursor: "pointer" }}>
            Run Face Detection & Swap
          </button>
        </aside>

        <main style={{ padding: "18px", display: "flex", flexDirection: "column", gap: "14px", backgroundColor: "#09090b" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", flex: 1 }}>
            <div style={{ backgroundColor: "#121215", border: "1px solid #27272a", borderRadius: "12px", display: "flex", flexDirection: "column", overflow: "hidden" }}>
              <div style={{ padding: "10px 14px", borderBottom: "1px solid #1f1f23", display: "flex", justifyContent: "space-between", fontSize: "11px", fontWeight: "700", color: "#a1a1aa" }}>
                <span>INPUT — CAMERA</span>
                <span style={{ color: cameraOn ? "#34d399" : "#71717a" }}>{cameraOn ? "WEBCAM ON" : "OFFLINE"}</span>
              </div>
              <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "#070709", minHeight: "340px" }}>
                <video ref={videoRef} autoPlay playsInline muted style={{ width: "100%", height: "100%", objectFit: "cover", display: cameraOn ? "block" : "none" }} />
                {!cameraOn && <div style={{ textAlign: "center", color: "#52525b", fontSize: "13px" }}>📷 Click <strong>Start Camera</strong> above</div>}
              </div>
            </div>

            <div style={{ backgroundColor: "#121215", border: "1px solid #27272a", borderRadius: "12px", display: "flex", flexDirection: "column", overflow: "hidden" }}>
              <div style={{ padding: "10px 14px", borderBottom: "1px solid #1f1f23", display: "flex", justifyContent: "space-between", fontSize: "11px", fontWeight: "700", color: "#a1a1aa" }}>
                <span>OUTPUT — AI REALTIME TRANSFORM</span>
                                <span style={{ color: trackingOn ? "#34d399" : "#a78bfa" }}>{trackingOn ? "AI TRACKING LIVE" : "CANVAS READY"}</span>
              </div>
              <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "#070709", minHeight: "340px" }}>
                <canvas ref={canvasRef} style={{ width: "100%", height: "100%", objectFit: "cover", display: trackingOn ? "block" : "none" }} />
                {!trackingOn && (
                  <div style={{ textAlign: "center", color: "#71717a", fontSize: "13px", padding: "20px" }}>
                    ✨ AI Output Screen — Click <strong>Start Camera</strong> then <strong>Swap Face (Beta)</strong>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div style={{ backgroundColor: "#121215", border: "1px solid #27272a", borderRadius: "8px", padding: "10px 16px", fontSize: "12px", color: "#71717a", display: "flex", justifyContent: "space-between" }}>
            <span><strong>MIGHTY AI LIVE Studio:</strong> {modelsLoaded ? "AI Face Models Loaded ✓" : "Loading AI Models..."}</span>
            <span>v1.0 Beta</span>
          </div>
        </main>
      </div>
    </div>
  );
}
