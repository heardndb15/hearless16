import React from "react";
import { View, StyleSheet } from "react-native";
import { StatusBar } from "expo-status-bar";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { SafeAreaProvider } from "react-native-safe-area-context";
import TabNavigator from "./src/navigation/TabNavigator";
import GesturePracticeScreen from "./src/screens/GesturePracticeScreen";
import GestureDictionaryScreen from "./src/screens/GestureDictionaryScreen";
import PostDetailScreen from "./src/screens/PostDetailScreen";
import CreatePostScreen from "./src/screens/CreatePostScreen";
import { OfflineBanner } from "./src/components/OfflineBanner";
import { useNetworkStatus } from "./src/hooks/useNetworkStatus";
import type { RootStackParamList } from "../shared/types";

const Stack = createNativeStackNavigator<RootStackParamList>();

function AppNavigator() {
  const isOnline = useNetworkStatus();

  return (
    <View style={styles.root}>
      <OfflineBanner visible={!isOnline} />
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
        <Stack.Screen
          name="PostDetail"
          component={PostDetailScreen}
          options={{
            animation: "slide_from_right",
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="CreatePost"
          component={CreatePostScreen}
          options={{
            animation: "slide_from_bottom",
            headerShown: false,
          }}
        />
      </Stack.Navigator>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});

export default function App() {
  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <StatusBar style="auto" />
        <AppNavigator />
      </NavigationContainer>
    </SafeAreaProvider>
  );
}
