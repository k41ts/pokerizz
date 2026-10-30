import type { Metadata, Viewport } from "next";
import { Michroma, Poppins } from "next/font/google";
import Script from "next/script";
import "./globals.css";

const poppins = Poppins({ variable: "--font-poppins", subsets: ["latin"], weight: ["400", "500", "600", "700"] });
const michroma = Michroma({ variable: "--font-michroma", subsets: ["latin"], weight: "400" });

export const metadata: Metadata = {
  title: "Kartu Duel",
  description: "A poker duel: play combos against friends or ranked opponents. The score gap becomes damage. Run out of HP and you lose.",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#d3d3d1" },
    { media: "(prefers-color-scheme: dark)", color: "#111113" },
  ],
};

// Applies a saved light/dark choice before the first paint, so the page never flashes the wrong theme.
const THEME_SCRIPT = `try{var t=localStorage.getItem("kartuduel:theme");if(t==="light"||t==="dark")document.documentElement.dataset.theme=t}catch(e){}`;

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${poppins.variable} ${michroma.variable}`} suppressHydrationWarning>
      <body className="font-sans antialiased">
        {children}
        <Script id="theme" strategy="beforeInteractive">
          {THEME_SCRIPT}
        </Script>
      </body>
    </html>
  );
}
