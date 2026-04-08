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

const ConfigContext = createContext<ConfigContextValue>({
  config: defaultConfig,
  updateConfig: () => {},
  isConfigured: false,
});

export function ConfigProvider({ children }: { children: React.ReactNode }) {
  const [config, setConfig] = useState<AppConfig>(() => {
    // Allow injection via global for testing
    if (typeof globalThis !== 'undefined' && (globalThis as Record<string, unknown>).__FLUID_API_KEY) {
      return {
        ...defaultConfig,
        llm: {
          ...defaultConfig.llm,
          apiKey: (globalThis as Record<string, unknown>).__FLUID_API_KEY as string,
        },
      };
    }
    return defaultConfig;
  });

  function updateConfig(updates: Partial<AppConfig>) {
    setConfig((prev) => ({
      ...prev,
      ...updates,
      llm: {
        ...prev.llm,
        ...(updates.llm || {}),
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
