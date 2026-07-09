import { NextRequest, NextResponse } from "next/server";

const BOSON_API_KEY = process.env.BOSON_API_KEY;
const TTS_VOICE = "nora";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    const text = typeof body?.text === "string" ? body.text.trim() : "";

    if (!text) {
      return NextResponse.json({ error: "No text provided" }, { status: 400 });
    }

    if (text.length > 1000) {
      return NextResponse.json(
        { error: "Text too long (max 1000 characters)" },
        { status: 400 }
      );
    }

    if (!BOSON_API_KEY) {
      return NextResponse.json({ error: "TTS not configured" }, { status: 500 });
    }

    const res = await fetch("https://api.boson.ai/v1/audio/speech", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${BOSON_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "higgs-tts-3",
        voice: TTS_VOICE,
        input: text,
        response_format: "mp3",
      }),
    });

    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      console.error("Boson TTS error:", res.status, detail);
      return NextResponse.json(
        { error: `TTS request failed: ${res.status}` },
        { status: 500 }
      );
    }

    const audioBuffer = await res.arrayBuffer();
    return new NextResponse(audioBuffer, {
      status: 200,
      headers: { "Content-Type": "audio/mpeg" },
    });
  } catch (err) {
    console.error("TTS error:", err);
    return NextResponse.json({ error: "Text-to-speech failed" }, { status: 500 });
  }
}
