import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "Mara-Sprach Team",
  description: "Cours de français, cours d'allemand et accompagnement personnalisé",
  appleWebApp: {
    capable: true,
    title: "Mara-Sprach Team",
    statusBarStyle: "default",
  },
  icons: {
    apple: "/pwa/apple-touch-icon.png",
  },
};
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}
