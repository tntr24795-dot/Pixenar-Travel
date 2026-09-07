import Link from "next/link";
import { Facebook, Instagram, Twitter } from "lucide-react";

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

export function Footer() {
  return (
    <footer className="relative overflow-hidden bg-[#15566A] text-white">
      <div className="pointer-events-none absolute -right-32 -top-32 h-80 w-80 rounded-full bg-havena-gold/15 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-40 left-1/4 h-80 w-80 rounded-full bg-primary/15 blur-3xl" />
      <div className="container relative z-10 py-14">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-5">
          <div className="col-span-2">
            <Link
              href="/"
              className="font-display text-2xl font-semibold text-white drop-shadow-lg"
            >
              {APP_NAME}
            </Link>
            <p className="mt-3 max-w-xs text-sm text-white/85 drop-shadow">
              Thoughtfully curated vacation rentals for travelers who want a
              stay that feels like home — and better.
            </p>
            <div className="mt-4 flex items-center gap-3">
              <a
                href="https://instagram.com"
                target="_blank"
                rel="noreferrer"
                aria-label="Pixenar Travel on Instagram"
                className="text-white/85 hover:text-white"
              >
                <Instagram className="h-5 w-5" />
              </a>
              <a
                href="https://twitter.com"
                target="_blank"
                rel="noreferrer"
                aria-label="Pixenar Travel on Twitter"
                className="text-white/85 hover:text-white"
              >
                <Twitter className="h-5 w-5" />
              </a>
              <a
                href="https://facebook.com"
                target="_blank"
                rel="noreferrer"
                aria-label="Pixenar Travel on Facebook"
                className="text-white/85 hover:text-white"
              >
                <Facebook className="h-5 w-5" />
              </a>
            </div>
          </div>

          {FOOTER_COLUMNS.map((column) => (
            <div key={column.title}>
              <h3 className="font-display text-sm font-semibold text-white drop-shadow">
                {column.title}
              </h3>
              <ul className="mt-3 space-y-2">
                {column.links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-sm text-white/85 hover:text-white"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-10 border-t border-white/20 pt-6 text-xs text-white/70">
          &copy; {new Date().getFullYear()} {APP_NAME}, Inc. All rights
          reserved.
        </div>
      </div>
    </footer>
  );
}
