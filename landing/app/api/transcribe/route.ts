import { NextRequest, NextResponse } from "next/server";

const REPLICATE_TOKEN = process.env.REPLICATE_API_TOKEN;

async function pollPrediction(id: string): Promise<string> {
  for (let i = 0; i < 30; i++) {
    await new Promise(r => setTimeout(r, 1000));
    const res = await fetch(`https://api.replicate.com/v1/predictions/${id}`, {
      headers: { Authorization: `Bearer ${REPLICATE_TOKEN}` },
    });
    const data = await res.json();
    if (data.status === "succeeded") {
      const out = data.output;
      return typeof out === "object" ? (out?.transcription || out?.text || "") : String(out || "");
    }
    if (data.status === "failed" || data.status === "canceled") {
      throw new Error(data.error || "Prediction failed");
    }
  }
  throw new Error("Timeout waiting for transcription");
}

export async function POST(req: NextRequest) {
  if (!REPLICATE_TOKEN) {
    return NextResponse.json({ error: "Replicate not configured" }, { status: 500 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const language = (formData.get("language") as string) || "ru";

    if (!file) {
      return NextResponse.json({ error: "No audio file" }, { status: 400 });
    }

    const buffer = await file.arrayBuffer();
    const base64 = Buffer.from(buffer).toString("base64");
    const audioUri = `data:${file.type || "audio/webm"};base64,${base64}`;

    const createRes = await fetch(
      "https://api.replicate.com/v1/models/openai/whisper/predictions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${REPLICATE_TOKEN}`,
          "Content-Type": "application/json",
          Prefer: "wait=60",
        },
        body: JSON.stringify({
          input: {
            audio: audioUri,
            model: "large-v3",
            language: language !== "auto" ? language : undefined,
            transcription: "plain text",
          },
        }),
      }
    );

    const prediction = await createRes.json();

    if (prediction.status === "succeeded") {
      const out = prediction.output;
      const text = typeof out === "object" ? (out?.transcription || out?.text || "") : String(out || "");
      return NextResponse.json({ text });
    }

    if (prediction.error) throw new Error(prediction.error);

    const text = await pollPrediction(prediction.id);
    return NextResponse.json({ text });
  } catch (err) {
    console.error("Replicate transcribe error:", err);
    return NextResponse.json({ error: "Transcription failed" }, { status: 500 });
  }
}
