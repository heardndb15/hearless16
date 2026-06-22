import { useState, useRef, useCallback, useEffect } from "react";
import { Audio } from "expo-av";
import * as FileSystem from "expo-file-system";
import { supabase } from "../services/supabase";
import axios from "axios";

const BACKEND_WS = process.env.EXPO_PUBLIC_WS_URL || "wss://hearless16-1.onrender.com/ws/transcribe";

export interface StreamChunk {
  text: string;
  full_text: string;
  is_final: boolean;
}

export function useStreamingRecording(options?: { skipAutoSave?: boolean }) {
  const [isRecording, setIsRecording] = useState(false);
  const [streamText, setStreamText] = useState("");
  const [chunks, setChunks] = useState<StreamChunk[]>([]);
  const wsRef = useRef<WebSocket | null>(null);
  const recordingRef = useRef<Audio.Recording | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const chunkIndexRef = useRef(0);

  const connectWs = useCallback(() => {
    const ws = new WebSocket(BACKEND_WS);
    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === "text" || data.type === "final") {
          const chunk: StreamChunk = {
            text: data.text || "",
            full_text: data.full_text || "",
            is_final: data.type === "final",
          };
          setChunks((prev) => [...prev, chunk]);
          setStreamText(data.full_text || "");

          if (!options?.skipAutoSave && data.type === "final" && data.full_text?.trim()) {
            supabase.auth.getSession().then(({ data: { session } }) => {
              if (session?.user) {
                const API_URL = BACKEND_WS.replace("wss://", "https://").replace("ws://", "http://").replace("/ws/transcribe", "");
                axios.post(`${API_URL}/subtitles`, {
                  user_id: session.user.id,
                  text: data.full_text.trim(),
                }).catch(err => console.log("Failed to auto-save subtitle:", err));
              }
            });
          }
        }
      } catch {}
    };
    ws.onerror = () => {};
    ws.onclose = () => {};
    wsRef.current = ws;
    return ws;
  }, []);

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
      await Audio.requestPermissionsAsync();
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        staysActiveInBackground: true,
      });

      const ws = connectWs();
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
      }, 3000);
    } catch {}
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

    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ action: "stop" }));
    }
    wsRef.current?.close();
    wsRef.current = null;
    recordingRef.current = null;
  }, []);

  useEffect(() => {
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      wsRef.current?.close();
    };
  }, []);

  return {
    isRecording,
    streamText,
    chunks,
    startStreaming,
    stopStreaming,
  };
}
