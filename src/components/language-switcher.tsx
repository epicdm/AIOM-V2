import { Languages, Check } from "lucide-react";
import { useTranslation } from "react-i18next";

import { Button } from "~/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";
import { useLanguage } from "~/components/language-provider";
import {
  supportedLanguages,
  languageNames,
  languageFlags,
  type SupportedLanguage,
} from "~/lib/i18n";
import { cn } from "~/lib/utils";

export function LanguageSwitcher() {
  const { language, setLanguage, isChangingLanguage } = useLanguage();
  const { t } = useTranslation();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          disabled={isChangingLanguage}
          aria-label={t("language.select")}
        >
          <Languages className="h-[1.2rem] w-[1.2rem]" />
          <span className="sr-only">{t("language.select")}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {supportedLanguages.map((lang) => (
          <DropdownMenuItem
            key={lang}
            onClick={() => setLanguage(lang)}
            className={cn(
              "flex items-center gap-2 cursor-pointer",
              language === lang && "bg-accent"
            )}
            data-testid={`language-option-${lang}`}
          >
            <span className="text-base" aria-hidden="true">
              {languageFlags[lang]}
            </span>
            <span className="flex-1">{languageNames[lang]}</span>
            {language === lang && (
              <Check className="h-4 w-4 text-primary" aria-hidden="true" />
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// Compact version for mobile or smaller spaces
export function LanguageSwitcherCompact() {
  const { language, setLanguage, isChangingLanguage } = useLanguage();
  const { t } = useTranslation();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          disabled={isChangingLanguage}
          className="gap-1 px-2"
          aria-label={t("language.select")}
        >
          <span className="text-base">{languageFlags[language]}</span>
          <span className="text-xs uppercase">{language}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {supportedLanguages.map((lang) => (
          <DropdownMenuItem
            key={lang}
            onClick={() => setLanguage(lang)}
            className={cn(
              "flex items-center gap-2 cursor-pointer",
              language === lang && "bg-accent"
            )}
            data-testid={`language-option-compact-${lang}`}
          >
            <span className="text-base" aria-hidden="true">
              {languageFlags[lang]}
            </span>
            <span className="flex-1">{languageNames[lang]}</span>
            {language === lang && (
              <Check className="h-4 w-4 text-primary" aria-hidden="true" />
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
