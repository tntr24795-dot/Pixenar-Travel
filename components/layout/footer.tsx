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

/**
 * NOTE: this footer renders on every page site-wide (see app/layout.tsx),
 * not just the homepage -- it now shares the same living-room photo
 * background as the homepage's Hero/CTA sections, per the site-wide "no
 * opaque boxes, everything floats on the photo" direction. If a plainer
 * footer is wanted specifically on non-marketing pages (search, dashboards,
 * account/admin screens), that would need a second footer variant --
 * ask and I'll split it out.
 */
export function Footer() {
  return (
    <footer
      className="relative bg-cover bg-fixed text-white"
      style={{ backgroundImage: "url(/hero-living-room.jpg)", backgroundPosition: "center 80%" }}
    >
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-havena-ink/70 via-havena-ink/60 to-havena-ink/80" />
      <div className="container relative z-10 py-12">
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
