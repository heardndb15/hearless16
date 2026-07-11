import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Colors, Spacing, FontSize } from "../../constants/theme";
import { SIGN_LANGUAGES, type SignLanguage } from "../../../../shared/signLanguageReader/languages";

interface Props {
  language: SignLanguage;
  onChange: (language: SignLanguage) => void;
}

export default function LanguageToggle({ language, onChange }: Props) {
  return (
    <View style={styles.row}>
      {SIGN_LANGUAGES.map((lang) => (
        <TouchableOpacity
          key={lang.code}
          style={[styles.pill, lang.code === language && styles.pillActive]}
          onPress={() => onChange(lang.code)}
        >
          <Text style={[styles.pillText, lang.code === language && styles.pillTextActive]}>{lang.label}</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: Spacing.md,
    marginBottom: Spacing.sm,
  },
  pill: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: Colors.listBackground,
  },
  pillActive: {
    backgroundColor: Colors.accent,
  },
  pillText: {
    fontSize: FontSize.caption,
    fontWeight: "600",
    color: Colors.textSecondary,
  },
  pillTextActive: {
    color: Colors.white,
  },
});
