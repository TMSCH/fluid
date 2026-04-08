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

const defaultConfig: AppConfig = {
  llm: {
    apiKey: '',
    model: 'gpt-4o',
    baseUrl: 'https://api.openai.com/v1',
  },
};

function getGlobal(key: string): string | undefined {
  if (typeof globalThis !== 'undefined') {
    return (globalThis as Record<string, unknown>)[key] as string | undefined;
  }
  if (typeof window !== 'undefined') {
    return (window as unknown as Record<string, unknown>)[key] as string | undefined;
  }
  return undefined;
}

const ConfigContext = createContext<ConfigContextValue>({
  config: defaultConfig,
  updateConfig: () => {},
  isConfigured: false,
});

export function ConfigProvider({ children }: { children: React.ReactNode }) {
  const [config, setConfig] = useState<AppConfig>(defaultConfig);

  function updateConfig(updates: Partial<AppConfig>) {
    setConfig((prev) => {
      // Check for injected base URL (used by E2E tests to route through CORS proxy)
      const injectedBaseUrl = getGlobal('__FLUID_BASE_URL');

      return {
        ...prev,
        ...updates,
        llm: {
          ...prev.llm,
          ...(updates.llm || {}),
          // Use injected base URL if available, otherwise use the provided or default
          baseUrl: injectedBaseUrl || updates.llm?.baseUrl || prev.llm.baseUrl,
        },
      };
    });
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
