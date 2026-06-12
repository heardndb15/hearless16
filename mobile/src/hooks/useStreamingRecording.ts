import { useState, useRef, useCallback, useEffect } from "react";
import { Audio } from "expo-av";
import * as FileSystem from "expo-file-system";

const BACKEND_WS = process.env.EXPO_PUBLIC_WS_URL || "wss://hearless16-1.onrender.com/ws/transcribe";

export interface StreamChunk {
  text: string;
  full_text: string;
  is_final: boolean;
}

export function useStreamingRecording() {
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
        }
      } catch {}
    };
    ws.onerror = () => {};
    ws.onclose = () => {};
    wsRef.current = ws;
    return ws;
  }, []);

  const sendChunk = useCallback(async (ws: WebSocket) => {
    const rec = recordingRef.current;
    if (!rec) return;

    try {
      await rec.stopAndUnloadAsync();
      const uri = rec.getURI();
      if (!uri) return;

      const base64 = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ action: "chunk", audio: base64 }));
      }

      await FileSystem.deleteAsync(uri, { idempotent: true });
    } catch {}

    try {
      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      recordingRef.current = recording;
    } catch {}
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
      }, 600);
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
