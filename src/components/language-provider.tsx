import { createServerFn } from "@tanstack/react-start";
import { createContext, useContext, useEffect, useCallback } from "react";
import { z } from "zod";
import { getCookie, setCookie } from "@tanstack/react-start/server";
import { useLanguageQuery, useSetLanguage } from "~/hooks/useLanguage";
import { useTranslation } from "react-i18next";
import {
  type SupportedLanguage,
  supportedLanguages,
  defaultLanguage,
  LANGUAGE_COOKIE_NAME,
} from "~/lib/i18n";

type LanguageProviderProps = {
  children: React.ReactNode;
};

type LanguageProviderState = {
  language: SupportedLanguage;
  setLanguage: (language: SupportedLanguage) => void;
  isChangingLanguage: boolean;
};

const initialState: LanguageProviderState = {
  language: defaultLanguage,
  setLanguage: () => null,
  isChangingLanguage: false,
};

const LanguageProviderContext =
  createContext<LanguageProviderState>(initialState);

// Server function to get language from cookie
export const getLanguageFn = createServerFn().handler(async () => {
  const language = getCookie(LANGUAGE_COOKIE_NAME);
  if (language && supportedLanguages.includes(language as SupportedLanguage)) {
    return language as SupportedLanguage;
  }
  return defaultLanguage;
});

// Server function to set language cookie
export const setLanguageFn = createServerFn({ method: "POST" })
  .inputValidator(z.object({ language: z.enum(supportedLanguages) }))
  .handler(async ({ data }) => {
    setCookie(LANGUAGE_COOKIE_NAME, data.language, {
      maxAge: 60 * 60 * 24 * 365, // 1 year
      path: "/",
      sameSite: "lax",
    });
    return data.language;
  });

export function LanguageProvider({ children }: LanguageProviderProps) {
  const languageQuery = useLanguageQuery();
  const setLanguageMutation = useSetLanguage();
  const { i18n } = useTranslation();

  // Sync i18next with the stored language on mount
  useEffect(() => {
    if (languageQuery.data && languageQuery.data !== i18n.language) {
      i18n.changeLanguage(languageQuery.data);
    }
  }, [languageQuery.data, i18n]);

  const handleSetLanguage = useCallback(
    (language: SupportedLanguage) => {
      // Change i18next language immediately for instant UI update
      i18n.changeLanguage(language);

      // Persist to cookie via server function
      setLanguageMutation.mutate(
        { data: { language } },
        {
          onSuccess: () => {
            languageQuery.refetch();
          },
        }
      );
    },
    [i18n, setLanguageMutation, languageQuery]
  );

  const value: LanguageProviderState = {
    language: (languageQuery.data as SupportedLanguage) || defaultLanguage,
    setLanguage: handleSetLanguage,
    isChangingLanguage: setLanguageMutation.isPending,
  };

  return (
    <LanguageProviderContext.Provider value={value}>
      {children}
    </LanguageProviderContext.Provider>
  );
}

export const useLanguage = () => {
  const context = useContext(LanguageProviderContext);

  if (context === undefined) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }

  return context;
};
