import { useCallback, useRef } from "react";
import type { CameraView as ExpoCameraView } from "expo-camera";
import axios from "axios";
import type { RawSample } from "../../../../shared/signLanguageReader/GestureRecognizer";

const API_URL = process.env.EXPO_PUBLIC_API_URL || "https://hearless16-1.onrender.com";
const POLL_INTERVAL_MS = 350;

/**
 * Owns the continuous capture-and-recognize loop: every POLL_INTERVAL_MS,
 * grabs a still frame from the camera and posts it to the backend, skipping
 * a tick if the previous request hasn't resolved yet (same backpressure
 * pattern as GesturePracticeScreen.tsx).
 */
export function useHandTracker(
  cameraRef: React.RefObject<ExpoCameraView>,
  onSample: (sample: RawSample) => void
) {
  const inFlightRef = useRef(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const start = useCallback(() => {
    if (intervalRef.current) return;
    intervalRef.current = setInterval(async () => {
      if (!cameraRef.current || inFlightRef.current) return;
      inFlightRef.current = true;
      try {
        const photo = await cameraRef.current.takePictureAsync({ base64: true, quality: 0.4 });
        if (!photo?.base64) return;
        const response = await axios.post(`${API_URL}/gestures/recognize`, {
          image: photo.base64,
        });
        onSample({
          gesture: response.data.gesture,
          confidence: response.data.confidence ?? 0,
          error: response.data.error,
        });
      } catch {
        onSample({ gesture: null, confidence: 0, error: "processing_error" });
      } finally {
        inFlightRef.current = false;
      }
    }, POLL_INTERVAL_MS);
  }, [cameraRef, onSample]);

  const stop = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  return { start, stop };
}
