"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Facebook, Instagram } from "lucide-react";

import { APP_NAME } from "@/constants";

const FOOTER_COLUMNS: { title: string; links: { href: string; label: string }[] }[] = [
  {
    title: "Explore",
    links: [
      { href: "/search", label: "Find a stay" },
      { href: "/become-a-host", label: "Become a host" },
      { href: "/help", label: "Help center" },
    ],
  },
  {
    title: "Company",
    links: [
      { href: "/about", label: "About Pixenar Travel" },
      { href: "/contact", label: "Contact us" },
    ],
  },
  {
    title: "Legal",
    links: [
      { href: "/terms", label: "Terms of service" },
      { href: "/privacy", label: "Privacy policy" },
      { href: "/cancellation-policy", label: "Cancellation policy" },
      { href: "/host-terms", label: "Host terms" },
    ],
  },
];

interface FooterProps {
  embedded?: boolean;
}

export function Footer({ embedded = false }: FooterProps) {
  const pathname = usePathname();
  const isHome = pathname === "/";

  // On the homepage the footer is rendered inside the CTA's single shared
  // bedroom-backdrop wrapper. Suppress the global layout copy so the image
  // is not restarted a second time at the CTA/footer boundary.
  if (isHome && !embedded) return null;

  return (
    <footer className={`relative overflow-hidden text-white ${embedded ? "bg-transparent" : "bg-[#3F7F86]"}`}>
      {!embedded && (
        <>
          <div className="pointer-events-none absolute -right-32 -top-32 h-80 w-80 rounded-full bg-havena-gold/15 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-40 left-1/4 h-80 w-80 rounded-full bg-primary/15 blur-3xl" />
        </>
      )}

      <div className="container relative z-10 py-14">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-5">
          <div className="col-span-2">
            <Link href="/" className="font-display text-2xl font-semibold text-white drop-shadow-lg">
              {APP_NAME}
            </Link>
            <p className="mt-3 max-w-xs text-sm text-white/90 drop-shadow">
              Thoughtfully curated vacation rentals for travelers who want a stay that feels like home — and better.
            </p>
            <div className="mt-4 flex items-center gap-3">
              <a href="https://instagram.com" target="_blank" rel="noreferrer" aria-label="Pixenar Travel on Instagram" className="text-white/85 hover:text-white">
                <Instagram className="h-5 w-5" />
              </a>
              <a href="https://x.com" target="_blank" rel="noreferrer" aria-label="Pixenar Travel on X" className="text-white/85 hover:text-white">
                <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5 fill-current">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
              </a>
              <a href="https://facebook.com" target="_blank" rel="noreferrer" aria-label="Pixenar Travel on Facebook" className="text-white/85 hover:text-white">
                <Facebook className="h-5 w-5" />
              </a>
            </div>
          </div>

          {FOOTER_COLUMNS.map((column) => (
            <div key={column.title}>
              <h3 className="font-display text-sm font-semibold text-white drop-shadow">{column.title}</h3>
              <ul className="mt-3 space-y-2">
                {column.links.map((link) => (
                  <li key={link.href}>
                    <Link href={link.href} className="text-sm text-white/90 hover:text-white">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-10 border-t border-white/25 pt-6 text-xs text-white/80">
          &copy; {new Date().getFullYear()} {APP_NAME}, Inc. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
