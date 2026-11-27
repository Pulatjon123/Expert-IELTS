import "server-only";
import { cookies } from "next/headers";
import { DICTS, LOCALES, type DictKey, type Locale } from "./dict";

export const LOCALE_COOKIE = "ei_locale";

export async function getLocale(): Promise<Locale> {
  const v = (await cookies()).get(LOCALE_COOKIE)?.value;
  return (LOCALES as readonly string[]).includes(v ?? "") ? (v as Locale) : "en";
}

export async function getT() {
  const locale = await getLocale();
  const dict = DICTS[locale];
  return { locale, t: (k: DictKey) => dict[k] };
}
