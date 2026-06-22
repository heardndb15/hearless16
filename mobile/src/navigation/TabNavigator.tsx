import React from "react";
import { Text } from "react-native";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Colors } from "../constants/theme";
import SubtitlesScreen from "../screens/SubtitlesScreen";
import GesturesScreen from "../screens/GesturesScreen";
import StudyScreen from "../screens/StudyScreen";
import ProfileScreen from "../screens/ProfileScreen";
import type { RootTabParamList } from "../../../shared/types";

const Tab = createBottomTabNavigator<RootTabParamList>();

function TabIcon({ label, focused }: { label: string; focused: boolean }) {
  const icons: Record<string, string> = {
    Субтитры: "💬",
    Жесты: "🤟",
    Учеба: "🎓",
    Профиль: "👤",
  };
  return (
    <Text style={{ fontSize: focused ? 24 : 20, opacity: focused ? 1 : 0.6 }}>
      {icons[label] || "•"}
    </Text>
  );
}

export default function TabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: Colors.accent,
        tabBarInactiveTintColor: Colors.textSecondary,
        tabBarStyle: {
          backgroundColor: Colors.white,
          borderTopColor: Colors.border,
          paddingBottom: 4,
          height: 60,
        },
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
    </Tab.Navigator>
  );
}
