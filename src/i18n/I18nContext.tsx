// React context that exposes the active locale and its message table.
//
// The locale is detected once from the OS at startup (see `detect.ts`). A
// `setLocale` is provided so a future in-app language toggle can flip it live;
// nothing changes it today.
import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import { messages, type Locale, type Messages } from "./messages";
import { detectLocale } from "./detect";

interface I18nValue {
  locale: Locale;
  t: Messages;
  setLocale: (locale: Locale) => void;
}

const I18nContext = createContext<I18nValue | null>(null);

export function I18nProvider({
  children,
  locale: initial,
}: {
  children: ReactNode;
  /** force a locale (tests/overrides); defaults to OS detection */
  locale?: Locale;
}) {
  const [locale, setLocale] = useState<Locale>(() => initial ?? detectLocale());
  const value = useMemo<I18nValue>(
    () => ({ locale, t: messages[locale], setLocale }),
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
