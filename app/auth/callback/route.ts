import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const nextPath = requestUrl.searchParams.get("next") ?? "/";
  const safeNextPath = nextPath.startsWith("/") && !nextPath.startsWith("//") ? nextPath : "/";
  const client = await createServerSupabaseClient();

  if (!client || !code) {
    return NextResponse.redirect(new URL("/?auth=confirmation-error", requestUrl.origin));
  }

  const { error } = await client.auth.exchangeCodeForSession(code);
  if (error) {
    return NextResponse.redirect(new URL("/?auth=confirmation-error", requestUrl.origin));
  }

  return NextResponse.redirect(new URL(safeNextPath, requestUrl.origin));
}
