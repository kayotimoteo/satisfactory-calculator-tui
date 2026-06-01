// React context holding the live user configuration (belt/pipe tiers + active
// transport). Loaded once from disk at startup; every change is persisted
// immediately so the JSON on disk always matches what the UI shows.
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { loadConfig, saveConfig, type AppConfig } from "../lib/config";

interface ConfigValue {
  config: AppConfig;
  /** Merge a partial change into the config and persist it. */
  update: (patch: Partial<AppConfig>) => void;
}

const ConfigContext = createContext<ConfigValue | null>(null);

export function ConfigProvider({ children }: { children: ReactNode }) {
  const [config, setConfig] = useState<AppConfig>(() => loadConfig());

  const update = useCallback((patch: Partial<AppConfig>) => {
    setConfig((prev) => {
      const next = { ...prev, ...patch };
      saveConfig(next);
      return next;
    });
  }, []);

  const value = useMemo<ConfigValue>(() => ({ config, update }), [config, update]);
  return <ConfigContext.Provider value={value}>{children}</ConfigContext.Provider>;
}

export function useConfig(): ConfigValue {
  const ctx = useContext(ConfigContext);
  if (!ctx) throw new Error("useConfig must be used within a ConfigProvider");
  return ctx;
}
