import { useState, useRef, useCallback, useEffect } from "react";
import { Audio } from "expo-av";
import LiveAudioStream from "react-native-live-audio-stream";
import { supabase } from "../services/supabase";
import axios from "axios";

const DEFAULT_API_URL = "https://hearless16-1.onrender.com";
const API_URL = process.env.EXPO_PUBLIC_API_URL || DEFAULT_API_URL;
const BACKEND_WS = process.env.EXPO_PUBLIC_WS_URL || API_URL.replace("https://", "wss://").replace("http://", "ws://") + "/ws/transcribe";

// Matches the PCM format the backend's /ws/transcribe already accepts from
// the web client's ScriptProcessor path (landing/app/dashboard/page.tsx) —
// 16kHz mono 16-bit — so no resampling is needed on either end.
const PCM_SAMPLE_RATE = 16000;
const PCM_AUDIO_SOURCE_VOICE_RECOGNITION = 6; // Android MediaRecorder.AudioSource.VOICE_RECOGNITION

export interface SpeakerSegment {
  text: string;
  speaker: number;
  start: number;
  end: number;
}

export interface StreamChunk {
  text: string;
  full_text: string;
  is_final: boolean;
  segments?: SpeakerSegment[];
}

export function useStreamingRecording(options?: { skipAutoSave?: boolean; lang?: string }) {
  const [isRecording, setIsRecording] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [streamText, setStreamText] = useState("");
  const [streamSegments, setStreamSegments] = useState<SpeakerSegment[]>([]);
  const [chunks, setChunks] = useState<StreamChunk[]>([]);
  const [error, setError] = useState<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const userLangRef = useRef<string>("ru");
  // True only while a recording session is actually meant to be active.
  // Guards against the WS 'close' handler and the live-audio 'data'
  // listener acting on a session that stopStreaming already tore down.
  const isActiveRef = useRef(false);
  const closeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const connectWs = useCallback((token: string) => {
    const wsUrl = BACKEND_WS + (BACKEND_WS.includes("?") ? "&" : "?") + `lang=${userLangRef.current}&token=${token}&format=pcm`;
    const ws = new WebSocket(wsUrl);
    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === "error") {
          setError(data.message || "Unknown error");
          setIsRecording(false);
          stopLiveAudio();
          ws.close();
        } else if (data.type === "text" || data.type === "final") {
          setError(null);
          const chunk: StreamChunk = {
            text: data.text || "",
            full_text: data.full_text || "",
            is_final: data.type === "final",
            segments: data.segments ?? [],
          };
          setChunks((prev) => [...prev, chunk]);
          setStreamText(data.full_text || "");
          setStreamSegments(chunk.segments ?? []);

          if (!options?.skipAutoSave && data.type === "final" && data.full_text?.trim()) {
            supabase.auth.getSession().then(({ data: { session } }) => {
              if (session?.user) {
                const API_URL = BACKEND_WS.replace("wss://", "https://").replace("ws://", "http://").replace("/ws/transcribe", "");
                axios.post(
                  `${API_URL}/subtitles`,
                  {
                    user_id: session.user.id,
                    text: data.full_text.trim(),
                  },
                  {
                    headers: {
                      Authorization: `Bearer ${session.access_token}`,
                    },
                  }
                ).catch(err => console.log("Failed to auto-save subtitle:", err));
              }
            });
          }
        }
      } catch {}
    };
    ws.onerror = () => {
      setIsConnecting(false);
      setError("Ошибка подключения к серверу. Проверьте интернет-соединение.");
    };
    ws.onclose = () => {
      if (wsRef.current === ws) {
        wsRef.current = null;
      }
      if (isActiveRef.current) {
        // Socket dropped (network loss, server recycle) while a recording
        // session was still meant to be active. Without this, the mic
        // stream keeps running forever with isRecording stuck true and no
        // feedback that anything went wrong.
        isActiveRef.current = false;
        setIsRecording(false);
        stopLiveAudio();
        setError("Соединение потеряно. Проверьте интернет и начните запись заново.");
      }
    };
    wsRef.current = ws;
    return ws;
  }, [options]);

  // Stops native audio capture. Safe to call even if nothing was started.
  // No explicit listener detach needed: startStreaming's LiveAudioStream.on()
  // call always replaces the previous listener first (see the library's
  // own implementation), and the isActiveRef check inside that listener
  // already discards anything that fires after this runs.
  const stopLiveAudio = useCallback(() => {
    try {
      LiveAudioStream.stop();
    } catch {}
  }, []);

  const waitForWsOpen = useCallback((ws: WebSocket, timeoutMs: number): Promise<boolean> => {
    return new Promise<boolean>((resolve) => {
      if (ws.readyState === WebSocket.OPEN) { resolve(true); return; }
      const timeout = setTimeout(() => resolve(false), timeoutMs);
      const check = () => {
        if (ws.readyState === WebSocket.OPEN) {
          clearTimeout(timeout);
          resolve(true);
        } else if (ws.readyState === WebSocket.CLOSED || ws.readyState === WebSocket.CLOSING) {
          clearTimeout(timeout);
          resolve(false);
        } else {
          setTimeout(check, 50);
        }
      };
      check();
    });
  }, []);

  // Pre-connect WS so the server is awake by the time user presses record.
  const warmup = useCallback(async () => {
    if (wsRef.current && wsRef.current.readyState !== WebSocket.CLOSED) return;
    const { data: { session } } = await supabase.auth.getSession();
    connectWs(session?.access_token || "");
  }, [connectWs]);

  const startStreaming = useCallback(async () => {
    try {
      setError(null);
      setStreamText("");
      setStreamSegments([]);
      setChunks([]);
      const { granted } = await Audio.requestPermissionsAsync();
      if (!granted) {
        setError("Доступ к микрофону отклонен");
        return;
      }

      let ws: WebSocket;
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        // Reuse pre-warmed connection — no wait needed. Cancel any pending
        // delayed close from a just-preceding stopStreaming: without this,
        // that timer can still force-close this same, now actively
        // recording, connection up to 2.5s later.
        if (closeTimeoutRef.current) {
          clearTimeout(closeTimeoutRef.current);
          closeTimeoutRef.current = null;
        }
        ws = wsRef.current;
      } else {
        const { data: { session } } = await supabase.auth.getSession();
        const token = session?.access_token || "";
        setIsConnecting(true);
        ws = wsRef.current && wsRef.current.readyState === WebSocket.CONNECTING
          ? wsRef.current
          : connectWs(token);
        const connected = await waitForWsOpen(ws, 30000);
        setIsConnecting(false);
        if (!connected) {
          setError("Не удалось подключиться к серверу. Попробуйте ещё раз.");
          setIsRecording(false);
          return;
        }
      }

      // Continuous native PCM capture — no stop/restart cycle, so unlike
      // the old expo-av Recording approach there's no ~100-350ms hardware
      // gap (and dropped syllables) every time a chunk boundary was hit.
      LiveAudioStream.init({
        sampleRate: PCM_SAMPLE_RATE,
        channels: 1,
        bitsPerSample: 16,
        audioSource: PCM_AUDIO_SOURCE_VOICE_RECOGNITION,
        bufferSize: 4096,
        // This fork only emits 'data' events and never writes to disk when
        // left empty — the field is a leftover from the upstream
        // react-native-audio-record package it was forked from, where it
        // was mandatory for file-based recording.
        wavFile: "",
      });
      LiveAudioStream.on("data", (base64Chunk: string) => {
        if (!isActiveRef.current) return;
        const socket = wsRef.current;
        if (socket && socket.readyState === WebSocket.OPEN) {
          socket.send(JSON.stringify({ action: "chunk", audio: base64Chunk }));
        }
      });

      isActiveRef.current = true;
      LiveAudioStream.start();
      setIsRecording(true);
    } catch (err: any) {
      setError(err?.message || "Не удалось запустить запись. Проверьте настройки микрофона.");
      setIsRecording(false);
    }
  }, [connectWs, waitForWsOpen]);

  const stopStreaming = useCallback(async () => {
    isActiveRef.current = false;
    setIsRecording(false);
    stopLiveAudio();

    const ws = wsRef.current;
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ action: "stop" }));
      // Wait up to 2.5 seconds for the server to transcribe, send "final", and close the socket
      closeTimeoutRef.current = setTimeout(() => {
        closeTimeoutRef.current = null;
        if (wsRef.current === ws) {
          ws.close();
          wsRef.current = null;
        }
      }, 2500);
    } else {
      wsRef.current = null;
    }
  }, [stopLiveAudio]);

  // An explicit `lang` option (e.g. a per-screen language switcher) always wins
  // over the account's profile language, and skips the Supabase lookup entirely.
  useEffect(() => {
    if (options?.lang) {
      userLangRef.current = options.lang;
      // A pre-warmed connection may already be open with the old lang baked
      // into its URL; close it (only if idle) so the next connect picks up
      // the new one.
      if (!isActiveRef.current && wsRef.current && wsRef.current.readyState !== WebSocket.CLOSED) {
        wsRef.current.close();
        wsRef.current = null;
      }
      return;
    }

    const loadLang = (userId: string) => {
      supabase
        .from("users")
        .select("language")
        .eq("id", userId)
        .single()
        .then(({ data }) => {
          if (data?.language) userLangRef.current = data.language;
        });
    };

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) loadLang(session.user.id);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) loadLang(session.user.id);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [options?.lang]);

  useEffect(() => {
    return () => {
      stopLiveAudio();
      wsRef.current?.close();
    };
  }, [stopLiveAudio]);

  return {
    isRecording,
    isConnecting,
    streamText,
    streamSegments,
    chunks,
    error,
    startStreaming,
    stopStreaming,
    warmup,
  };
}
