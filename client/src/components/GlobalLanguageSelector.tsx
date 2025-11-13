import { Globe } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useTranslation } from "@/contexts/TranslationContext";
import { languages as languagesList } from "@shared/schema";

export function GlobalLanguageSelector() {
  const { currentLanguage, setLanguage, t } = useTranslation();

  // Define languages array using shared schema and t() for names
  const languages = languagesList.map(lang => ({
    code: lang.code,
    name: t(`languages.${lang.code}`)
  }));

  const handleLanguageChange = (langCode: string) => {
    setLanguage(langCode);
    document.documentElement.lang = langCode;
  };

  const selectedLang = languages.find(lang => lang.code === currentLanguage) || languages[0];

  return (
    <Select value={currentLanguage} onValueChange={handleLanguageChange}>
      <SelectTrigger 
        className="w-[140px] bg-transparent border-border/50" 
        data-testid="select-global-language"
      >
        <div className="flex items-center gap-2">
          <Globe className="h-4 w-4" />
          <SelectValue>
            <span className="flex items-center gap-1.5">
              <span className="hidden sm:inline">{selectedLang.name}</span>
              <span className="sm:hidden">{selectedLang.code.toUpperCase()}</span>
            </span>
          </SelectValue>
        </div>
      </SelectTrigger>
      <SelectContent>
        {languages.map((lang) => (
          <SelectItem 
            key={lang.code} 
            value={lang.code}
            data-testid={`language-option-${lang.code}`}
          >
            {lang.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
