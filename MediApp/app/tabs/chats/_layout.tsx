import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

export default function ChatsLayout() {
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
          name="[id]"
          options={{
            headerShown: false,
            headerBackTitle: '',
          }}
        />
        <Stack.Screen
          name="discovery"
          options={{
            headerShown: false,
            headerBackTitle: '',
          }}
        />
      </Stack>
    </>
  );
}
