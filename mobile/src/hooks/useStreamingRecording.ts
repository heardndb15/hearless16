import { useState, useRef, useCallback, useEffect } from "react";
import { Audio } from "expo-av";
import * as FileSystem from "expo-file-system";
import { supabase } from "../services/supabase";
import axios from "axios";

const DEFAULT_API_URL = "https://hearless16-1.onrender.com";
const API_URL = process.env.EXPO_PUBLIC_API_URL || DEFAULT_API_URL;
const BACKEND_WS = process.env.EXPO_PUBLIC_WS_URL || API_URL.replace("https://", "wss://").replace("http://", "ws://") + "/ws/transcribe";

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

export function useStreamingRecording(options?: { skipAutoSave?: boolean }) {
  const [isRecording, setIsRecording] = useState(false);
  const [streamText, setStreamText] = useState("");
  const [streamSegments, setStreamSegments] = useState<SpeakerSegment[]>([]);
  const [chunks, setChunks] = useState<StreamChunk[]>([]);
  const [error, setError] = useState<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const recordingRef = useRef<Audio.Recording | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const chunkIndexRef = useRef(0);
  const userLangRef = useRef<string>("ru");

  const connectWs = useCallback((token: string) => {
    const wsUrl = BACKEND_WS + (BACKEND_WS.includes("?") ? "&" : "?") + `lang=${userLangRef.current}&token=${token}`;
    const ws = new WebSocket(wsUrl);
    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === "error") {
          setError(data.message || "Unknown error");
          setIsRecording(false);
          if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
          }
          if (recordingRef.current) {
            recordingRef.current.stopAndUnloadAsync().catch(() => {});
            recordingRef.current = null;
          }
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
      setError("WebSocket connection error");
    };
    ws.onclose = () => {
      if (wsRef.current === ws) {
        wsRef.current = null;
      }
    };
    wsRef.current = ws;
    return ws;
  }, [options]);

  const sendChunk = useCallback(async (ws: WebSocket) => {
    const oldRec = recordingRef.current;
    if (!oldRec) return;

    try {
      // 1. Stop the current recording as quickly as possible
      await oldRec.stopAndUnloadAsync();
      const uri = oldRec.getURI();

      // 2. IMMEDIATELY start the next recording to minimize hardware gap
      try {
        const { recording } = await Audio.Recording.createAsync(
          Audio.RecordingOptionsPresets.HIGH_QUALITY
        );
        recordingRef.current = recording;
      } catch (err) {
        console.log("Failed to restart recording:", err);
      }

      // 3. Process and send the previous audio chunk in the background
      if (uri) {
        FileSystem.readAsStringAsync(uri, {
          encoding: FileSystem.EncodingType.Base64,
        }).then(async (base64) => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ action: "chunk", audio: base64 }));
          }
          await FileSystem.deleteAsync(uri, { idempotent: true });
        }).catch(err => {
          console.log("Error processing audio file:", err);
        });
      }
    } catch (err) {
      console.log("Error in sendChunk:", err);
    }
  }, []);

  const startStreaming = useCallback(async () => {
    try {
      setError(null);
      const { granted } = await Audio.requestPermissionsAsync();
      if (!granted) {
        setError("Доступ к микрофону отклонен");
        return;
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        staysActiveInBackground: true,
      });

      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token || "";
      const ws = connectWs(token);
      await new Promise<void>((resolve) => {
        const check = () => {
          if (ws.readyState === WebSocket.OPEN) {
            resolve();
          } else if (ws.readyState === WebSocket.CLOSED) {
            resolve();
          } else {
            setTimeout(check, 50);
          }
        };
        check();
      });

      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      recordingRef.current = recording;
      setIsRecording(true);

      intervalRef.current = setInterval(() => {
        if (wsRef.current) {
          sendChunk(wsRef.current);
        }
      }, 1500);
    } catch (err: any) {
      setError(err?.message || "Не удалось запустить запись. Проверьте настройки микрофона.");
      setIsRecording(false);
    }
  }, [connectWs, sendChunk]);

  const stopStreaming = useCallback(async () => {
    setIsRecording(false);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    try {
      if (recordingRef.current) {
        await recordingRef.current.stopAndUnloadAsync();
        const uri = recordingRef.current.getURI();
        if (uri && wsRef.current?.readyState === WebSocket.OPEN) {
          const base64 = await FileSystem.readAsStringAsync(uri, {
            encoding: FileSystem.EncodingType.Base64,
          });
          wsRef.current.send(JSON.stringify({ action: "chunk", audio: base64 }));
          await FileSystem.deleteAsync(uri, { idempotent: true });
        }
      }
    } catch {}

    const ws = wsRef.current;
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ action: "stop" }));
      // Wait up to 2.5 seconds for the server to transcribe, send "final", and close the socket
      setTimeout(() => {
        if (wsRef.current === ws) {
          ws.close();
          wsRef.current = null;
        }
      }, 2500);
    } else {
      wsRef.current = null;
    }
    recordingRef.current = null;
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        supabase
          .from("users")
          .select("language")
          .eq("id", session.user.id)
          .single()
          .then(({ data }) => {
            if (data?.language) {
              userLangRef.current = data.language;
            }
          });
      }
    });

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      wsRef.current?.close();
    };
  }, []);

  return {
    isRecording,
    streamText,
    streamSegments,
    chunks,
    error,
    startStreaming,
    stopStreaming,
  };
}
