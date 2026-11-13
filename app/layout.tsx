import type { Metadata, Viewport } from "next";
import { Fraunces, Geist, Geist_Mono } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getLocale } from "next-intl/server";
import { SerwistProvider } from "@serwist/turbopack/react";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

// latin-ext covers the letters Yorùbá, Igbo and Hausa need (ọ, ṣ, ị, ɗ, ƙ, ...).
const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin", "latin-ext"],
});

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin", "latin-ext"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// TODO: translate the page metadata once the app title/description are final.
export const metadata: Metadata = {
  title: { default: "Aboyun", template: "%s | Aboyun" },
  description: "Spot danger early in pregnancy and after birth, and reach care.",
  applicationName: "Aboyun",
  icons: { apple: "/icons/apple-touch-icon.png" },
  appleWebApp: { capable: true, title: "Aboyun", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  themeColor: "#0f766e",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale();

  return (
    <html
      lang={locale}
      className={`${geistSans.variable} ${geistMono.variable} ${fraunces.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        <NextIntlClientProvider>
          <SerwistProvider
            swUrl="/serwist/sw.js"
            disable={process.env.NODE_ENV === "development"}
          >
            {children}
          </SerwistProvider>
          <Toaster />
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
