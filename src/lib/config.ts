// User configuration: which conveyor/pipe tiers are in use and which transport
// is currently active for the max-throughput checks. Persisted as a single JSON
// at ~/.satisfactory-calculator-tui/config.json (next to history.json).
//
// Pure module: no React, no UI. The tier rates are the in-game throughput limits
// (items/min for belts, m³/min for pipes).
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { homedir } from "os";
import { join } from "path";
import type { LanguagePref } from "../i18n/messages";

export type TransportType = "belt" | "pipe";

export interface TransportTier {
  /** Mk number (1-based) */
  mk: number;
  /** items (belts) or m³ (pipes) per minute this tier can carry */
  rate: number;
}

/** Conveyor belts, Mk.1 → Mk.6 (items/min). */
export const BELT_TIERS: readonly TransportTier[] = [
  { mk: 1, rate: 60 },
  { mk: 2, rate: 120 },
  { mk: 3, rate: 270 },
  { mk: 4, rate: 480 },
  { mk: 5, rate: 780 },
  { mk: 6, rate: 1200 },
];

/** Pipelines, Mk.1 → Mk.2 (m³/min). */
export const PIPE_TIERS: readonly TransportTier[] = [
  { mk: 1, rate: 300 },
  { mk: 2, rate: 600 },
];

export interface AppConfig {
  /** selected belt tier (Mk number) */
  beltMk: number;
  /** selected pipe tier (Mk number) */
  pipeMk: number;
  /** which transport the max-throughput checks use */
  transport: TransportType;
  /** UI language: "system" defers to OS detection, else a pinned locale */
  language: LanguagePref;
}

// Default: Mk.1 for both, belt active, language following the OS — the user
// tunes it all from the config screen.
export const DEFAULT_CONFIG: AppConfig = {
  beltMk: 1,
  pipeMk: 1,
  transport: "belt",
  language: "system",
};

const DIR = join(homedir(), ".satisfactory-calculator-tui");
const FILE = join(DIR, "config.json");

/** Config file path (shown on the config screen). */
export const CONFIG_PATH = FILE;

/** True once a config file exists — i.e. this is NOT the first run. */
export function configExists(): boolean {
  return existsSync(FILE);
}

function hasTier(tiers: readonly TransportTier[], mk: unknown): mk is number {
  return typeof mk === "number" && tiers.some((t) => t.mk === mk);
}

function isLanguage(value: unknown): value is LanguagePref {
  return value === "system" || value === "pt-BR" || value === "en-US";
}

/** Loads the config, falling back to defaults for anything missing/invalid. */
export function loadConfig(): AppConfig {
  try {
    if (!existsSync(FILE)) return { ...DEFAULT_CONFIG };
    const raw = JSON.parse(readFileSync(FILE, "utf8")) as Partial<AppConfig>;
    return {
      beltMk: hasTier(BELT_TIERS, raw.beltMk) ? raw.beltMk : DEFAULT_CONFIG.beltMk,
      pipeMk: hasTier(PIPE_TIERS, raw.pipeMk) ? raw.pipeMk : DEFAULT_CONFIG.pipeMk,
      transport: raw.transport === "pipe" ? "pipe" : "belt",
      language: isLanguage(raw.language) ? raw.language : DEFAULT_CONFIG.language,
    };
  } catch {
    return { ...DEFAULT_CONFIG };
  }
}

export function saveConfig(config: AppConfig): void {
  if (!existsSync(DIR)) mkdirSync(DIR, { recursive: true });
  writeFileSync(FILE, JSON.stringify(config, null, 2), "utf8");
}

/** Active transport tier for the throughput checks. */
export function activeTier(config: AppConfig): TransportTier {
  const tiers = config.transport === "belt" ? BELT_TIERS : PIPE_TIERS;
  const mk = config.transport === "belt" ? config.beltMk : config.pipeMk;
  return tiers.find((t) => t.mk === mk) ?? tiers[0]!;
}

/** Per-row throughput limit (items/min) from the active transport. */
export function limiteTransporte(config: AppConfig): number {
  return activeTier(config).rate;
}
