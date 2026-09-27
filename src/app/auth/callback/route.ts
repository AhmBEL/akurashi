import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/shared/lib/supabase/server";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const redirectTo = request.nextUrl.clone();
  redirectTo.pathname = "/";
  redirectTo.searchParams.delete("code");

  if (code) {
    const supabase = await createClient();
    await supabase.auth.exchangeCodeForSession(code);
  }

  return NextResponse.redirect(redirectTo);
}
