"use client";
import React, { useRef, useState } from "react";
import Link from "next/link";


export default function Home() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const targetFileRef = useRef<File | null>(null);
  const autoTimerRef = useRef<NodeJS.Timeout | null>(null);

  const [cameraOn, setCameraOn] = useState(false);
  const [swapping, setSwapping] = useState(false);
  const [autoLoop, setAutoLoop] = useState(false);
  const [facePreview, setFacePreview] = useState<string | null>(null);
  const [resultReady, setResultReady] = useState(false);
  const [status, setStatus] = useState("IDLE");
  const [error, setError] = useState("");

  const handleUpload = (file: File) => {
    targetFileRef.current = file;
    setFacePreview(URL.createObjectURL(file));
    setStatus("TARGET FACE READY ✓");
    setError("");
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: 640, height: 480 },
        audio: false,
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setCameraOn(true);
        setStatus("CAMERA LIVE");
        setError("");
      }
    } catch (err) {
      setError("Camera access denied or unavailable");
      console.error(err);
    }
  };

  const stopAll = () => {
    if (autoTimerRef.current) clearInterval(autoTimerRef.current);
    setAutoLoop(false);
    setSwapping(false);
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach((t) => t.stop());
      videoRef.current.srcObject = null;
    }
    setCameraOn(false);
    setStatus("STOPPED");
  };

  const runRealisticFaceSwap = async () => {
    if (!cameraOn || !videoRef.current || !canvasRef.current) {
      setError("Please click Start Camera first!");
      return;
    }
    if (!targetFileRef.current) {
      setError("Please upload a clear front-facing Target Photo on the left first!");
      return;
    }
    if (swapping) return;

    setSwapping(true);
    setError("");
    setStatus("AI SWAPPING (3-6s)...");

    try {
      const video = videoRef.current;
      const snapCanvas = document.createElement("canvas");
      snapCanvas.width = video.videoWidth || 640;
      snapCanvas.height = video.videoHeight || 480;
      const sctx = snapCanvas.getContext("2d");
      if (!sctx) return;
      sctx.drawImage(video, 0, 0, snapCanvas.width, snapCanvas.height);

      const frameBlob = await new Promise<Blob | null>((res) =>
        snapCanvas.toBlob(res, "image/jpeg", 0.92)
      );
      if (!frameBlob) return;

      const formData = new FormData();
      formData.append("source", targetFileRef.current);
      formData.append("target", frameBlob, "frame.jpg");

      const response = await fetch("/api/swap", { method: "POST", body: formData });
      const data = await response.json();

      if (!response.ok || !data.url) {
        setError(data.error || "Face not clear—turn on a front light and try again.");
        setStatus("RETRY SWAP");
        return;
      }

      const resultImg = new Image();
      resultImg.crossOrigin = "anonymous";
      resultImg.src = data.url;
      await new Promise((res, rej) => {
        resultImg.onload = res;
        resultImg.onerror = rej;
      });

      const outCanvas = canvasRef.current;
      outCanvas.width = resultImg.width;
      outCanvas.height = resultImg.height;
      const octx = outCanvas.getContext("2d");
      if (octx) {
        octx.drawImage(resultImg, 0, 0, outCanvas.width, outCanvas.height);
        setResultReady(true);
      }
      setStatus("REALISTIC SWAP ✓");
    } catch (err) {
      console.error(err);
      setError("Connection busy—click Swap Face again.");
      setStatus("RETRY SWAP");
    } finally {
      setSwapping(false);
    }
  };

  const toggleLiveAutoSwap = () => {
    if (autoLoop) {
      if (autoTimerRef.current) clearInterval(autoTimerRef.current);
      setAutoLoop(false);
      setStatus("LIVE LOOP PAUSED");
    } else {
      setAutoLoop(true);
      runRealisticFaceSwap();
      autoTimerRef.current = setInterval(() => {
        runRealisticFaceSwap();
      }, 5000);
    }
  };

  const downloadSwap = () => {
    if (!canvasRef.current || !resultReady) return;
    const link = document.createElement("a");
    link.download = "mighty-ai-swap.png";
    link.href = canvasRef.current.toDataURL("image/png");
    link.click();
  };

  return (
    <main className="min-h-screen bg-[#070B0E] text-white flex flex-col">
      <header className="flex flex-wrap items-center justify-between gap-3 px-6 py-4 border-b border-white/10 bg-[#0B1015]">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center font-bold text-emerald-400">
            M
          </div>
          <h1 className="font-bold tracking-wider text-sm md:text-base">
            MIGHTY AI LIVE{" "}
            <span className="text-xs px-2 py-0.5 ml-2 rounded bg-indigo-500/20 text-indigo-300">
              PHOTOREAL STUDIO
            </span>
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link
  href="/voice"
  className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold transition"
>
  🎙️ Voice Clone & Translator
</Link>
          <button
            onClick={startCamera}
            className="px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-sm font-medium transition"
          >
            ▶ Start Camera
          </button>
          <button
            onClick={stopAll}
            className="px-4 py-2 rounded-lg bg-white/10 hover:bg-red-500/30 text-sm font-medium transition"
          >
            ■ Stop
          </button>
          <button
            onClick={runRealisticFaceSwap}
            disabled={swapping}
            className="px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-black font-semibold text-sm transition"
          >
            {swapping ? "⏳ Swapping..." : "⚡ Swap Face Now"}
          </button>
          <button
            onClick={toggleLiveAutoSwap}
            className={`px-4 py-2 rounded-lg font-semibold text-sm transition ${
              autoLoop
                ? "bg-amber-500 text-black"
                : "bg-indigo-500 hover:bg-indigo-400 text-white"
            }`}
          >
            {autoLoop ? "⏸ Stop Live Loop" : "🔄 Auto Live Loop"}
          </button>
          {resultReady && (
            <button
              onClick={downloadSwap}
              className="px-3 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-medium transition"
            >
              ⬇ Save Photo
            </button>
          )}
        </div>

        <div className="text-xs px-3 py-1.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
          ● {status}
        </div>
      </header>

      {error && (
        <div className="bg-amber-500/20 border-b border-amber-500/40 text-amber-200 px-6 py-2.5 text-xs">
          ⚠️ {error}
        </div>
      )}

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12">
        <aside className="lg:col-span-3 border-r border-white/10 p-5 flex flex-col justify-between bg-[#090D11]">
          <div className="space-y-5">
            <div>
              <p className="text-[11px] uppercase tracking-widest text-gray-400 mb-3">
                1. Upload Clear Target Face
              </p>
              <label className="block cursor-pointer border-2 border-dashed border-white/15 hover:border-emerald-400/50 rounded-xl p-4 text-center transition bg-white/[0.02]">
                {facePreview ? (
                  <img
                    src={facePreview}
                    alt="Target Face"
                    className="w-full h-52 object-cover rounded-lg mx-auto"
                  />
                ) : (
                  <div className="py-12 text-gray-400 text-xs">
                    Upload a clear front-facing portrait photo
                  </div>
                )}
                <span className="inline-block mt-3 text-xs text-emerald-400 font-medium">
                  {facePreview ? "Click to change photo" : "+ Select Target Photo"}
                </span>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleUpload(f);
                  }}
                />
              </label>
            </div>

            <div className="rounded-xl bg-white/[0.03] border border-white/10 p-3.5 text-xs text-gray-300 space-y-1.5">
              <p className="font-semibold text-white">Best Results Tip:</p>
              <p>• Keep a front light on your face so eyes and nose are bright.</p>
              <p>• Use a clear, close-up front-facing portrait photo.</p>
            </div>
          </div>

          <button
            onClick={runRealisticFaceSwap}
            disabled={swapping}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-indigo-600 font-semibold text-sm shadow-lg hover:opacity-95 disabled:opacity-50 transition mt-6"
          >
            {swapping ? "Swapping Face..." : "⚡ Swap Face Now"}
          </button>
        </aside>

        <section className="lg:col-span-9 grid grid-cols-1 md:grid-cols-2 gap-4 p-5">
          <div className="rounded-2xl border border-white/10 bg-[#0B1015] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/10 text-xs text-gray-400">
              <span>INPUT — LIVE CAMERA</span>
              <span className="text-emerald-400">{cameraOn ? "WEBCAM ON" : "OFFLINE"}</span>
            </div>
                        <div className="relative flex-1 min-h-[360px] flex items-center justify-center bg-black">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />
              {!cameraOn && (
                <p className="absolute text-xs text-gray-500">Click Start Camera above</p>
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-[#0B1015] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/10 text-xs text-gray-400">
              <span>OUTPUT — PHOTOREALISTIC AI SWAP</span>
              <span className="text-indigo-400">{resultReady ? "SWAPPED ✓" : "STANDBY"}</span>
            </div>
            <div className="relative flex-1 min-h-[360px] flex items-center justify-center bg-black">
              <canvas ref={canvasRef} className="w-full h-full object-cover" />
              {!resultReady && (
                <p className="absolute text-xs text-gray-500">
                  Start camera, upload target photo & click Swap Face Now
                </p>
              )}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

