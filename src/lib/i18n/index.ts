import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";

// Import translation files
import enCommon from "~/locales/en/common.json";
import frCommon from "~/locales/fr/common.json";
import esCommon from "~/locales/es/common.json";

// Supported languages configuration
export const supportedLanguages = ["en", "fr", "es"] as const;
export type SupportedLanguage = (typeof supportedLanguages)[number];

export const languageNames: Record<SupportedLanguage, string> = {
  en: "English",
  fr: "Français",
  es: "Español",
};

export const languageFlags: Record<SupportedLanguage, string> = {
  en: "🇺🇸",
  fr: "🇫🇷",
  es: "🇪🇸",
};

export const defaultLanguage: SupportedLanguage = "en";

// Language detection order and caching
const LANGUAGE_COOKIE_NAME = "ui-language";
const LANGUAGE_DETECTION_ORDER = ["cookie", "localStorage", "navigator", "htmlTag"];

// Resources bundled with the app
const resources = {
  en: {
    common: enCommon,
  },
  fr: {
    common: frCommon,
  },
  es: {
    common: esCommon,
  },
};

// Initialize i18next
i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: defaultLanguage,
    supportedLngs: supportedLanguages,
    defaultNS: "common",
    ns: ["common"],

    // Language detection options
    detection: {
      order: LANGUAGE_DETECTION_ORDER,
      lookupCookie: LANGUAGE_COOKIE_NAME,
      lookupLocalStorage: "ui-language",
      caches: ["cookie", "localStorage"],
      cookieMinutes: 525600, // 1 year
      cookieOptions: { path: "/", sameSite: "lax" },
    },

    interpolation: {
      escapeValue: false, // React already handles XSS
    },

    react: {
      useSuspense: false, // Disable suspense to avoid hydration issues with SSR
    },
  });

// Export helper function to check if a language is supported
export function isSupportedLanguage(lang: string): lang is SupportedLanguage {
  return supportedLanguages.includes(lang as SupportedLanguage);
}

// Export helper function to get language from cookie string
export function getLanguageFromCookie(cookieString: string): SupportedLanguage {
  const match = cookieString.match(new RegExp(`(^| )${LANGUAGE_COOKIE_NAME}=([^;]+)`));
  const lang = match?.[2];
  return lang && isSupportedLanguage(lang) ? lang : defaultLanguage;
}

export { LANGUAGE_COOKIE_NAME };
export default i18n;
