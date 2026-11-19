"use client";

import React, { useState, useRef } from "react";
import Link from "next/link";

const SPEECH_LOCALES: Record<string, string> = {
  Spanish: "es-ES", English: "en-US", French: "fr-FR", Portuguese: "pt-BR",
  German: "de-DE", Italian: "it-IT", Arabic: "ar-SA", "Chinese (Mandarin)": "zh-CN",
  Hindi: "hi-IN", Japanese: "ja-JP", Korean: "ko-KR", Russian: "ru-RU",
  Turkish: "tr-TR", Swahili: "sw-KE", Afrikaans: "af-ZA", Dutch: "nl-NL",
  Polish: "pl-PL", Swedish: "sv-SE", Norwegian: "no-NO", Danish: "da-DK",
  Finnish: "fi-FI", Greek: "el-GR", Czech: "cs-CZ", Romanian: "ro-RO",
  Ukrainian: "uk-UA", Vietnamese: "vi-VN", Indonesian: "id-ID", Malay: "ms-MY",
  "Filipino (Tagalog)": "fil-PH", Tamil: "ta-IN", Urdu: "ur-PK",
};

export default function VoiceStudioPage() {
  const [targetLang, setTargetLang] = useState("Spanish");
  const [voiceId, setVoiceId] = useState("");
  const [isCloning, setIsCloning] = useState(false);

  // Outbound (You: English -> Target Language)
  const [isSpeakingOut, setIsSpeakingOut] = useState(false);
  const [isProcessingOut, setIsProcessingOut] = useState(false);
  const [myEnglishText, setMyEnglishText] = useState("");
  const [outTranslatedText, setOutTranslatedText] = useState("");
  const [audioUrl, setAudioUrl] = useState("");
  const [outStatus, setOutStatus] = useState("Ready — click Start Speaking (English)");

  // Inbound (Caller: Target Language -> English for your headphones)
  const [isListeningCaller, setIsListeningCaller] = useState(false);
  const [callerForeignText, setCallerForeignText] = useState("");
  const [callerEnglishText, setCallerEnglishText] = useState("");
  const [inStatus, setInStatus] = useState("Ready — click Listen to Caller to hear them in English");

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Array<BlobPart>>(new Array());
  const outRecRef = useRef<any>(null);
  const callerRecRef = useRef<any>(null);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);

  const speakBrowserTTS = (text: string, lang: string) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = lang;
    window.speechSynthesis.speak(utter);
  };

  const handleCloneVoice = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.item(0);
    if (!file) return;
    setIsCloning(true);
    setOutStatus("Cloning your voice sample...");
    try {
      const fd = new FormData();
      fd.append("sample", file);
      fd.append("name", "Mighty AI Cloned Voice");
      const res = await fetch("/api/voice-clone", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Clone failed");
      setVoiceId(data.voiceId);
      setOutStatus(`Voice cloned! Active Voice ID: ${data.voiceId}`);
    } catch (err: any) {
      setOutStatus(`Clone Info: ${err.message}`);
    } finally {
      setIsCloning(false);
    }
  };

  // Outbound: You speak English -> translated to Target Language
  const startOutbound = async () => {
    setAudioUrl("");
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (SpeechRecognition) {
      const rec = new SpeechRecognition();
      rec.lang = "en-US";
      rec.interimResults = false;

      rec.onstart = () => {
        setIsSpeakingOut(true);
        setOutStatus("Listening to your English... Speak now!");
      };

      rec.onresult = async (ev: any) => {
        const spoken = ev.results?.item(0)?.item(0)?.transcript || "";
        setMyEnglishText(spoken);
        setIsSpeakingOut(false);
        setIsProcessingOut(true);
        setOutStatus(`Translating to ${targetLang}...`);

        try {
          const res = await fetch("/api/free-translate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ text: spoken, targetLang, direction: "to_target" }),
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error || "Translation failed");
          setOutTranslatedText(data.translatedText);
          setOutStatus(`Spoken in ${targetLang}!`);
          speakBrowserTTS(data.translatedText, SPEECH_LOCALES[targetLang] || data.langCode);
        } catch (err: any) {
          setOutStatus(`Error: ${err.message}`);
        } finally {
          setIsProcessingOut(false);
        }
      };

      rec.onerror = (e: any) => {
        setIsSpeakingOut(false);
        setOutStatus(`Mic Error: ${e.error}`);
      };
      rec.onend = () => setIsSpeakingOut(false);

      outRecRef.current = rec;
      rec.start();
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      chunksRef.current = new Array();
      recorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        setIsProcessingOut(true);
        try {
          const fd = new FormData();
          fd.append("audio", blob, "speech.webm");
          fd.append("targetLang", targetLang);
          if (voiceId) fd.append("voiceId", voiceId);
          const res = await fetch("/api/voice-translate", { method: "POST", body: fd });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error || "GPU Voice server offline");
          setMyEnglishText(data.originalText);
          setOutTranslatedText(data.translatedText);
          setAudioUrl(data.audioBase64);
          setOutStatus("Cloned voice output ready!");
          setTimeout(() => audioPlayerRef.current?.play().catch(() => {}), 100);
        } catch (err: any) {
          setOutStatus(`Error: ${err.message}`);
        } finally {
          setIsProcessingOut(false);
        }
      };
      mediaRecorderRef.current = recorder;
      recorder.start();
      setIsSpeakingOut(true);
    } catch {
      setOutStatus("Microphone permission denied.");
    }
  };

  const stopOutbound = () => {
    if (outRecRef.current) outRecRef.current.stop();
    if (mediaRecorderRef.current && isSpeakingOut) mediaRecorderRef.current.stop();
    setIsSpeakingOut(false);
  };

  // Inbound: Caller speaks Target Language -> translated to English for your headphones
  const startListeningCaller = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setInStatus("Use Google Chrome for live caller translation.");
      return;
    }

    const rec = new SpeechRecognition();
    rec.lang = SPEECH_LOCALES[targetLang] || "es-ES";
    rec.continuous = true;
    rec.interimResults = false;

    rec.onstart = () => {
      setIsListeningCaller(true);
      setInStatus(`Listening for ${targetLang}... Translating to English!`);
    };

    rec.onresult = async (ev: any) => {
      const lastIdx = ev.results.length - 1;
      const heard = ev.results?.item(lastIdx)?.item(0)?.transcript || "";
      if (!heard.trim()) return;
      setCallerForeignText(heard);
      setInStatus("Translating caller to English...");

      try {
        const res = await fetch("/api/free-translate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: heard, targetLang, direction: "to_english" }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Translation failed");
        setCallerEnglishText(data.translatedText);
        setInStatus(`Caller (${targetLang} → English): Active`);
        speakBrowserTTS(data.translatedText, "en-US");
      } catch (err: any) {
        setInStatus(`Error: ${err.message}`);
      }
    };

    rec.onerror = (e: any) => {
      setIsListeningCaller(false);
      setInStatus(`Listener stopped: ${e.error}`);
    };
    rec.onend = () => setIsListeningCaller(false);

    callerRecRef.current = rec;
    rec.start();
  };

  const stopListeningCaller = () => {
    if (callerRecRef.current) callerRecRef.current.stop();
    setIsListeningCaller(false);
    setInStatus("Caller listener paused.");
  };
  return (
    <div className="min-h-screen bg-zinc-950 text-white p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-800 pb-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              MIGHTY AI LIVE — Two-Way Voice Clone & Call Translator
            </h1>
            <p className="text-xs text-zinc-400">
              Speak English → Caller hears {targetLang} • Caller speaks {targetLang} → You hear English
            </p>
          </div>
          <Link href="/" className="px-4 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs font-semibold">
            ← Back to Video Studio
          </Link>
        </div>

        {/* Top Language & Voice Clone Bar */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
          <div>
            <label className="block text-xs text-zinc-400 mb-1">Caller / Stream Language (All 36)</label>
            <select
              value={targetLang}
              onChange={(e) => setTargetLang(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-sm"
            >
              <optgroup label="Popular & Global">
                <option value="Spanish">Spanish</option>
                <option value="French">French</option>
                <option value="Portuguese">Portuguese</option>
                <option value="German">German</option>
                <option value="Italian">Italian</option>
                <option value="Arabic">Arabic</option>
                <option value="Chinese (Mandarin)">Chinese (Mandarin)</option>
                <option value="Hindi">Hindi</option>
                <option value="Japanese">Japanese</option>
                <option value="Korean">Korean</option>
                <option value="Russian">Russian</option>
                <option value="Turkish">Turkish</option>
                <option value="English">English</option>
              </optgroup>
              <optgroup label="African Languages">
                <option value="Twi (Akan)">Twi (Akan)</option>
                <option value="Yoruba">Yoruba</option>
                <option value="Hausa">Hausa</option>
                <option value="Igbo">Igbo</option>
                <option value="Swahili">Swahili</option>
                <option value="Amharic">Amharic</option>
                <option value="Afrikaans">Afrikaans</option>
              </optgroup>
              <optgroup label="European & Asian">
                <option value="Dutch">Dutch</option>
                <option value="Polish">Polish</option>
                <option value="Swedish">Swedish</option>
                <option value="Norwegian">Norwegian</option>
                <option value="Danish">Danish</option>
                <option value="Finnish">Finnish</option>
                <option value="Greek">Greek</option>
                <option value="Czech">Czech</option>
                <option value="Romanian">Romanian</option>
                <option value="Ukrainian">Ukrainian</option>
                <option value="Vietnamese">Vietnamese</option>
                <option value="Indonesian">Indonesian</option>
                <option value="Malay">Malay</option>
                <option value="Filipino (Tagalog)">Filipino (Tagalog)</option>
                <option value="Tamil">Tamil</option>
                <option value="Urdu">Urdu</option>
              </optgroup>
            </select>
          </div>

          <div>
            <label className="block text-xs text-zinc-400 mb-1">Clone Your Voice (15–30s Audio)</label>
            <input
              type="file"
              accept="audio/*"
              onChange={handleCloneVoice}
              disabled={isCloning}
              className="w-full text-xs text-zinc-300 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:bg-indigo-600 file:text-white"
            />
          </div>

          <div>
            <label className="block text-xs text-zinc-400 mb-1">Active Cloned Voice ID</label>
            <input
              type="text"
              value={voiceId}
              onChange={(e) => setVoiceId(e.target.value)}
              placeholder="Auto-filled after cloning"
              className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-xs"
            />
          </div>
        </div>

        {/* Two-Way Translation Panels */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Panel 1: You -> Caller */}
          <div className="bg-zinc-900 border border-emerald-500/30 rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-base text-emerald-400">1. You → Caller (English → {targetLang})</h2>
              <span className="text-[11px] text-zinc-400">Outbound</span>
            </div>

            <div className="py-5 border border-dashed border-zinc-700 rounded-xl bg-zinc-950/60 text-center space-y-3">
              <p className="text-xs text-zinc-400 px-3">{outStatus}</p>
              {!isSpeakingOut ? (
                <button
                  onClick={startOutbound}
                  disabled={isProcessingOut}
                  className="px-6 py-3 rounded-full bg-emerald-600 hover:bg-emerald-500 font-semibold text-sm shadow-lg"
                >
                  {isProcessingOut ? "Translating..." : "🎙️ Speak English"}
                </button>
              ) : (
                <button
                  onClick={stopOutbound}
                  className="px-6 py-3 rounded-full bg-red-600 hover:bg-red-500 font-semibold text-sm animate-pulse"
                >
                  ⏹️ Stop Speaking
                </button>
              )}
            </div>

            <div className="space-y-2 text-xs">
              <div className="bg-zinc-950 border border-zinc-800 rounded-lg p-3">
                <span className="text-zinc-500 uppercase">You Said (English):</span>
                <p className="text-zinc-200 mt-1 min-h-[36px]">{myEnglishText || "Waiting for your voice..."}</p>
              </div>
              <div className="bg-zinc-950 border border-emerald-500/30 rounded-lg p-3">
                <span className="text-emerald-400 uppercase">Caller Hears ({targetLang}):</span>
                <p className="text-white font-medium mt-1 min-h-[36px]">{outTranslatedText || `Translated ${targetLang} appears here...`}</p>
              </div>
            </div>

            {audioUrl && <audio ref={audioPlayerRef} src={audioUrl} controls className="w-full" />}
          </div>

          {/* Panel 2: Caller -> You */}
          <div className="bg-zinc-900 border border-indigo-500/30 rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-base text-indigo-400">2. Caller → You ({targetLang} → English)</h2>
              <span className="text-[11px] text-zinc-400">Inbound to Headphones</span>
            </div>

            <div className="py-5 border border-dashed border-zinc-700 rounded-xl bg-zinc-950/60 text-center space-y-3">
              <p className="text-xs text-zinc-400 px-3">{inStatus}</p>
              {!isListeningCaller ? (
                <button
                  onClick={startListeningCaller}
                  className="px-6 py-3 rounded-full bg-indigo-600 hover:bg-indigo-500 font-semibold text-sm shadow-lg"
                >
                  🎧 Listen to Caller ({targetLang} → English)
                </button>
              ) : (
                <button
                  onClick={stopListeningCaller}
                  className="px-6 py-3 rounded-full bg-red-600 hover:bg-red-500 font-semibold text-sm animate-pulse"
                >
                  ⏹️ Stop Listening to Caller
                </button>
              )}
            </div>

            <div className="space-y-2 text-xs">
              <div className="bg-zinc-950 border border-zinc-800 rounded-lg p-3">
                <span className="text-zinc-500 uppercase">Caller Said ({targetLang}):</span>
                <p className="text-zinc-200 mt-1 min-h-[36px]">{callerForeignText || `Waiting for ${targetLang} speech...`}</p>
              </div>
              <div className="bg-zinc-950 border border-indigo-500/30 rounded-lg p-3">
                <span className="text-indigo-400 uppercase">You Hear (English):</span>
                <p className="text-white font-medium mt-1 min-h-[36px]">{callerEnglishText || "English translation spoken into your headphones..."}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
