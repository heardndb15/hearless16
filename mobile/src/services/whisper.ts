import axios from "axios";
import * as FileSystem from "expo-file-system";
import { supabase } from "./supabase";

const API_URL = process.env.EXPO_PUBLIC_API_URL || "https://hearless16-1.onrender.com";

export async function transcribeAudio(
  audioUri: string
): Promise<string> {
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token || "";

  const formData = new FormData();
  const fileInfo = await FileSystem.getInfoAsync(audioUri);

  formData.append("file", {
    uri: audioUri,
    type: "audio/m4a",
    name: fileInfo.uri.split("/").pop() || "audio.m4a",
  } as any);

  const response = await axios.post(`${API_URL}/transcribe`, formData, {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "multipart/form-data",
    },
  });

  return response.data.text;
}
