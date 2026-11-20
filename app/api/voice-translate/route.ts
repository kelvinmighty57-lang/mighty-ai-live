import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const audioFile = formData.get("audio") as File | null;
    const targetLang = (formData.get("targetLang") as string) || "Spanish";
    const voiceId =
      (formData.get("voiceId") as string)?.trim() ||
      process.env.ELEVENLABS_VOICE_ID?.trim() ||
      "21m00Tcm4TlvDq8ikWAM";

    const openAiKey =
      (formData.get("openAiKey") as string)?.trim() ||
      process.env.OPENAI_API_KEY?.trim();
    const elevenLabsKey =
      (formData.get("elevenLabsKey") as string)?.trim() ||
      process.env.ELEVENLABS_API_KEY?.trim();

    if (!audioFile) {
      return NextResponse.json({ error: "No microphone audio received." }, { status: 400 });
    }

    if (!openAiKey || !elevenLabsKey) {
      return NextResponse.json(
        {
          error:
            "Missing API keys. Add OPENAI_API_KEY and ELEVENLABS_API_KEY in .env.local or paste your keys in the studio.",
        },
        { status: 400 }
      );
    }

    // 1. Speech-to-Text (Transcribe spoken English)
    const sttForm = new FormData();
    sttForm.append("file", audioFile, "speech.webm");
    sttForm.append("model", "whisper-1");

    const sttRes = await fetch("https://openai.com", {
      method: "POST",
      headers: { Authorization: `Bearer ${openAiKey}` },
      body: sttForm,
    });

    const sttData = await sttRes.json();
    if (!sttRes.ok || !sttData.text) {
      return NextResponse.json(
        { error: sttData?.error?.message || "Speech transcription failed." },
        { status: 502 }
      );
    }
    const originalText = sttData.text.trim();

    // 2. Translate into natural conversational target language
    const trRes = await fetch("https://openai.com", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${openAiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        temperature: 0.3,
        messages: [
          {
            role: "system",
            content: `You are a real-time live call translator. Translate the user's speech naturally and accurately into ${targetLang}. Output ONLY the translated text with no quotes or explanations.`,
          },
          { role: "user", content: originalText },
        ],
      }),
    });

    const trData = await trRes.json();
    const translatedText = trData?.choices?.at(0)?.message?.content?.trim();
    if (!trRes.ok || !translatedText) {
      return NextResponse.json(
        { error: "Translation step failed." },
        { status: 502 }
      );
    }

    // 3. Speak translated text in Cloned Voice via ElevenLabs Turbo v2.5
    const ttsRes = await fetch(
      `https://elevenlabs.io{encodeURIComponent(voiceId)}`,
      {
        method: "POST",
        headers: {
          "xi-api-key": elevenLabsKey,
          "Content-Type": "application/json",
          Accept: "audio/mpeg",
        },
        body: JSON.stringify({
          text: translatedText,
          model_id: "eleven_turbo_v2_5",
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.85,
          },
        }),
      }
    );

    if (!ttsRes.ok) {
      const errText = await ttsRes.text();
      return NextResponse.json(
        { error: `ElevenLabs voice synthesis failed: ${errText}` },
        { status: 502 }
      );
    }

    const audioBuffer = await ttsRes.arrayBuffer();
    const audioBase64 = Buffer.from(audioBuffer).toString("base64");

    return NextResponse.json({
      originalText,
      translatedText,
      audioBase64: `data:audio/mpeg;base64,${audioBase64}`,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Unexpected voice translation error." },
      { status: 500 }
    );
  }
}