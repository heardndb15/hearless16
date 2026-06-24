import React from 'react';
import { StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { GRADIENT_COLORS, GRADIENT_LOCATIONS } from '../constants/theme';

export default function GradientBg({ children, style }: { children: React.ReactNode; style?: any }) {
  return (
    <LinearGradient
      colors={GRADIENT_COLORS}
      locations={GRADIENT_LOCATIONS}
      style={StyleSheet.absoluteFill}
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 1 }}
    >
      <SafeAreaView style={[{ flex: 1 }, style]}>
        {children}
      </SafeAreaView>
    </LinearGradient>
  );
}
