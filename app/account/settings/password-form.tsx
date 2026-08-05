"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";

import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";

interface PasswordFormValues {
  password: string;
  confirmPassword: string;
}

export function PasswordForm() {
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);
  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<PasswordFormValues>({ defaultValues: { password: "", confirmPassword: "" } });

  const password = watch("password");

  const onSubmit = handleSubmit(async (values) => {
    if (values.password !== values.confirmPassword) return;

    setIsSaving(true);
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.updateUser({ password: values.password });

      if (error) throw error;

      toast({ title: "Password updated" });
      reset();
    } catch (err) {
      toast({
        title: "Couldn't update password",
        description: err instanceof Error ? err.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  });

  return (
    <form onSubmit={onSubmit} className="space-y-4 max-w-sm">
      <div className="space-y-2">
        <Label htmlFor="password">New password</Label>
        <Input
          id="password"
          type="password"
          autoComplete="new-password"
          {...register("password", { required: true, minLength: 8 })}
        />
        {errors.password && (
          <p className="text-xs text-destructive">Password must be at least 8 characters.</p>
        )}
      </div>
      <div className="space-y-2">
        <Label htmlFor="confirmPassword">Confirm new password</Label>
        <Input
          id="confirmPassword"
          type="password"
          autoComplete="new-password"
          {...register("confirmPassword", {
            required: true,
            validate: (value) => value === password || "Passwords don't match",
          })}
        />
        {errors.confirmPassword && (
          <p className="text-xs text-destructive">{errors.confirmPassword.message}</p>
        )}
      </div>
      <Button type="submit" disabled={isSaving}>
        {isSaving ? "Updating…" : "Update password"}
      </Button>
    </form>
  );
}
