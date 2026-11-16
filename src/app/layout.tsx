import type { Metadata, Viewport } from "next";
import "./globals.css";
import { getPublishedTheme, generateThemeCssVariables } from "@/lib/theme/render";
import { getCachedStoreSettings } from "@/lib/cache";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#ffffff",
};

export async function generateMetadata(): Promise<Metadata> {
  let name = "Boutique en ligne";
  let tagline = "";

  try {
    const settings = await getCachedStoreSettings();
    if (settings) {
      if (settings.storeName) name = settings.storeName;
      if (settings.tagline) tagline = settings.tagline;
    }
  } catch {}

  return {
    title: tagline ? `${name} — ${tagline}` : name,
    description: tagline || `Bienvenue sur ${name}`,
    appleWebApp: {
      capable: true,
      statusBarStyle: "default",
      title: name,
    },
    icons: {
      icon: [
        { url: "/icons/favicon-32x32.png", sizes: "32x32", type: "image/png" },
        { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
        { url: "/favicon.ico", sizes: "any" },
      ],
      shortcut: "/favicon.ico",
      apple: [
        { url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
      ],
    },
    formatDetection: {
      telephone: false,
    },
  };
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const theme = await getPublishedTheme();
  const themeCss = generateThemeCssVariables(theme.settings);

  return (
    <html lang="fr" suppressHydrationWarning>
      <head>
        <style dangerouslySetInnerHTML={{ __html: `:root { ${themeCss} }` }} />
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="icon" type="image/png" sizes="32x32" href="/icons/favicon-32x32.png" />
        <link rel="icon" type="image/png" sizes="192x192" href="/icons/icon-192.png" />
        <link rel="apple-touch-icon" sizes="180x180" href="/icons/apple-touch-icon.png" />
        <link rel="manifest" href="/manifest.json" />
      </head>
      <body className="min-h-screen flex flex-col antialiased selection:bg-black selection:text-white">
        {children}
      </body>
    </html>
  );
}

