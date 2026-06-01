// History / saved-calculations persistence.
//
// Everything goes to a single JSON at ~/.satisfactory-calculator-tui/history.json.
// We keep the entries as strings (what was typed) so a calculation can be
// reopened exactly as it was.
//
// The persisted keys (mode values, field names like `nome`/`campos`/`resumo`)
// stay Portuguese on purpose: they are the on-disk data contract, so renaming
// them would break any history.json already saved.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { homedir } from "os";
import { join } from "path";

export type CalcMode = "clock" | "saida" | "entrada" | "layout";

export interface HistoryEntry {
  id: string;
  nome: string;
  modo: CalcMode;
  criadoEm: string; // ISO
  campos: Record<string, string>; // typed values, by field name
  resumo: string; // short line for the list
  clock: number | null; // relevant clock (for quick copy from history)
}

const DIR = join(homedir(), ".satisfactory-calculator-tui");
const FILE = join(DIR, "history.json");

function ensureDir(): void {
  if (!existsSync(DIR)) {
    mkdirSync(DIR, { recursive: true });
  }
}

export function loadHistory(): HistoryEntry[] {
  try {
    if (!existsSync(FILE)) return [];
    const data = JSON.parse(readFileSync(FILE, "utf8"));
    if (!Array.isArray(data)) return [];
    return data as HistoryEntry[];
  } catch {
    return [];
  }
}

function persist(list: HistoryEntry[]): void {
  ensureDir();
  writeFileSync(FILE, JSON.stringify(list, null, 2), "utf8");
}

function generateId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

/** Saves a new entry on top of the history and returns the updated list. */
export function saveEntry(
  entry: Omit<HistoryEntry, "id" | "criadoEm">,
): HistoryEntry[] {
  const complete: HistoryEntry = {
    ...entry,
    id: generateId(),
    criadoEm: new Date().toISOString(),
  };
  const list = [complete, ...loadHistory()];
  persist(list);
  return list;
}

export function removeEntry(id: string): HistoryEntry[] {
  const list = loadHistory().filter((e) => e.id !== id);
  persist(list);
  return list;
}

export function clearHistory(): HistoryEntry[] {
  persist([]);
  return [];
}

/** File path, just to show it on the history screen. */
export const HISTORY_PATH = FILE;
