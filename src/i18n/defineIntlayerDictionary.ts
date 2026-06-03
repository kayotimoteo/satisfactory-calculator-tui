import { getDictionary, t, type Dictionary } from "intlayer";
import type { Locale } from "./messages";

type LocaleRecord<T> = Record<Locale, T>;
type TranslationFn = (...args: never[]) => string;
type TranslationLeaf = string | TranslationFn;
type LocalizedContent<T> = T extends TranslationLeaf
  ? ReturnType<typeof t<T>>
  : { [K in keyof T]: LocalizedContent<T[K]> };

const FUNCTION_PLACEHOLDER = "__satisfactory_calculator_i18n_function__";

export function defineIntlayerDictionary<const T>(
  key: string,
  localizedContent: LocaleRecord<T>,
): Dictionary<T> {
  return {
    key,
    content: mapContent(localizedContent),
  } as unknown as Dictionary<T>;
}

export function resolveIntlayerDictionary<T>(
  dictionary: Dictionary<T>,
  locale: Locale,
  localizedContent: LocaleRecord<T>,
): T {
  const resolved = getDictionary(dictionary, locale) as T;
  return hydrateFunctionLeaves(resolved, localizedContent[locale]);
}

function mapContent<T>(localizedContent: LocaleRecord<T>): LocalizedContent<T> {
  const ptBR = localizedContent["pt-BR"];
  const enUS = localizedContent["en-US"];

  if (typeof ptBR === "function" && typeof enUS === "function") {
    return t({
      "pt-BR": FUNCTION_PLACEHOLDER,
      "en-US": FUNCTION_PLACEHOLDER,
    }) as LocalizedContent<T>;
  }

  if (typeof ptBR === "string" && typeof enUS === "string") {
    return t({
      "pt-BR": ptBR,
      "en-US": enUS,
    }) as LocalizedContent<T>;
  }

  if (!isPlainRecord(ptBR) || !isPlainRecord(enUS)) {
    throw new Error("Invalid i18n content: locale shapes must match.");
  }

  const content: Record<string, unknown> = {};
  for (const key of Object.keys(ptBR)) {
    content[key] = mapContent({
      "pt-BR": ptBR[key],
      "en-US": enUS[key],
    });
  }

  return content as LocalizedContent<T>;
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hydrateFunctionLeaves<T>(resolved: T, localized: T): T {
  if (typeof localized === "function") return localized;
  if (!isPlainRecord(resolved) || !isPlainRecord(localized)) return resolved;

  const hydrated: Record<string, unknown> = { ...resolved };
  for (const key of Object.keys(localized)) {
    hydrated[key] = hydrateFunctionLeaves(resolved[key], localized[key]);
  }

  return hydrated as T;
}
