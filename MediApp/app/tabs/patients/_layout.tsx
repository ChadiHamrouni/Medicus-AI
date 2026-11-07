import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

export default function PatientsLayout() {
  return (
    <>
      <StatusBar style="dark" backgroundColor="transparent" translucent />
      <Stack
        screenOptions={{
          headerShown: false,
        }}
      >
        <Stack.Screen
          name="index"
          options={{
            headerShown: false,
          }}
        />
      </Stack>
    </>
  );
}
