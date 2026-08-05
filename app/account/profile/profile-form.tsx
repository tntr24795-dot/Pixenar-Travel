"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { updateProfile } from "./actions";

// Not using a Zod schema from lib/validation/schemas.ts here on purpose — there
// isn't a profile-edit schema defined there, and the task explicitly allows a
// simple inline shape for this form.
interface ProfileFormValues {
  firstName: string;
  lastName: string;
  phone: string;
  avatarUrl: string;
}

interface ProfileFormProps {
  defaultValues: ProfileFormValues;
}

export function ProfileForm({ defaultValues }: ProfileFormProps) {
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
  } = useForm<ProfileFormValues>({ defaultValues });

  const onSubmit = handleSubmit(async (values) => {
    setIsSaving(true);
    try {
      const result = await updateProfile(values);
      if (result.success) {
        toast({ title: "Profile updated" });
      } else {
        toast({
          title: "Couldn't update profile",
          description: result.error,
          variant: "destructive",
        });
      }
    } finally {
      setIsSaving(false);
    }
  });

  return (
    <form onSubmit={onSubmit} className="space-y-6 max-w-lg">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="firstName">First name</Label>
          <Input
            id="firstName"
            {...register("firstName", { maxLength: 60 })}
            aria-invalid={!!errors.firstName}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="lastName">Last name</Label>
          <Input
            id="lastName"
            {...register("lastName", { maxLength: 60 })}
            aria-invalid={!!errors.lastName}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="phone">Phone number</Label>
        <Input id="phone" type="tel" placeholder="(555) 123-4567" {...register("phone")} />
      </div>

      <div className="space-y-2">
        <Label htmlFor="avatarUrl">Avatar URL</Label>
        <Input
          id="avatarUrl"
          type="url"
          placeholder="https://…"
          {...register("avatarUrl")}
        />
        <p className="text-xs text-muted-foreground">
          Paste a link to a photo. Direct photo upload isn&apos;t part of this MVP.
        </p>
      </div>

      <Button type="submit" disabled={isSaving || !isDirty}>
        {isSaving ? "Saving…" : "Save changes"}
      </Button>
    </form>
  );
}
