import { Check } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { languages, type LanguageCode } from "@shared/schema";
import { useTranslation } from "@/contexts/TranslationContext";

interface LanguageSelectorProps {
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  testId?: string;
}

export function LanguageSelector({
  value,
  onValueChange,
  placeholder,
  disabled = false,
  testId = "select-language",
}: LanguageSelectorProps) {
  const { t } = useTranslation();
  
  const defaultPlaceholder = placeholder || t("common.selectLanguage");
  
  return (
    <Select value={value} onValueChange={onValueChange} disabled={disabled}>
      <SelectTrigger className="w-full" data-testid={testId}>
        <SelectValue placeholder={defaultPlaceholder} />
      </SelectTrigger>
      <SelectContent>
        {languages.map((lang) => (
          <SelectItem key={lang.code} value={lang.code} data-testid={`option-${lang.code}`}>
            {t(`languages.${lang.code}`)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
