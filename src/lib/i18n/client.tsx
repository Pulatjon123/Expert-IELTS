"use client";
import { createContext, useContext } from "react";
import { DICTS, type DictKey, type Locale } from "./dict";

const Ctx = createContext<Locale>("en");

export function I18nProvider({ locale, children }: { locale: Locale; children: React.ReactNode }) {
  return <Ctx.Provider value={locale}>{children}</Ctx.Provider>;
}

export function useI18n() {
  const locale = useContext(Ctx);
  const dict = DICTS[locale];
  return { locale, t: (k: DictKey) => dict[k] };
}
