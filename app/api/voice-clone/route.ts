export const runtime = 'edge';
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const incoming = await req.formData();
    const sampleFile = incoming.get("sample") as File | null;
    const voiceName = (incoming.get("name") as string)?.trim() || "Mighty AI Cloned Voice";
    const elevenLabsKey =
      (incoming.get("elevenLabsKey") as string)?.trim() ||
      process.env.ELEVENLABS_API_KEY?.trim();

    if (!sampleFile) {
      return NextResponse.json({ error: "Please select a voice sample first." }, { status: 400 });
    }

    if (!elevenLabsKey) {
      return NextResponse.json(
        { error: "Enter your ElevenLabs API key or add ELEVENLABS_API_KEY in .env.local." },
        { status: 400 }
      );
    }

    const cloneForm = new FormData();
    cloneForm.append("name", voiceName);
    cloneForm.append("files", sampleFile, sampleFile.name || "voice-sample.webm");
    cloneForm.append("description", "Cloned via MIGHTY AI LIVE Voice Studio");

    const res = await fetch("https://elevenlabs.io", {
      method: "POST",
      headers: { "xi-api-key": elevenLabsKey },
      body: cloneForm,
    });

    const data = await res.json();
    if (!res.ok || !data.voice_id) {
      return NextResponse.json(
        { error: data?.detail?.message || data?.detail || "Voice cloning failed." },
        { status: 502 }
      );
    }

    return NextResponse.json({ voiceId: data.voice_id });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Unexpected voice clone error." },
      { status: 500 }
    );
  }
}
