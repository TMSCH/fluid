import React, { createContext, useContext, useState } from 'react';
import type { LLMClientConfig } from '../features/llm';

interface AppConfig {
  llm: LLMClientConfig;
}

interface ConfigContextValue {
  config: AppConfig;
  updateConfig: (updates: Partial<AppConfig>) => void;
  isConfigured: boolean;
}

const DEFAULT_BASE_URL = 'https://api.openai.com/v1';

function getEnvApiKey(): string {
  // Expo public env vars are inlined at build time via process.env
  try {
    return process.env.EXPO_PUBLIC_OPENAI_API_KEY || '';
  } catch {
    return '';
  }
}

function getGlobal(key: string): string | undefined {
  if (typeof globalThis !== 'undefined') {
    return (globalThis as Record<string, unknown>)[key] as string | undefined;
  }
  if (typeof window !== 'undefined') {
    return (window as unknown as Record<string, unknown>)[key] as string | undefined;
  }
  return undefined;
}

function resolveBaseUrl(): string {
  // E2E tests can inject a CORS proxy URL
  return getGlobal('__FLUID_BASE_URL') || DEFAULT_BASE_URL;
}

const defaultConfig: AppConfig = {
  llm: {
    apiKey: getEnvApiKey(),
    model: 'gpt-4o',
    baseUrl: resolveBaseUrl(),
  },
};

const ConfigContext = createContext<ConfigContextValue>({
  config: defaultConfig,
  updateConfig: () => {},
  isConfigured: false,
});

export function ConfigProvider({ children }: { children: React.ReactNode }) {
  const [config, setConfig] = useState<AppConfig>(defaultConfig);

  function updateConfig(updates: Partial<AppConfig>) {
    setConfig((prev) => ({
      ...prev,
      ...updates,
      llm: {
        ...prev.llm,
        ...(updates.llm || {}),
        baseUrl: resolveBaseUrl() || updates.llm?.baseUrl || prev.llm.baseUrl,
      },
    }));
  }

  const isConfigured = Boolean(config.llm.apiKey);

  return (
    <ConfigContext.Provider value={{ config, updateConfig, isConfigured }}>
      {children}
    </ConfigContext.Provider>
  );
}

export function useConfig() {
  return useContext(ConfigContext);
}
