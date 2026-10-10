import type { Metadata, Viewport } from "next";
import { DM_Serif_Display, Inter, JetBrains_Mono } from "next/font/google";
import { getLocale, getMessages } from "next-intl/server";
import { NextIntlClientProvider } from "next-intl";
import { SessionProvider } from "@/components/session-provider";
import { SiteFooter } from "@/components/site-footer";
import { SunsetStripe } from "@/components/sunset-stripe";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

// PP Editorial Old is not available as a local project font. DM Serif Display
// provides the intended editorial contrast while retaining a safe serif fallback.
const dmSerif = DM_Serif_Display({
  variable: "--font-dm-serif",
  subsets: ["latin"],
  weight: "400",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Libro Mayor",
  description: "Gestión de gastos y OCR de recibos para contables y clientes",
  applicationName: "Libro Mayor",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Libro Mayor",
  },
};

export const viewport: Viewport = {
  themeColor: "#ff5a1f",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  // Resolved by src/i18n/request.ts (cookie, then session User.locale,
  // then 'en') and passed down from this Server Component so Client
  // Components (login form, admin/client pages) can call useTranslations.
  const locale = await getLocale();
  const messages = await getMessages();

  return (
    <html
      lang={locale}
      className={`${inter.variable} ${dmSerif.variable} ${jetbrainsMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-screen flex-col">
        <NextIntlClientProvider locale={locale} messages={messages}>
          <SessionProvider>{children}</SessionProvider>
        </NextIntlClientProvider>
        <SunsetStripe />
        <SiteFooter />
      </body>
    </html>
  );
}
