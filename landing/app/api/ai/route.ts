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
      return Array.isArray(out) ? out.join("") : String(out || "");
    }
    if (data.status === "failed" || data.status === "canceled") {
      throw new Error(data.error || "Prediction failed");
    }
  }
  throw new Error("Timeout");
}

export async function POST(req: NextRequest) {
  if (!REPLICATE_TOKEN) {
    return NextResponse.json({ error: "Replicate not configured" }, { status: 500 });
  }

  try {
    const { prompt, text } = await req.json();

    const createRes = await fetch(
      "https://api.replicate.com/v1/models/meta/meta-llama-3-8b-instruct/predictions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${REPLICATE_TOKEN}`,
          "Content-Type": "application/json",
          Prefer: "wait=60",
        },
        body: JSON.stringify({
          input: {
            prompt: `${prompt}\n\nТекст:\n${text}`,
            max_tokens: 512,
            temperature: 0.3,
          },
        }),
      }
    );

    const prediction = await createRes.json();

    if (!createRes.ok) {
      throw new Error(prediction?.detail || prediction?.error || `Replicate request failed: ${createRes.status}`);
    }

    if (prediction.status === "succeeded") {
      const out = prediction.output;
      const result = Array.isArray(out) ? out.join("") : String(out || "");
      return NextResponse.json({ result });
    }

    if (prediction.error) throw new Error(prediction.error);

    const result = await pollPrediction(prediction.id);
    return NextResponse.json({ result });
  } catch (err) {
    console.error("Replicate AI error:", err);
    return NextResponse.json({ error: "AI request failed" }, { status: 500 });
  }
}
