import React, { useEffect, useRef } from "react";
import { View, Text, StyleSheet, Animated } from "react-native";
import { BlurView } from "expo-blur";
import { Colors, FontSize } from "../../constants/theme";
import { QUALITY_COLOR, type Quality } from "../../hooks/useSignLanguageReader";

interface Props {
  liveGuess: string | null;
  liveConfidence: number;
  quality: Quality;
}

export default function RecognitionOverlay({ liveGuess, liveConfidence, quality }: Props) {
  const pulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!liveGuess) return;
    pulse.setValue(0.85);
    Animated.spring(pulse, {
      toValue: 1,
      friction: 5,
      tension: 80,
      useNativeDriver: true,
    }).start();
  }, [liveGuess, pulse]);

  return (
    <View style={styles.wrap} pointerEvents="none">
      <Animated.View style={{ transform: [{ scale: pulse }] }}>
        <BlurView intensity={50} tint="light" style={styles.badge}>
          <View style={[styles.dot, { backgroundColor: QUALITY_COLOR[quality] }]} />
          <Text style={styles.text}>{liveGuess ? liveGuess : "Покажите жест"}</Text>
          {liveGuess && <Text style={styles.confidence}>{Math.round(liveConfidence)}%</Text>}
        </BlurView>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: "absolute",
    bottom: 16,
    left: 16,
    right: 16,
    alignItems: "center",
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 24,
    paddingVertical: 10,
    paddingHorizontal: 18,
    overflow: "hidden",
    gap: 8,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  text: {
    fontSize: FontSize.subtitle,
    fontWeight: "700",
    color: Colors.heading,
  },
  confidence: {
    fontSize: FontSize.caption,
    fontWeight: "600",
    color: Colors.textSecondary,
  },
});
