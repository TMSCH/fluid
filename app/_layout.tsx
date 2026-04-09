import React from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ConfigProvider } from '../src/lib/config-context';

export default function RootLayout() {
  return (
    <ConfigProvider>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: '#fff' },
          headerTintColor: '#111',
          headerTitleStyle: { fontWeight: '600' },
          contentStyle: { backgroundColor: '#f8f8f8' },
        }}
      />
    </ConfigProvider>
  );
}
