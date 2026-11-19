import { NextResponse } from "next/server";
import { Client } from "@gradio/client";

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const sourceImage = formData.get("source") as Blob | null;
    const targetFrame = formData.get("target") as Blob | null;

    if (!sourceImage || !targetFrame) {
      return NextResponse.json(
        { error: "Missing source face or camera frame" },
        { status: 400 }
      );
    }

    const hfToken = process.env.HF_TOKEN as `hf_${string}` | undefined;

    const client = await Client.connect("tonyassi/face-swap", {
      hf_token: hfToken,
    });

    const result = await client.predict("/swap_faces", {
      src_img: sourceImage,
      dest_img: targetFrame,
    });

    const outputData = result.data as Array<{ url?: string } | string>;
    const firstItem = outputData?.at(0);
    const swappedUrl =
      typeof firstItem === "string" ? firstItem : firstItem?.url;

    if (!swappedUrl) {
      return NextResponse.json(
        { error: "AI server returned empty result" },
        { status: 502 }
      );
    }

    return NextResponse.json({ url: swappedUrl });
  } catch (err: any) {
    console.error("HF Swap Error:", err);
    return NextResponse.json(
      { error: err?.message || "Hugging Face Space is busy—try again in a moment" },
      { status: 500 }
    );
  }
}
