import { randomUUID } from "node:crypto";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Integration-test harness for the student flows documented in Bilan.md:
 * LIVE enrolment/cancellation, capacity enforcement, learning-progression
 * persistence and quiz-score reload.
 *
 * It talks to a running Supabase instance (local `supabase start` by default)
 * through the same PostgREST endpoints and RPCs the application uses, with a
 * real signed-in student session, so the RLS policies and SECURITY DEFINER
 * functions are exercised instead of mocked.
 */

const DEFAULT_URL = "http://127.0.0.1:54321";
const DEFAULT_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0";
const DEFAULT_SERVICE_ROLE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJjr6Bl1rJGaBiTGBQ1Viw8LmSjw";

// Demo course seeded in supabase/seed.sql, used as the course_key for the
// student_learning_records rows created by these tests.
export const SEEDED_COURSE_KEY = "a10a0000-0000-4000-8000-000000000001";

export function supabaseUrl(): string {
  return process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? DEFAULT_URL;
}

export function anonKey(): string {
  return process.env.SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? DEFAULT_ANON_KEY;
}

export function serviceRoleKey(): string {
  return process.env.SUPABASE_SERVICE_ROLE_KEY ?? DEFAULT_SERVICE_ROLE_KEY;
}

/**
 * Throw a clear, actionable message when the local Supabase stack is not
 * running, instead of letting every test fail with an opaque fetch error.
 */
export async function ensureSupabaseReachable(): Promise<void> {
  const target = new URL(supabaseUrl());
  if (target.hostname !== "localhost" && target.hostname !== "127.0.0.1") {
    throw new Error(
      `Integration tests refuse non-local Supabase target ${target.hostname}. Use a local Supabase instance.`,
    );
  }

  let response: Response;
  try {
    response = await fetch(new URL("/auth/v1/health", supabaseUrl()), {
      headers: { apikey: anonKey() },
      signal: AbortSignal.timeout(4_000),
    });
  } catch {
    throw new Error(
      `Supabase is not reachable at ${supabaseUrl()}. Run "npx supabase start" ` +
        `(or point SUPABASE_URL / SUPABASE_ANON_KEY at a test project) before running the integration tests.`,
    );
  }
  if (!response.ok) {
    throw new Error(`Supabase health endpoint answered ${response.status}.`);
  }

  try {
    response = await fetch(new URL("/auth/v1/admin/users?page=1&per_page=1", supabaseUrl()), {
      headers: {
        apikey: serviceRoleKey(),
        authorization: `Bearer ${serviceRoleKey()}`,
      },
      signal: AbortSignal.timeout(4_000),
    });
  } catch {
    throw new Error(`Supabase is reachable, but its admin API could not be checked at ${supabaseUrl()}.`);
  }
  if (!response.ok) {
    throw new Error(
      `Supabase is reachable at ${supabaseUrl()}, but SUPABASE_SERVICE_ROLE_KEY is invalid or lacks admin access. ` +
        "Set the service-role key for the test project before running integration tests.",
    );
  }
}

