import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

export default function SettingsLayout() {
  return (
    <>
      <StatusBar style="dark" backgroundColor="transparent" translucent />
      <Stack>
        <Stack.Screen
          name="index"
          options={{
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="profile"
          options={{
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="account"
          options={{
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="appearance"
          options={{
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="communication"
          options={{
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="notifications"
          options={{
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="notifications-enhanced"
          options={{
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="privacy"
          options={{
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="security"
          options={{
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="language-region"
          options={{
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="linked-devices"
          options={{
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="help"
          options={{
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="about"
          options={{
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="invite"
          options={{
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="dependents"
          options={{
            headerShown: false,
          }}
        />
      </Stack>
    </>
  );
}
