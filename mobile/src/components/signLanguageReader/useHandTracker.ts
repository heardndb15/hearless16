import { useCallback, useRef } from "react";
import type { CameraView as ExpoCameraView } from "expo-camera";
import axios from "axios";
import type { RawSample } from "../../../../shared/signLanguageReader/GestureRecognizer";
import type { SignLanguage } from "../../../../shared/signLanguageReader/languages";

const API_URL = process.env.EXPO_PUBLIC_API_URL || "https://hearless16-1.onrender.com";
// Backend caps /gestures/recognize at 120/minute (2/sec, see
// backend/app/routes/gestures.py) — polling faster than that just means
// most frames silently get a 429 that used to be indistinguishable from a
// real "gesture not recognized" result. 600ms keeps a margin under the
// 500ms theoretical minimum.
const POLL_INTERVAL_MS = 600;

/**
 * Owns the continuous capture-and-recognize loop: every POLL_INTERVAL_MS,
 * grabs a still frame from the camera and posts it to the backend, skipping
 * a tick if the previous request hasn't resolved yet (same backpressure
 * pattern as GesturePracticeScreen.tsx).
 *
 * `languageRef` (not a plain `language` value) is used so a mid-session
 * language switch is picked up by the already-running interval without
 * needing to stop/restart it.
 */
export function useHandTracker(
  cameraRef: React.RefObject<ExpoCameraView>,
  onSample: (sample: RawSample) => void,
  languageRef: React.MutableRefObject<SignLanguage>
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
          language: languageRef.current,
        });
        onSample({
          gesture: response.data.gesture,
          confidence: response.data.confidence ?? 0,
          error: response.data.error,
        });
      } catch (err: any) {
        // Distinguish server throttling from an actual recognition failure
        // instead of reporting both identically as "processing_error".
        const rateLimited = err?.response?.status === 429;
        onSample({ gesture: null, confidence: 0, error: rateLimited ? "rate_limited" : "processing_error" });
      } finally {
        inFlightRef.current = false;
      }
    }, POLL_INTERVAL_MS);
  }, [cameraRef, onSample, languageRef]);

  const stop = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  return { start, stop };
}
