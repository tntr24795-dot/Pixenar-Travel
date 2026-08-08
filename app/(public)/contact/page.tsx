import type { Metadata } from "next";
import { Mail } from "lucide-react";

import { APP_NAME } from "@/constants";
import { ContactForm } from "./contact-form";

export const metadata: Metadata = {
  title: `Contact Us — ${APP_NAME}`,
  description: `Get in touch with the ${APP_NAME} support team.`,
};

export default function ContactPage() {
  return (
    <div className="container max-w-3xl py-16">
      <h1 className="font-display text-4xl font-semibold tracking-tight text-foreground">
        Contact us
      </h1>
      <p className="mt-4 max-w-2xl text-foreground/90">
        Whether you have a question about a booking, a hosting inquiry, or
        feedback on the Platform, we&apos;d love to hear from you.
      </p>

      <div className="mt-6 flex items-center gap-2 text-sm text-muted-foreground">
        <Mail className="h-4 w-4" />
        <a href="mailto:support@pixenar-travel.com" className="hover:text-foreground">
          support@pixenar-travel.com
        </a>
      </div>

      <div className="mt-10">
        <ContactForm />
      </div>
    </div>
  );
}
