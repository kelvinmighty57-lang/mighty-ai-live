"use client";

import { useState, useRef } from "react";
import * as faceapi from "face-api.js";

  const detectFace = async () => {
console.log(faceapi);
alert("Face Detection Ready!");
};

export default function Home() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [cameraOn, setCameraOn] = useState(false);
  const [error, setError] = useState("");
const [faceImage, setFaceImage] = useState("");
const [status, setStatus] = useState("Ready");
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user" },
        audio: false,
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setCameraOn(true);
        setError("");
      }
    } catch (err) {
      setError("Camera access denied or not available");
      console.error(err);
    }
  };

  return (
    <div
      style={{
        textAlign: "center",
        padding: "40px",
        backgroundColor: "black",
        minHeight: "100vh",
        color: "white",
      }}
    >
      <h1 style={{ fontSize: "80px", marginBottom: "10px" }}>MIGHTY AI LIVE</h1>
      <p style={{ fontSize: "28px", marginBottom: "40px" }}>
        AI Powered Live Face Swap Platform
      </p>

      {!cameraOn && (
        <button
          onClick={startCamera}
          style={{
            padding: "20px 40px",
            backgroundColor: "#2563eb",
            color: "white",
            fontSize: "22px",
            border: "none",
            borderRadius: "10px",
            cursor: "pointer",
            fontWeight: "bold",
          }}
        >
          Start Camera
        </button> 
      )}

      {error && (
        <p style={{ color: "#f87171", marginTop: "20px" }}>{error}</p>
      )}
     <input
  type="file"
  accept="image/*"
  onChange={(e) => {
    const file = e.target.files?.[0];
    if (file) {
      setFaceImage(URL.createObjectURL(file));
    }
  }}
/>{faceImage && (
  <img
    src={faceImage}
    alt="Uploaded Face"
    style={{
      width: "250px",
      marginTop: "20px",
      borderRadius: "12px"
    }}
  />
)} <div style={{ marginTop: "20px" }}>
  <button onClick={detectFace}
    style={{
      padding: "15px 30px",
      backgroundColor: "green",
      color: "white",
      border: "none",
      borderRadius: "10px",
      cursor: "pointer",
      fontWeight: "bold",
    }}
  >
   Swap Face (Beta)
  </button> 
</div>

      <div style={{ marginTop: "40px" }}>
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          style={{
            width: "640px",
            maxWidth: "100%",
            borderRadius: "12px",
            border: cameraOn ? "3px solid #2563eb" : "none",
            display: cameraOn ? "block" : "none",
            margin: "0 auto",
          }}
        />
      </div>
    </div>
  );
}