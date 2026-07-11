import { useCallback, useEffect, useRef, useState } from "react";
import { useFocusEffect } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Clipboard from "expo-clipboard";
import * as Speech from "expo-speech";
import type { CameraView as ExpoCameraView, CameraType } from "expo-camera";
import { GestureRecognizer } from "../../../shared/signLanguageReader/GestureRecognizer";
import { TextComposer } from "../../../shared/signLanguageReader/TextComposer";
import { useHandTracker } from "../components/signLanguageReader/useHandTracker";
import type { RawSample } from "../../../shared/signLanguageReader/GestureRecognizer";
import { DEFAULT_SIGN_LANGUAGE, SIGN_LANGUAGE_STORAGE_KEY, type SignLanguage } from "../../../shared/signLanguageReader/languages";
import { Colors } from "../constants/theme";

export type Quality = "none" | "low" | "medium" | "high";

export const QUALITY_COLOR: Record<Quality, string> = {
  none: "#9CA3AF",
  low: Colors.sos,
  medium: "#F5A623",
  high: "#22c55e",
};

function qualityFor(sample: RawSample | null): Quality {
  if (!sample || sample.error) return "none";
  if (sample.confidence < 45) return "low";
  if (sample.confidence < 70) return "medium";
  return "high";
}

export function useSignLanguageReader() {
  const cameraRef = useRef<ExpoCameraView>(null);
  const recognizerRef = useRef(new GestureRecognizer());
  const composerRef = useRef(new TextComposer());

  const [facing, setFacing] = useState<CameraType>("front");
  const [sentence, setSentence] = useState("");
  const [liveSample, setLiveSample] = useState<RawSample | null>(null);
  const [language, setLanguageState] = useState<SignLanguage>(DEFAULT_SIGN_LANGUAGE);
  const languageRef = useRef<SignLanguage>(DEFAULT_SIGN_LANGUAGE);
  const userChangedLanguageRef = useRef(false);

  useEffect(() => {
    AsyncStorage.getItem(SIGN_LANGUAGE_STORAGE_KEY).then((stored) => {
      if (userChangedLanguageRef.current) return;
      if (stored === "kz" || stored === "ru") {
        languageRef.current = stored;
        setLanguageState(stored);
      }
    });
  }, []);

  const setLanguage = useCallback((next: SignLanguage) => {
    userChangedLanguageRef.current = true;
    languageRef.current = next;
    setLanguageState(next);
    AsyncStorage.setItem(SIGN_LANGUAGE_STORAGE_KEY, next);
    recognizerRef.current.reset();
    composerRef.current.clear();
    setSentence("");
  }, []);

  const handleSample = useCallback((sample: RawSample) => {
    setLiveSample(sample);
    const state = recognizerRef.current.pushSample(sample);
    if (state.changed) {
      composerRef.current.onConfirmedChange(state.confirmed);
      setSentence(composerRef.current.sentence);
    }
  }, []);

  const { start, stop } = useHandTracker(cameraRef, handleSample, languageRef);

  useFocusEffect(
    useCallback(() => {
      start();
      return () => stop();
    }, [start, stop])
  );

  const clear = useCallback(() => {
    composerRef.current.clear();
    recognizerRef.current.reset();
    setSentence("");
  }, []);

  const copyToClipboard = useCallback(async () => {
    if (!sentence) return;
    await Clipboard.setStringAsync(sentence);
  }, [sentence]);

  const speak = useCallback(() => {
    if (!sentence) return;
    Speech.speak(sentence, { language: "ru-RU" });
  }, [sentence]);

  const toggleFacing = useCallback(() => {
    setFacing((prev) => (prev === "front" ? "back" : "front"));
  }, []);

  return {
    cameraRef,
    facing,
    toggleFacing,
    sentence,
    liveGuess: liveSample?.gesture ?? null,
    liveConfidence: liveSample?.confidence ?? 0,
    quality: qualityFor(liveSample),
    clear,
    copyToClipboard,
    speak,
    language,
    setLanguage,
  };
}
