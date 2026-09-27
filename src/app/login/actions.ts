"use server";

import { createClient } from "@/shared/lib/supabase/server";

export async function sendMagicLinkAction(email: string): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"}/auth/callback`,
    },
  });
  return { error: error?.message ?? null };
}
