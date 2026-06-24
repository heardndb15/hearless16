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
        tabBarStyle: {
          backgroundColor: 'rgba(255, 255, 255, 0.88)',
          borderTopColor: 'rgba(255,255,255,0.5)',
          borderTopWidth: 1.5,
          paddingBottom: 4,
          height: 60,
          shadowColor: '#0288D1',
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: 0.12,
          shadowRadius: 12,
          elevation: 10,
        },
        tabBarActiveTintColor: '#0277BD',
        tabBarInactiveTintColor: '#1E6FA8',
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
