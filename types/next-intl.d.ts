import type { Locale } from "@/i18n/config";
import type en from "@/messages/en.json";

// Typed translation keys: English is the source of truth for the message shape.
declare module "next-intl" {
  interface AppConfig {
    Locale: Locale;
    Messages: typeof en;
  }
}
