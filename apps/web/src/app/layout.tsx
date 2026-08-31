import type { Metadata } from "next";
import "./globals.css";
import { SessionRefresh } from "@/components/auth/session-refresh";

export const metadata: Metadata = {
  title: {
    default: "Gestão Engerádios 2.0",
    template: "%s | Gestão Engerádios 2.0",
  },
  description: "Portal corporativo integrado da Engerádios.",
  icons: {
    icon: "/brand/favicon.png",
    apple: "/brand/favicon.png",
  },
};

const themeScript = `
(function () {
  try {
    var saved = localStorage.getItem('engeradios-theme');
    var dark = saved
      ? saved === 'dark'
      : window.matchMedia('(prefers-color-scheme: dark)').matches;
    document.documentElement.classList.toggle('dark', dark);
  } catch (_) {}
})();
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        <SessionRefresh />
        {children}
      </body>
    </html>
  );
}
