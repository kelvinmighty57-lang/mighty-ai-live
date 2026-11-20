export const runtime = 'edge';
import { NextRequest, NextResponse } from "next/server";
import dns from "node:dns";

dns.setDefaultResultOrder("ipv4first");

const LANG_CODES: Record<string, string> = {
  Spanish: "es", English: "en", French: "fr", Portuguese: "pt", German: "de",
  Italian: "it", Arabic: "ar", "Chinese (Mandarin)": "zh-CN", Hindi: "hi",
  Japanese: "ja", Korean: "ko", Russian: "ru", Turkish: "tr",
  "Twi (Akan)": "ak", Yoruba: "yo", Hausa: "ha", Igbo: "ig", Swahili: "sw",
  Amharic: "am", Afrikaans: "af", Dutch: "nl", Polish: "pl", Swedish: "sv",
  Norwegian: "no", Danish: "da", Finnish: "fi", Greek: "el", Czech: "cs",
  Romanian: "ro", Ukrainian: "uk", Vietnamese: "vi", Indonesian: "id",
  Malay: "ms", "Filipino (Tagalog)": "tl", Tamil: "ta", Urdu: "ur",
};

export async function POST(req: NextRequest) {
  try {
    const { text, targetLang, direction } = await req.json();
    if (!text?.trim()) {
      return NextResponse.json({ error: "No text provided." }, { status: 400 });
    }

    const foreignCode = LANG_CODES[targetLang] || "es";
    const sl = direction === "to_english" ? foreignCode : "en";
    const tl = direction === "to_english" ? "en" : foreignCode;

    // Primary: Google Translate free endpoint
    try {
      const params = new URLSearchParams({
        client: "gtx",
        sl,
        tl,
        dt: "t",
        q: text.trim(),
      });

          const res = await fetch(
    `https://googleapis.com{params.toString()}`,
      {
        headers: { "User-Agent": "Mozilla/5.0" },
        cache: "no-store",
      }
    );

    if (res.ok) {
      const data = await res.json();
      const parts = Array.isArray(data?.at(0)) ? data.at(0) : [];
      const translatedText = parts.map((p: any) => p?.at(0) || "").join("").trim();
      if (translatedText) {
        return NextResponse.json({ translatedText, langCode: tl, sourceCode: sl });
      }
    }
  } catch {
    // Fall through to backup translator
  }

  // Fallback: MyMemory Translation API
  const mmRes = await fetch(
    `https://translated.net{encodeURIComponent(text.trim())}&langpair=${sl}|${tl}`,
    { cache: "no-store" }
  );
  const mmData = await mmRes.json();
  const fallbackText = mmData?.responseData?.translatedText?.trim();


    if (!fallbackText) {
      return NextResponse.json({ error: "Translation failed." }, { status: 502 });
    }

    return NextResponse.json({ translatedText: fallbackText, langCode: tl, sourceCode: sl });
  } catch (err: any) {
    console.error("Translate route error:", err);
    return NextResponse.json(
      { error: err?.cause?.message || err?.message || "Unexpected error." },
      { status: 500 }
    );
  }
}
