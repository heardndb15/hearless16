import axios from "axios";
import * as FileSystem from "expo-file-system";

const WHISPER_API_URL = "https://api.openai.com/v1/audio/transcriptions";

export async function transcribeAudio(
  audioUri: string,
  apiKey: string
): Promise<string> {
  const formData = new FormData();
  const fileInfo = await FileSystem.getInfoAsync(audioUri);

  formData.append("file", {
    uri: audioUri,
    type: "audio/m4a",
    name: fileInfo.uri.split("/").pop() || "audio.m4a",
  } as any);
  formData.append("model", "whisper-1");
  formData.append("language", "ru");

  const response = await axios.post(WHISPER_API_URL, formData, {
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "multipart/form-data",
    },
  });

  return response.data.text;
}
