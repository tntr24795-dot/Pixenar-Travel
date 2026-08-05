"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";

import { createClient } from "@/lib/supabase/client";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";

interface HostBioFormProps {
  hostProfileId: string;
  initialBio: string;
}

export function HostBioForm({ hostProfileId, initialBio }: HostBioFormProps) {
  const [bio, setBio] = useState(initialBio);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  async function handleSave() {
    setSaving(true);
    const supabase = createClient();
    const { error } = await supabase
      .from("host_profiles")
      .update({ bio })
      .eq("id", hostProfileId);
    setSaving(false);

    if (error) {
      toast({ title: "Couldn't save bio", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Bio updated" });
  }

  return (
    <div className="space-y-3">
      <Label htmlFor="bio">About you</Label>
      <Textarea
        id="bio"
        rows={5}
        value={bio}
        onChange={(e) => setBio(e.target.value)}
        placeholder="Tell guests a little about yourself as a host..."
      />
      <Button onClick={handleSave} disabled={saving}>
        {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
        Save bio
      </Button>
    </div>
  );
}
