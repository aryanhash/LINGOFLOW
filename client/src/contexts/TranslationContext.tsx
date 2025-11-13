import { createContext, useContext, useState, useEffect, ReactNode } from "react";

interface TranslationContextType {
  currentLanguage: string;
  setLanguage: (lang: string) => void;
  t: (key: string) => string;
  isLoading: boolean;
}

const TranslationContext = createContext<TranslationContextType | undefined>(undefined);

type Translations = Record<string, any>;

export function TranslationProvider({ children }: { children: ReactNode }) {
  const [currentLanguage, setCurrentLanguage] = useState("en");
  const [translations, setTranslations] = useState<Translations>({});
  const [baseTranslations, setBaseTranslations] = useState<Translations>({});
  const [isLoading, setIsLoading] = useState(true);

  // Load base English translations on mount (guaranteed fallback)
  useEffect(() => {
    const loadBaseTranslations = async () => {
      try {
        const response = await fetch("/locales/en.json");
        if (response.ok) {
          const data = await response.json();
          setBaseTranslations(data);
          // If current language is English, also set translations
          if (currentLanguage === "en") {
            setTranslations(data);
          }
        } else {
          console.error("Failed to load base English translations");
        }
      } catch (error) {
        console.error("Error loading base translations:", error);
      }
    };

    loadBaseTranslations();
  }, []);

  // Load saved language on mount
  useEffect(() => {
    const savedLanguage = localStorage.getItem("app-language") || "en";
    setCurrentLanguage(savedLanguage);
  }, []);

  // Load translations when language changes
  useEffect(() => {
    const loadTranslations = async () => {
      setIsLoading(true);
      try {
        if (currentLanguage === "en") {
          setTranslations(baseTranslations);
        } else {
          const response = await fetch(`/locales/${currentLanguage}.json`);
          if (response.ok) {
            const data = await response.json();
            setTranslations(data);
          } else {
            console.error(`Failed to load translations for ${currentLanguage}, falling back to English`);
            setTranslations(baseTranslations);
          }
        }
      } catch (error) {
        console.error("Error loading translations:", error);
        setTranslations(baseTranslations);
      } finally {
        setIsLoading(false);
      }
    };

    if (Object.keys(baseTranslations).length > 0) {
      loadTranslations();
    }
  }, [currentLanguage, baseTranslations]);

  const setLanguage = (lang: string) => {
    setCurrentLanguage(lang);
    localStorage.setItem("app-language", lang);
  };

  // Helper to get nested translation value
  const getNestedValue = (obj: any, path: string): string | undefined => {
    const keys = path.split(".");
    let current = obj;
    
    for (const key of keys) {
      if (current && typeof current === "object" && key in current) {
        current = current[key];
      } else {
        return undefined;
      }
    }
    
    return typeof current === "string" ? current : undefined;
  };

  const t = (key: string): string => {
    // Try to get from current language translations
    const translated = getNestedValue(translations, key);
    
    if (translated) {
      return translated;
    }
    
    // Fallback to English base translations if not found in current language
    const baseTranslated = getNestedValue(baseTranslations, key);
    
    if (baseTranslated) {
      return baseTranslated;
    }
    
    // Last resort: return a user-friendly fallback (capitalize the last part of the key)
    // Never expose raw key identifiers like "processing" to users
    const fallbackKey = key.split(".").pop() || key;
    // Capitalize first letter for better user experience
    return fallbackKey.charAt(0).toUpperCase() + fallbackKey.slice(1);
  };

  return (
    <TranslationContext.Provider value={{ currentLanguage, setLanguage, t, isLoading }}>
      {children}
    </TranslationContext.Provider>
  );
}

export function useTranslation() {
  const context = useContext(TranslationContext);
  if (!context) {
    throw new Error("useTranslation must be used within TranslationProvider");
  }
  return context;
}
