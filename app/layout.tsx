import type { Metadata, Viewport } from "next";
import { Michroma, Poppins } from "next/font/google";
import "./globals.css";

const poppins = Poppins({ variable: "--font-poppins", subsets: ["latin"], weight: ["400", "500", "600", "700"] });
const michroma = Michroma({ variable: "--font-michroma", subsets: ["latin"], weight: "400" });

export const metadata: Metadata = {
  title: "Kartu Duel",
  description: "Adu kombinasi poker sama teman, beda device. Selisih skor jadi damage. HP habis, kalah.",
};

export const viewport: Viewport = {
  themeColor: "#d3d3d1",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="id" className={`${poppins.variable} ${michroma.variable}`}>
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
