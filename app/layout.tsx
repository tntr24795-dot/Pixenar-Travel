import type { Metadata, Viewport } from "next";
import { Fraunces, Inter } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { Toaster } from "@/components/ui/toaster";

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Pixenar Travel — Vacation Rental Marketplace",
  description:
    "Pixenar Travel is a boutique vacation-rental marketplace — discover thoughtfully curated stays and host your own place with confidence.",
};

// This site only has a light design -- no dark theme is actually implemented
// anywhere in the CSS. Explicitly declaring `colorScheme: "light"` (renders
// as `<meta name="color-scheme" content="light">`) tells iOS/macOS Safari
// (and other browsers) not to apply any automatic Dark Mode treatment of its
// own to unstyled/transparent regions -- most notably the 3D hero's
// `<canvas>`, which is what was causing the "background turns solid black in
// iOS Dark Mode" bug. See `components/three/world.ts` for the full writeup
// and the matching fix on the WebGL side.
export const viewport: Viewport = {
  colorScheme: "light",
  themeColor: "#0B0E14",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={cn(fraunces.variable, inter.variable)}>
      <body className="min-h-screen flex flex-col font-sans antialiased">
        <Navbar />
        <main className="flex-1">{children}</main>
        <Footer />
        <Toaster />
      </body>
    </html>
  );
}
