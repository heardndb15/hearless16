// Пользователь
export interface User {
  id: string;
  name: string;
  language: 'kk' | 'ru';
  created_at: string;
}

// История субтитров
export interface SubtitleEntry {
  id: string;
  user_id: string;
  text: string;
  created_at: string;
}

// Жест
export interface Gesture {
  id: string;
  name: string;
  category: string;
  image_url: string;
  gif_url?: string | null;
  difficulty: 'easy' | 'medium' | 'hard';
}

// Прогресс пользователя
export interface UserProgress {
  user_id: string;
  gesture_id: string;
  learned: boolean;
  accuracy: number;
}

// Звуковое оповещение
export interface SoundAlert {
  id: string;
  user_id: string;
  sound_type: 'fire' | 'door' | 'phone' | 'car' | 'alarm' | 'baby';
  detected_at: string;
}

// Настройки пользователя
export interface UserSettings {
  theme: 'light' | 'dark';
  language: 'kk' | 'ru';
  notificationsEnabled: boolean;
}

// Лекция для режима учебы
export interface StudyLecture {
  id: string;
  user_id: string;
  title: string;
  transcript: string;
  summary: string;
  highlights: {
    summary: string;
    highlights: string[];
    key_terms: { term: string; definition: string }[];
  };
  created_at: string;
}

export type RootTabParamList = {
  Subtitles: undefined;
  Gestures: undefined;
  Study: undefined;
  Profile: undefined;
};

export type RootStackParamList = {
  Tabs: undefined;
  GesturePractice: { gestureId: string; gestureName: string };
  GestureDictionary: undefined;
};

