import assert from "node:assert/strict";
import { test } from "node:test";
import {
  adminClient,
  createActiveStudent,
  deleteUser,
  ensureSupabaseReachable,
} from "./helpers/supabase";

test("administrator role changes are audited and the last administrator is protected", async (context) => {
  try {
    await ensureSupabaseReachable();
  } catch (error) {
    context.skip(error instanceof Error ? error.message : "Supabase integration environment is unavailable.");
    return;
  }

  const admin = adminClient();
  let adminUserId: string | undefined;
  let student: Awaited<ReturnType<typeof createActiveStudent>> | undefined;

  try {
    const { data, error } = await admin.auth.admin.createUser({
      email: `admin-role-test-${crypto.randomUUID()}@example.test`,
      password: "Test-password-123",
      email_confirm: true,
    });
    if (error || !data.user) throw new Error(`Unable to create test administrator: ${error?.message ?? "no user returned"}`);
    adminUserId = data.user.id;

    const { error: profileError } = await admin.from("profiles")
      .upsert({ id: adminUserId, first_name: "Test", last_name: "Admin", role: "admin" }, { onConflict: "id" });
    if (profileError) throw new Error(`Unable to seed test administrator: ${profileError.message}`);

    student = await createActiveStudent(admin, "admin-role-target");
    const { error: promotionError } = await admin.rpc("admin_set_profile_role", {
      p_actor_id: adminUserId,
      p_target_id: student.userId,
      p_new_role: "volunteer",
    });
    assert.ifError(promotionError);

    const { data: promotedProfile, error: promotedProfileError } = await admin.from("profiles")
      .select("role").eq("id", student.userId).single();
    assert.ifError(promotedProfileError);
    assert.equal(promotedProfile.role, "volunteer");

    const { data: supportRequest, error: requestError } = await student.client.from("support_requests")
      .insert({
        user_id: student.userId,
        type: "Integration",
        subject: "Test de suivi",
        description: "Demande temporaire créée par un test d'intégration.",
      })
      .select("id")
      .single();
    assert.ifError(requestError);
    assert.ok(supportRequest);
    const unauthorizedRequestUpdate = await student.client.from("support_requests")
      .update({ status: "closed" }).eq("id", supportRequest.id);
    assert.equal(unauthorizedRequestUpdate.error?.code, "42501");
    const { data: unchangedRequest, error: unchangedRequestError } = await student.client
      .from("support_requests").select("status").eq("id", supportRequest.id).single();
    assert.ifError(unchangedRequestError);
    assert.equal(unchangedRequest.status, "submitted");
    const { error: assignmentError } = await admin.from("support_requests").update({
      volunteer_id: student.userId,
      status: "assigned",
    }).eq("id", supportRequest.id);
    assert.ifError(assignmentError);
    const { error: progressError } = await admin.from("support_requests").update({
      status: "in_progress",
    }).eq("id", supportRequest.id).eq("volunteer_id", student.userId);
    assert.ifError(progressError);
    const { data: ownRequest, error: ownRequestError } = await student.client.from("support_requests")
      .select("status").eq("id", supportRequest.id).single();
    assert.ifError(ownRequestError);
    assert.equal(ownRequest.status, "in_progress");

    const { data: audit, error: auditError } = await admin.from("staff_audit_log")
      .select("action, target_id").eq("target_id", student.userId).single();
    assert.ifError(auditError);
    assert.equal(audit.action, "profile.role.updated");

    const { count, error: countError } = await admin.from("profiles")
      .select("id", { count: "exact", head: true }).eq("role", "admin");
    assert.ifError(countError);
    if (count === 1) {
      const { error: lastAdminError } = await admin.rpc("admin_set_profile_role", {
        p_actor_id: adminUserId,
        p_target_id: adminUserId,
        p_new_role: "teacher",
      });
      assert.equal(lastAdminError?.code, "23514");
    }

    const { error: unauthorizedError } = await admin.rpc("admin_set_profile_role", {
      p_actor_id: student.userId,
      p_target_id: adminUserId,
      p_new_role: "beneficiary",
    });
    assert.equal(unauthorizedError?.code, "42501");
  } finally {
    if (student) await deleteUser(admin, student.userId);
    if (adminUserId) await deleteUser(admin, adminUserId);
  }
});