export function adminClient(): SupabaseClient {
  return createClient(supabaseUrl(), serviceRoleKey(), {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

/**
 * Create a confirmed test student, an active membership and an active course
 * subscription so `public.has_course_access()` returns true — i.e. the
 * "active student account" required by the LIVE and progression endpoints.
 */
export async function createActiveStudent(admin: SupabaseClient, label: string) {
  const email = `${label}-${randomUUID()}@example.test`;
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password: "Test-password-123",
    email_confirm: true,
  });
  if (error || !data.user) {
    throw new Error(`Unable to create test student: ${error?.message ?? "no user returned"}`);
  }

  const userId = data.user.id;

  const { error: profileError } = await admin
    .from("profiles")
    .upsert({ id: userId, first_name: "Test", last_name: "Student", role: "beneficiary" }, { onConflict: "id" });
  if (profileError) throw new Error(`Unable to seed profile: ${profileError.message}`);

  const { error: membershipError } = await admin
    .from("memberships")
    .upsert({ user_id: userId, status: "active", activated_at: new Date().toISOString() }, { onConflict: "user_id" });
  if (membershipError) throw new Error(`Unable to seed membership: ${membershipError.message}`);

  const { error: subscriptionError } = await admin.from("course_subscriptions").insert({
    user_id: userId,
    provider: "stripe",
    provider_customer_id: `test-customer-${randomUUID()}`,
    provider_subscription_id: `test-subscription-${randomUUID()}`,
    plan_id: "standard",
    status: "active",
  });
  if (subscriptionError) throw new Error(`Unable to seed course subscription: ${subscriptionError.message}`);

  const client = createClient(supabaseUrl(), anonKey(), {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { error: signInError } = await client.auth.signInWithPassword({ email, password: "Test-password-123" });
  if (signInError) throw new Error(`Unable to sign in test student: ${signInError.message}`);

  return { userId, email, client };
}

/**
 * Insert a future live session with an explicit capacity. Past sessions must be
 * avoided because both registration and cancellation are closed once start_at
 * has passed.
 */
export async function createFutureSession(
  admin: SupabaseClient,
  options: { capacity: number; startOffsetMinutes?: number },
) {
  const startAt = new Date(Date.now() + (options.startOffsetMinutes ?? 60 * 24) * 60_000);
  const endAt = new Date(startAt.getTime() + 60 * 60_000);

  const { data, error } = await admin
    .from("live_sessions")
    .insert({
      title: `Test session ${randomUUID()}`,
      start_at: startAt.toISOString(),
      end_at: endAt.toISOString(),
      meeting_url: "https://example.test/teams-meeting",
      capacity: options.capacity,
    })
    .select("id")
    .single();
  if (error || !data) throw new Error(`Unable to create live session: ${error?.message ?? "no row returned"}`);

  return { sessionId: data.id as string, startAt, endAt };
}

/** Exercise the app's own POST /api/live/registrations handler semantics. */
export async function registerForSession(client: SupabaseClient, sessionId: string) {
  return client.rpc("register_for_live_session", { p_session_id: sessionId });
}

export async function cancelSessionRegistration(client: SupabaseClient, sessionId: string) {
  return client.rpc("cancel_live_session_registration", { p_session_id: sessionId });
}

export async function countRegistrations(admin: SupabaseClient, sessionId: string): Promise<number> {
  const { count, error } = await admin
    .from("live_registrations")
    .select("id", { count: "exact", head: true })
    .eq("live_session_id", sessionId);
  if (error) throw new Error(`Unable to count registrations: ${error.message}`);
  return count ?? 0;
}

export async function isRegistered(client: SupabaseClient, sessionId: string): Promise<boolean> {
  const { data, error } = await client
    .from("live_registrations")
    .select("id")
    .eq("live_session_id", sessionId);
  if (error) throw new Error(`Unable to read own registration: ${error.message}`);
  return (data?.length ?? 0) > 0;
}

/**
 * Mirror of the upsert performed by POST /api/learning/records — same payload,
 * same onConflict target, same row shape.
 */
export async function saveLearningRecord(
  client: SupabaseClient,
  userId: string,
  record: { courseKey: string; itemType: "lesson" | "quiz"; itemKey: string; scorePercentage?: number },
) {
  const isLesson = record.itemType === "lesson";
  return client
    .from("student_learning_records")
    .upsert(
      {
        user_id: userId,
        course_key: record.courseKey,
        item_type: record.itemType,
        item_key: record.itemKey,
        score_percentage: isLesson ? null : record.scorePercentage,
        ...(isLesson ? { completed_at: new Date().toISOString() } : {}),
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,course_key,item_type,item_key" },
    )
    .select("course_key, item_type, item_key, score_percentage, completed_at, updated_at")
    .single();
}

/** Re-read a student's records as if they had just signed in on a second device. */
export async function loadLearningRecords(client: SupabaseClient, courseKey: string) {
  return client
    .from("student_learning_records")
    .select("item_type, item_key, score_percentage, completed_at")
    .eq("course_key", courseKey);
}

export async function deleteUser(admin: SupabaseClient, userId: string): Promise<void> {
  const { error } = await admin.auth.admin.deleteUser(userId);
  if (error) throw new Error(`Unable to delete test student: ${error.message}`);
}
