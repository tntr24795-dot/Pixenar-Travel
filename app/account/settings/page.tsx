import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { PasswordForm } from "./password-form";
import { EmailPreferencesForm } from "./email-preferences-form";
import { DeactivateAccountSection } from "./deactivate-account-section";

export default async function SettingsPage() {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?redirect=/account/settings");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("status")
    .eq("id", user.id)
    .single();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl">Settings</h1>
        <p className="text-muted-foreground">Manage your password, email preferences, and account.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Password</CardTitle>
          <CardDescription>Change the password you use to sign in.</CardDescription>
        </CardHeader>
        <CardContent>
          <PasswordForm />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Email preferences</CardTitle>
          <CardDescription>Choose what Havena emails you about.</CardDescription>
        </CardHeader>
        <CardContent>
          <EmailPreferencesForm />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Deactivate account</CardTitle>
          <CardDescription>
            Temporarily deactivate your account. This doesn&apos;t delete your data.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Separator className="mb-4" />
          <DeactivateAccountSection userId={user.id} currentStatus={profile?.status ?? "active"} />
        </CardContent>
      </Card>
    </div>
  );
}
