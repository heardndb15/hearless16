import React from "react";
import { View, StyleSheet, SafeAreaView } from "react-native";
import CameraView from "../components/signLanguageReader/CameraView";
import RecognitionOverlay from "../components/signLanguageReader/RecognitionOverlay";
import ResultPanel from "../components/signLanguageReader/ResultPanel";
import LanguageToggle from "../components/signLanguageReader/LanguageToggle";
import { useSignLanguageReader } from "../hooks/useSignLanguageReader";

export default function SignLanguageReaderScreen() {
  const {
    cameraRef,
    facing,
    toggleFacing,
    sentence,
    liveGuess,
    liveConfidence,
    quality,
    clear,
    copyToClipboard,
    speak,
    language,
    setLanguage,
  } = useSignLanguageReader();

  return (
    <View style={{ flex: 1, backgroundColor: "#FFFFFF" }}>
      <SafeAreaView style={styles.container}>
        <LanguageToggle language={language} onChange={setLanguage} />
        <View style={styles.cameraWrap}>
          <CameraView cameraRef={cameraRef} facing={facing} onToggleFacing={toggleFacing}>
            <RecognitionOverlay
              liveGuess={liveGuess}
              liveConfidence={liveConfidence}
              quality={quality}
            />
          </CameraView>
        </View>
        <ResultPanel
          sentence={sentence}
          quality={quality}
          onClear={clear}
          onCopy={copyToClipboard}
          onSpeak={speak}
        />
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  cameraWrap: {
    flex: 1,
    margin: 16,
    marginBottom: 0,
  },
});
