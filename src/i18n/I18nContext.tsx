// React context that exposes the active locale and its message table.
//
// The locale is derived from the user's language preference (stored in config):
// "system" (or unset) defers to OS detection (see `detect.ts`), an explicit
// locale pins the language. Because the preference is passed in as a prop, the
// UI re-renders live when the language is changed on the settings screen.
import { createContext, useContext, useMemo, type ReactNode } from "react";
import { messages, type Locale, type LanguagePref, type Messages } from "./messages";
import { detectLocale } from "./detect";

interface I18nValue {
  locale: Locale;
  t: Messages;
}

const I18nContext = createContext<I18nValue | null>(null);

/** Resolves a stored preference to a concrete locale. */
export function resolveLocale(language: LanguagePref | undefined): Locale {
  return language && language !== "system" ? language : detectLocale();
}

export function I18nProvider({
  children,
  language,
}: {
  children: ReactNode;
  /** user's language preference; "system"/undefined → OS detection */
  language?: LanguagePref;
}) {
  const locale = useMemo(() => resolveLocale(language), [language]);
  const value = useMemo<I18nValue>(
    () => ({ locale, t: messages[locale] }),
    [locale],
  );
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nValue {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used within an I18nProvider");
  return ctx;
}

/** Shortcut for the common case: just the message table for the active locale. */
export function useT(): Messages {
  return useI18n().t;
}
