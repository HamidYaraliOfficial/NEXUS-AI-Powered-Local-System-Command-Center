import en from "./en.json";
import fa from "./fa.json";
import zh from "./zh.json";

export type Lang = "en" | "fa" | "zh";

export const dictionaries: Record<Lang, Record<string, string>> = { en, fa, zh };

// Persian is RTL. English and Chinese are LTR.
export const direction: Record<Lang, "rtl" | "ltr"> = {
  en: "ltr",
  fa: "rtl",
  zh: "ltr",
};

export const languageNames: Record<Lang, string> = {
  en: "English",
  fa: "فارسی",
  zh: "中文",
};

export function translate(lang: Lang, key: string): string {
  return dictionaries[lang][key] ?? dictionaries.en[key] ?? key;
}
