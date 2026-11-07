import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

export default function DoctorLayout() {
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
          name="address"
          options={{
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="certifications"
          options={{
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="languages"
          options={{
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="locations"
          options={{
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="medical-procedures"
          options={{
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="other-specialties"
          options={{
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="patient-activity"
          options={{
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="professional-contact"
          options={{
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="working-hours"
          options={{
            headerShown: false,
          }}
        />
      </Stack>
    </>
  );
}
