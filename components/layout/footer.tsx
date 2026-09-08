"use client";

import { usePathname } from "next/navigation";

import { FooterContent } from "@/components/layout/footer-content";

export function Footer() {
  const pathname = usePathname();

  // The homepage renders its footer inside the same bedroom-background
  // section as the host CTA so the photograph is one continuous image.
  if (pathname === "/") return null;

  return (
    <footer className="relative overflow-hidden bg-[#3F7F86] text-white">
      <div className="pointer-events-none absolute -right-32 -top-32 h-80 w-80 rounded-full bg-havena-gold/15 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-40 left-1/4 h-80 w-80 rounded-full bg-primary/15 blur-3xl" />
      <FooterContent />
    </footer>
  );
}
