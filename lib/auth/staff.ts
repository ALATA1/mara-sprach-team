import { NextResponse } from "next/server";
import type { User } from "@supabase/supabase-js";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export type StaffRole = "teacher" | "volunteer" | "admin";

export type StaffContext = {
  user: User;
  role: StaffRole;
  admin: NonNullable<ReturnType<typeof createSupabaseAdminClient>>;
};

type StaffAuthorization =
  | { context: StaffContext; response?: never }
  | { context?: never; response: NextResponse };

export async function authorizeStaff(roles: readonly StaffRole[]): Promise<StaffAuthorization> {
  const supabase = await createServerSupabaseClient();
  if (!supabase) {
    return { response: NextResponse.json({ error: "Supabase Auth n’est pas configuré." }, { status: 503 }) };
  }

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return { response: NextResponse.json({ error: "Connectez-vous pour accéder à cet espace." }, { status: 401 }) };
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  if (profileError || !profile) {
    return { response: NextResponse.json({ error: "Impossible de vérifier les droits du compte." }, { status: 503 }) };
  }
  if (!roles.includes(profile.role as StaffRole)) {
    return { response: NextResponse.json({ error: "Vous n’avez pas les droits pour cette opération." }, { status: 403 }) };
  }

  const admin = createSupabaseAdminClient();
  if (!admin) {
    return { response: NextResponse.json({ error: "La clé serveur Supabase n’est pas configurée." }, { status: 503 }) };
  }

  return { context: { user, role: profile.role as StaffRole, admin } };
}
