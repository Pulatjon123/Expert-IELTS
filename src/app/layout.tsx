import type { Metadata } from "next";
import { Geist, Geist_Mono, Fraunces } from "next/font/google";
import "./globals.css";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { I18nProvider } from "@/lib/i18n/client";
import { getT } from "@/lib/i18n/server";
import { Announcements } from "@/components/Announcements";
import { PageViewTracker } from "@/components/PageViewTracker";
import { PracticeReminder } from "@/components/PracticeReminder";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin", "latin-ext"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });
const fraunces = Fraunces({ variable: "--font-fraunces", subsets: ["latin", "latin-ext"], weight: ["500", "600", "700"] });

export const metadata: Metadata = {
  title: { default: "Expert IELTS — Free AI IELTS Writing & Speaking Coach", template: "%s · Expert IELTS" },
  description: "Your Free AI-Powered IELTS Writing & Speaking Coach. 100% free for every student.",
};

const themeScript = `try{var t=localStorage.getItem('ei_theme');if(t==='dark'||(!t&&matchMedia('(prefers-color-scheme: dark)').matches))document.documentElement.classList.add('dark')}catch(e){}`;

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const { locale, t } = await getT();
  return (
    <html lang={locale} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} ${fraunces.variable} min-h-screen antialiased`}>
        <I18nProvider locale={locale}>
          <Header />
          <Announcements />
          <PracticeReminder />
          <main>{children}</main>
          <Footer freeLine={t("common.free")} />
          <PageViewTracker />
        </I18nProvider>
      </body>
    </html>
  );
}
