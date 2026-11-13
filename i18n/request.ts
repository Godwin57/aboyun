import { cookies, headers } from "next/headers";
import { getRequestConfig } from "next-intl/server";
import {
  defaultLocale,
  isLocale,
  LOCALE_COOKIE,
  localeFromAcceptLanguage,
  type Locale,
} from "./config";

// Locale comes from the cookie (set by the language toggle), then the browser's
// Accept-Language, then English. There is no /en/... in the URL.
export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  let locale: Locale = defaultLocale;

  if (isLocale(requested)) {
    locale = requested;
  } else {
    const fromCookie = (await cookies()).get(LOCALE_COOKIE)?.value;
    locale = isLocale(fromCookie)
      ? fromCookie
      : (localeFromAcceptLanguage((await headers()).get("accept-language")) ??
        defaultLocale);
  }

  return {
    locale,
    messages: (await import(`../messages/${locale}.json`)).default,
  };
});
