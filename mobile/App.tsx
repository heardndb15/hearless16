import React from "react";
import { StatusBar } from "expo-status-bar";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { SafeAreaProvider } from "react-native-safe-area-context";
import TabNavigator from "./src/navigation/TabNavigator";
import GesturePracticeScreen from "./src/screens/GesturePracticeScreen";
import GestureDictionaryScreen from "./src/screens/GestureDictionaryScreen";
import type { RootStackParamList } from "../shared/types";

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function App() {
  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <StatusBar style="auto" />
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          <Stack.Screen name="Tabs" component={TabNavigator} />
          <Stack.Screen
            name="GesturePractice"
            component={GesturePracticeScreen}
            options={{
              animation: "slide_from_bottom",
              headerShown: true,
              headerTitle: "Практика жеста",
              headerTintColor: "#ffffff",
              headerStyle: { backgroundColor: "#0277BD" },
            }}
          />
          <Stack.Screen
            name="GestureDictionary"
            component={GestureDictionaryScreen}
            options={{
              animation: "slide_from_right",
              headerShown: false,
            }}
          />
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
