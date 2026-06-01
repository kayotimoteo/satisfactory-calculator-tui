// Operating-system language detection.
//
// A TUI has no browser, navigator, cookies or URL — so Intlayer's web detection
// doesn't apply. We read what the runtime resolved from the OS (Bun/Node derive
// `Intl` defaults from the system locale, which is the reliable signal on
// Windows) and fall back to the usual POSIX env vars on Unix. An explicit
// `SFCALC_LANG` override always wins, handy for testing without changing the OS
// language (e.g. `SFCALC_LANG=en bun start`).
import type { Locale } from "./messages";

export const DEFAULT_LOCALE: Locale = "en-US";

export function detectLocale(): Locale {
  const raw =
    process.env.SFCALC_LANG ||
    process.env.LC_ALL ||
    process.env.LC_MESSAGES ||
    process.env.LANG ||
    process.env.LANGUAGE ||
    resolvedLocale() ||
    "";
  // Any Portuguese variant (pt, pt-BR, pt_PT, …) maps to Brazilian Portuguese;
  // everything else falls back to US English.
  return raw.toLowerCase().startsWith("pt") ? "pt-BR" : DEFAULT_LOCALE;
}

function resolvedLocale(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().locale;
  } catch {
    return "";
  }
}
