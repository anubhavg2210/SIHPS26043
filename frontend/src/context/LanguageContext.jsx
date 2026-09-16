import { useState, useEffect, useCallback } from "react";
import { getTranslation } from "../i18n/index.js";
import { LanguageContext } from "./useTranslation.js";

const STORAGE_KEY = "civicsync_lang";

export function LanguageProvider({ children }) {
  const [language, setLanguageState] = useState(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) || "en";
    } catch {
      return "en";
    }
  });

  const setLanguage = (lang) => {
    const validLang = lang === "hi" ? "hi" : "en";
    setLanguageState(validLang);
    try {
      localStorage.setItem(STORAGE_KEY, validLang);
    } catch (e) {
      console.error("Failed to save language to localStorage:", e);
    }
  };

  const t = useCallback(
    (keyPath, params = {}) => {
      return getTranslation(language, keyPath, params);
    },
    [language]
  );

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}
