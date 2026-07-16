import { NextRequest, NextResponse } from "next/server";
import { identifyRequest, checkRateLimit } from "../../../lib/apiAuth";

const REPLICATE_TOKEN = process.env.REPLICATE_API_TOKEN;
const FREEDOMSPEECH_API_KEY = process.env.FREEDOMSPEECH_API_KEY;

// Kazakh always goes through FreedomSpeech (https://freedomspeech.kz) — no
// Replicate fallback, since Replicate/Whisper doesn't transcribe Kazakh reliably.
async function transcribeWithFreedomSpeech(file: File): Promise<string> {
  if (!FREEDOMSPEECH_API_KEY) {
    throw new Error("FreedomSpeech not configured");
  }
  const fd = new FormData();
  fd.append("model", "whisper-1");
  fd.append("language", "kk");
  fd.append("file", file, file.name || "audio.webm");

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);
  let res: Response;
  try {
    res = await fetch("https://freedomspeech.kz/v1/audio/transcriptions", {
      method: "POST",
      headers: {
        // FreedomSpeech authenticates via X-API-Key, not Authorization: Bearer.
        "X-API-Key": FREEDOMSPEECH_API_KEY,
        // NOTE: verified this endpoint does NOT WAF-block plain fetch()'s
        // default user-agent (curl/node/no-UA all pass; only the OpenAI SDK's
        // own "OpenAI/Python ..." signature gets 403'd) — this header is kept
        // only for parity with backend/app/services/freedomspeech_service.py,
        // which does need it since it goes through that SDK.
        "User-Agent": "python-httpx/0.27.0",
      },
      body: fd,
      signal: controller.signal,
    });
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      throw new Error("FreedomSpeech request timed out");
    }
    throw err;
  } finally {
    clearTimeout(timeout);
  }
  const rawBody = await res.text();
  // TEMP DEBUG: tracing "Kazakh subtitles come back empty" on /subtitles
  // dictation mode — mirrors the debug print already in
  // backend/app/services/freedomspeech_service.py. Remove once root cause
  // is confirmed (see Octarin memory / conversation for context).
  console.log(`[fs-debug] status=${res.status} body=${rawBody.slice(0, 500)}`);
  if (!res.ok) {
    throw new Error(`FreedomSpeech request failed: ${res.status}`);
  }
  const data = JSON.parse(rawBody);
  return (data.text || "").trim();
}

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
  const identity = await identifyRequest(req);
  if (!checkRateLimit(`transcribe:${identity.key}`, identity.anonymous ? 5 : 20)) {
    return NextResponse.json({ error: "Слишком много запросов, попробуйте позже" }, { status: 429 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const language = (formData.get("language") as string) || "ru";

    if (!file) {
      return NextResponse.json({ error: "No audio file" }, { status: 400 });
    }

    if (language === "kk") {
      const text = await transcribeWithFreedomSpeech(file);
      return NextResponse.json({ text });
    }

    if (!REPLICATE_TOKEN) {
      return NextResponse.json({ error: "Replicate not configured" }, { status: 500 });
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

    if (!createRes.ok) {
      throw new Error(prediction?.detail || prediction?.error || `Replicate request failed: ${createRes.status}`);
    }

    if (prediction.status === "succeeded") {
      const out = prediction.output;
      const text = typeof out === "object" ? (out?.transcription || out?.text || "") : String(out || "");
      return NextResponse.json({ text });
    }

    if (prediction.error) throw new Error(prediction.error);

    const text = await pollPrediction(prediction.id);
    return NextResponse.json({ text });
  } catch (err) {
    console.error("Transcribe error:", err);
    return NextResponse.json({ error: "Transcription failed" }, { status: 500 });
  }
}
