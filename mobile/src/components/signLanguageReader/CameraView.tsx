import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { CameraView as ExpoCameraView, useCameraPermissions, type CameraType } from "expo-camera";
import { BlurView } from "expo-blur";
import { Colors, Spacing, FontSize } from "../../constants/theme";

interface Props {
  cameraRef: React.RefObject<ExpoCameraView>;
  facing: CameraType;
  onToggleFacing: () => void;
  children?: React.ReactNode;
}

export default function CameraView({ cameraRef, facing, onToggleFacing, children }: Props) {
  const [permission, requestPermission] = useCameraPermissions();

  if (!permission) {
    return <View style={styles.container} />;
  }

  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <BlurView intensity={40} tint="light" style={styles.permissionCard}>
          <Text style={styles.permissionTitle}>Нет доступа к камере</Text>
          <Text style={styles.permissionText}>
            Разрешите доступ к камере, чтобы распознавать жесты
          </Text>
          <TouchableOpacity style={styles.permissionButton} onPress={requestPermission}>
            <Text style={styles.permissionButtonText}>Разрешить доступ к камере</Text>
          </TouchableOpacity>
        </BlurView>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ExpoCameraView ref={cameraRef} style={styles.camera} facing={facing} />
      <TouchableOpacity style={styles.flipButton} onPress={onToggleFacing}>
        <Text style={styles.flipButtonText}>🔄</Text>
      </TouchableOpacity>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    borderRadius: 20,
    overflow: "hidden",
    backgroundColor: Colors.listBackground,
  },
  camera: {
    flex: 1,
  },
  flipButton: {
    position: "absolute",
    top: 12,
    right: 12,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(0,0,0,0.4)",
    alignItems: "center",
    justifyContent: "center",
  },
  flipButtonText: {
    fontSize: 18,
  },
  permissionCard: {
    margin: Spacing.lg,
    padding: Spacing.lg,
    borderRadius: 20,
    alignItems: "center",
    overflow: "hidden",
  },
  permissionTitle: {
    fontSize: FontSize.title,
    fontWeight: "bold",
    color: Colors.heading,
    marginBottom: Spacing.sm,
    textAlign: "center",
  },
  permissionText: {
    fontSize: FontSize.body,
    color: Colors.textSecondary,
    textAlign: "center",
    marginBottom: Spacing.md,
  },
  permissionButton: {
    backgroundColor: Colors.accent,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  permissionButtonText: {
    color: Colors.white,
    fontWeight: "600",
    fontSize: FontSize.body,
  },
});
