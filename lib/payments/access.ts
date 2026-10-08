import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

type ServerSupabaseClient = NonNullable<Awaited<ReturnType<typeof createServerSupabaseClient>>>;

type CourseAccessResult =
  | { allowed: true; supabase: ServerSupabaseClient; userId: string }
  | { allowed: false; response: NextResponse };

export async function getCourseAccess(): Promise<CourseAccessResult> {
  const supabase = await createServerSupabaseClient();
  if (!supabase) {
    return {
      allowed: false,
      response: NextResponse.json({ error: "Supabase Auth n’est pas configuré." }, { status: 503 }),
    };
  }

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return {
      allowed: false,
      response: NextResponse.json({ error: "Connectez-vous pour accéder aux cours." }, { status: 401 }),
    };
  }

  const [{ data: profile, error: profileError }, { data: membership, error: membershipError }, { data: subscription, error: subscriptionError }] = await Promise.all([
    supabase.from("profiles").select("role").eq("id", user.id).maybeSingle(),
    supabase.from("memberships").select("status").eq("user_id", user.id).maybeSingle(),
    supabase.from("course_subscriptions").select("status").eq("user_id", user.id).eq("status", "active").maybeSingle(),
  ]);

  if (profileError || membershipError || subscriptionError) {
    return {
      allowed: false,
      response: NextResponse.json({ error: "Impossible de vérifier votre accès aux cours." }, { status: 503 }),
    };
  }

  if (profile?.role === "teacher" || profile?.role === "admin" ||
    (membership?.status === "active" && subscription?.status === "active")) {
    return { allowed: true, supabase, userId: user.id };
  }

  return {
    allowed: false,
    response: NextResponse.json({ error: "Un abonnement de cours actif est nécessaire." }, { status: 403 }),
  };
}
