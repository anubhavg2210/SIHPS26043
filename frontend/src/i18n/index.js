import en from "./en.js";
import hi from "./hi.js";

export const translations = {
  en,
  hi,
};

/**
 * Nested key lookup with optional parameter interpolation
 * e.g. getTranslation("en", "report.successTitle", { id: 42 }) -> "Challenge #42 Registered Successfully"
 */
export function getTranslation(lang, keyPath, params = {}) {
  const dict = translations[lang] || translations.en;
  const fallbackDict = translations.en;

  const resolve = (obj, path) => {
    const parts = path.split(".");
    let current = obj;
    for (const part of parts) {
      if (current && typeof current === "object" && part in current) {
        current = current[part];
      } else {
        return undefined;
      }
    }
    return current;
  };

  let val = resolve(dict, keyPath);
  if (val === undefined) {
    val = resolve(fallbackDict, keyPath);
  }

  if (typeof val !== "string") {
    return val !== undefined ? val : keyPath;
  }

  // Parameter replacement: {name}, {id}
  return val.replace(/\{(\w+)\}/g, (_, k) => (params[k] !== undefined ? params[k] : `{${k}}`));
}
