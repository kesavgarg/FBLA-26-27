import type { Metadata, Viewport } from "next";
import { cookies } from "next/headers";
import { DemoBanner, SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { fraunces, inter } from "@/lib/fonts";
import { I18nProvider } from "@/lib/i18n/provider";
import { getDictionary } from "@/lib/i18n/server";
import { DISPLAY_COOKIE, decodeDisplay, displayAttributes } from "@/lib/preferences/display";
import "./globals.css";


export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getDictionary();
  return {
    title: { default: t.meta.title, template: `%s · Goodson Drug Co.` },
    description: t.meta.description,
    robots: { index: false, follow: false }, // student demo: keep out of search engines
  };
}

export const viewport: Viewport = {
  themeColor: "#ffffff",
  width: "device-width",
  initialScale: 1,
};

/**
 * Root layout shared by every page: language, accessibility mode, the demo
 * banner, header and footer. Display preferences are applied on the server so
 * a Large Text user never sees the page flash at the small size first.
 */
export default async function RootLayout({ children }: LayoutProps<"/">) {
  const [{ locale, t }, cookieStore] = await Promise.all([getDictionary(), cookies()]);
  const display = decodeDisplay(cookieStore.get(DISPLAY_COOKIE)?.value);

  return (
    <html lang={locale} className={`${inter.variable} ${fraunces.variable}`} {...displayAttributes(display)}>
      <body className="flex min-h-dvh flex-col">
        <I18nProvider value={{ locale, t }}>
          <DemoBanner />
          <SiteHeader display={display} />
          <main id="main" tabIndex={-1} className="flex flex-1 flex-col outline-none">
            {children}
          </main>
          <SiteFooter />
        </I18nProvider>
      </body>
    </html>
  );
}
