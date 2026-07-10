import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import SubtitlesScreen from "../screens/SubtitlesScreen";
import GesturesScreen from "../screens/GesturesScreen";
import SignLanguageReaderScreen from "../screens/SignLanguageReaderScreen";
import StudyScreen from "../screens/StudyScreen";
import ProfileScreen from "../screens/ProfileScreen";
import CommunityFeedScreen from "../screens/CommunityFeedScreen";
import type { RootTabParamList } from "../../../shared/types";

const Tab = createBottomTabNavigator<RootTabParamList>();

function TabIcon({ label, focused }: { label: string; focused: boolean }) {
  const icons: Record<string, string> = {
    Субтитры: "💬",
    Жесты: "🤟",
    Перевод: "👋",
    Учеба: "🎓",
    Профиль: "👤",
    Комьюнити: "👥",
  };
  return (
    <View style={[styles.iconWrap, focused && styles.iconWrapActive]}>
      <Text style={{ fontSize: focused ? 22 : 20 }}>{icons[label] || "•"}</Text>
    </View>
  );
}

export default function TabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopColor: '#E8EDF5',
          borderTopWidth: 1,
          height: 64,
          paddingBottom: 8,
          paddingTop: 4,
          shadowColor: '#000000',
          shadowOffset: { width: 0, height: -2 },
          shadowOpacity: 0.06,
          shadowRadius: 8,
          elevation: 10,
        },
        tabBarActiveTintColor: '#1565C0',
        tabBarInactiveTintColor: '#9CA3AF',
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: "600",
        },
      }}
    >
      <Tab.Screen
        name="Subtitles"
        component={SubtitlesScreen}
        options={{
          tabBarLabel: "Субтитры",
          tabBarIcon: ({ focused }) => <TabIcon label="Субтитры" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="Gestures"
        component={GesturesScreen}
        options={{
          tabBarLabel: "Жесты",
          tabBarIcon: ({ focused }) => <TabIcon label="Жесты" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="Translate"
        component={SignLanguageReaderScreen}
        options={{
          tabBarLabel: "Перевод",
          tabBarIcon: ({ focused }) => <TabIcon label="Перевод" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="Study"
        component={StudyScreen}
        options={{
          tabBarLabel: "Учеба",
          tabBarIcon: ({ focused }) => <TabIcon label="Учеба" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          tabBarLabel: "Профиль",
          tabBarIcon: ({ focused }) => <TabIcon label="Профиль" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="Community"
        component={CommunityFeedScreen}
        options={{
          tabBarLabel: "Комьюнити",
          tabBarIcon: ({ focused }) => <TabIcon label="Комьюнити" focused={focused} />,
        }}
      />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  iconWrap: {
    width: 48,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrapActive: {
    backgroundColor: '#EBF3FF',
  },
});
