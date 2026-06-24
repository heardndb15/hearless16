import React, { useState, useCallback } from "react";
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, KeyboardAvoidingView, Platform, Alert, ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Image } from "expo-image";
import { useNavigation } from "@react-navigation/native";
import * as ImagePicker from "expo-image-picker";
import axios from "axios";
import { supabase } from "../services/supabase";
import { GlassCard, Colors, GRADIENT_COLORS, GRADIENT_LOCATIONS } from "../constants/theme";

const API_URL = process.env.EXPO_PUBLIC_API_URL || "https://hearless16-1.onrender.com";

export default function CreatePostScreen() {
  const navigation = useNavigation();
  const [text, setText] = useState("");
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [posting, setPosting] = useState(false);

  const pickImage = useCallback(async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert("Нет доступа", "Разрешите доступ к галерее в настройках телефона.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
      allowsEditing: false,
    });
    if (result.canceled || !result.assets[0]) return;

    const asset = result.assets[0];
    setImageUri(asset.uri);
    setImageUrl(null);
    setUploading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token ?? "";
      const formData = new FormData();
      formData.append("file", {
        uri: asset.uri,
        type: asset.mimeType || "image/jpeg",
        name: "photo.jpg",
      } as any);
      const res = await fetch(`${API_URL}/community/upload`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "multipart/form-data",
        },
        body: formData,
      });
      if (!res.ok) {
        throw new Error(`Upload failed: ${res.status}`);
      }
      const json = await res.json() as { image_url: string };
      setImageUrl(json.image_url);
    } catch {
      Alert.alert("Ошибка", "Не удалось загрузить фото. Попробуйте ещё раз.");
      setImageUri(null);
    } finally {
      setUploading(false);
    }
  }, []);

  const removeImage = useCallback(() => {
    setImageUri(null);
    setImageUrl(null);
  }, []);

  const handlePublish = useCallback(async () => {
    if (!text.trim() || posting) return;
    setPosting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token ?? "";
      await axios.post(
        `${API_URL}/community/posts`,
        { text: text.trim(), image_url: imageUrl },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      navigation.goBack();
    } catch {
      Alert.alert("Ошибка", "Не удалось опубликовать пост. Попробуйте ещё раз.");
    } finally {
      setPosting(false);
    }
  }, [text, imageUrl, posting, navigation]);

  const isLoading = uploading || posting;
  const canPublish = text.trim().length > 0 && !isLoading;

  return (
    <LinearGradient colors={GRADIENT_COLORS} locations={GRADIENT_LOCATIONS} style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1 }}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} disabled={isLoading}>
            <Text style={[styles.cancelBtn, isLoading && { opacity: 0.4 }]}>Отмена</Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Новый пост</Text>
          <TouchableOpacity onPress={handlePublish} disabled={!canPublish}>
            <Text style={[styles.publishBtn, !canPublish && { opacity: 0.4 }]}>
              Опубликовать
            </Text>
          </TouchableOpacity>
        </View>

        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <ScrollView contentContainerStyle={{ paddingBottom: 24 }}>
            {/* Text input card */}
            <View style={[GlassCard, styles.textCard]}>
              <TextInput
                placeholder="Что у вас нового?"
                placeholderTextColor="#1E6FA8"
                value={text}
                onChangeText={setText}
                multiline
                maxLength={500}
                style={styles.textInput}
                autoFocus
              />
              <Text style={styles.charCount}>{text.length}/500</Text>
            </View>

            {/* Image preview */}
            {imageUri ? (
              <View style={styles.previewWrap}>
                <Image source={{ uri: imageUri }} style={styles.previewImage} contentFit="cover" />
                {uploading && (
                  <View style={styles.uploadOverlay}>
                    <ActivityIndicator color="white" size="large" />
                    <Text style={styles.uploadText}>Загрузка фото...</Text>
                  </View>
                )}
                {!uploading && (
                  <TouchableOpacity style={styles.removeImgBtn} onPress={removeImage}>
                    <Text style={styles.removeImgText}>✕ Удалить фото</Text>
                  </TouchableOpacity>
                )}
              </View>
            ) : (
              <TouchableOpacity
                style={[GlassCard, styles.addPhotoBtn]}
                onPress={pickImage}
                disabled={isLoading}
              >
                <Text style={styles.addPhotoText}>📷 Добавить фото</Text>
              </TouchableOpacity>
            )}
          </ScrollView>
        </KeyboardAvoidingView>

        {/* Full-screen posting overlay */}
        {posting && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator color="white" size="large" />
            <Text style={styles.uploadText}>Публикация...</Text>
          </View>
        )}
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, paddingVertical: 12 },
  cancelBtn: { color: "white", fontSize: 16 },
  headerTitle: { color: "white", fontSize: 17, fontWeight: "700" },
  publishBtn: { color: "#0277BD", fontSize: 15, fontWeight: "700", backgroundColor: "white", paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20 },
  textCard: { marginHorizontal: 16, marginTop: 16, padding: 16, borderRadius: 20 },
  textInput: { fontSize: 16, color: Colors.heading, minHeight: 120, textAlignVertical: "top" },
  charCount: { textAlign: "right", fontSize: 12, color: "#1E6FA8", marginTop: 8 },
  previewWrap: { marginHorizontal: 16, marginTop: 12, borderRadius: 12, overflow: "hidden" },
  previewImage: { width: "100%", aspectRatio: 16 / 9 },
  uploadOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.55)", alignItems: "center", justifyContent: "center", gap: 10 },
  uploadText: { color: "white", fontSize: 15, fontWeight: "600" },
  removeImgBtn: { padding: 12, alignItems: "center" },
  removeImgText: { color: "#ef4444", fontSize: 14, fontWeight: "600" },
  addPhotoBtn: { marginHorizontal: 16, marginTop: 12, padding: 18, borderRadius: 20, alignItems: "center" },
  addPhotoText: { color: "#0277BD", fontSize: 16, fontWeight: "600" },
  loadingOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.5)", alignItems: "center", justifyContent: "center", gap: 10 },
});
