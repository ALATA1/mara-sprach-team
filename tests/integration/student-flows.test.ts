import assert from "node:assert/strict";
import { test } from "node:test";
import {
  adminClient,
  cancelSessionRegistration,
  countRegistrations,
  createActiveStudent,
  createFutureSession,
  deleteUser,
  ensureSupabaseReachable,
  isRegistered,
  loadLearningRecords,
  registerForSession,
  saveLearningRecord,
} from "./helpers/supabase";

test("active students can register, respect capacity, and reload learning records", async (context) => {
  try {
    await ensureSupabaseReachable();
  } catch (error) {
    context.skip(error instanceof Error ? error.message : "Supabase integration environment is unavailable.");
    return;
  }

  const admin = adminClient();
  let firstStudent: Awaited<ReturnType<typeof createActiveStudent>> | undefined;
  let secondStudent: Awaited<ReturnType<typeof createActiveStudent>> | undefined;
  const sessionIds: string[] = [];

  try {
    firstStudent = await createActiveStudent(admin, "student-flow");
    secondStudent = await createActiveStudent(admin, "student-flow");

    const registrationSession = await createFutureSession(admin, { capacity: 2 });
    sessionIds.push(registrationSession.sessionId);

    const directRegistration = await firstStudent.client.from("live_registrations").insert({
      live_session_id: registrationSession.sessionId,
      user_id: firstStudent.userId,
    });
    assert.equal(directRegistration.error?.code, "42501");

    const firstRegistration = await registerForSession(firstStudent.client, registrationSession.sessionId);
    assert.ifError(firstRegistration.error);
    assert.equal(await isRegistered(firstStudent.client, registrationSession.sessionId), true);

    const directCancellation = await firstStudent.client.from("live_registrations")
      .delete().eq("live_session_id", registrationSession.sessionId);
    assert.equal(directCancellation.error?.code, "42501");
    assert.equal(await isRegistered(firstStudent.client, registrationSession.sessionId), true);

    const duplicateRegistration = await registerForSession(firstStudent.client, registrationSession.sessionId);
    assert.ifError(duplicateRegistration.error);
    assert.equal(await countRegistrations(admin, registrationSession.sessionId), 1);

    const cancellation = await cancelSessionRegistration(firstStudent.client, registrationSession.sessionId);
    assert.ifError(cancellation.error);
    assert.equal(await isRegistered(firstStudent.client, registrationSession.sessionId), false);

    const capacitySession = await createFutureSession(admin, { capacity: 1 });
    sessionIds.push(capacitySession.sessionId);

    const firstCapacityRegistration = await registerForSession(firstStudent.client, capacitySession.sessionId);
    assert.ifError(firstCapacityRegistration.error);
    const { error: attendanceError } = await admin.from("live_attendance").upsert({
      live_session_id: capacitySession.sessionId,
      student_id: firstStudent.userId,
      attended: true,
      recorded_by: firstStudent.userId,
    }, { onConflict: "live_session_id,student_id" });
    assert.ifError(attendanceError);
    const { data: attendanceRow, error: attendanceLookupError } = await admin.from("live_attendance")
      .select("attended").eq("live_session_id", capacitySession.sessionId)
      .eq("student_id", firstStudent.userId).single();
    assert.ifError(attendanceLookupError);
    assert.equal(attendanceRow.attended, true);

    const rejectedRegistration = await registerForSession(secondStudent.client, capacitySession.sessionId);
    assert.equal(rejectedRegistration.error?.code, "23514");
    assert.equal(await countRegistrations(admin, capacitySession.sessionId), 1);

    const { error: cancelSessionError } = await admin.from("live_sessions")
      .update({ status: "cancelled" }).eq("id", capacitySession.sessionId);
    assert.ifError(cancelSessionError);
    const closedRegistration = await registerForSession(secondStudent.client, capacitySession.sessionId);
    assert.equal(closedRegistration.error?.code, "22023");

    const lessonSave = await saveLearningRecord(firstStudent.client, firstStudent.userId, {
      courseKey: "integration-test",
      itemType: "lesson",
      itemKey: "lesson-1",
    });
    assert.ifError(lessonSave.error);

    const quizSave = await saveLearningRecord(firstStudent.client, firstStudent.userId, {
      courseKey: "integration-test",
      itemType: "quiz",
      itemKey: "quiz-1",
      scorePercentage: 80,
    });
    assert.ifError(quizSave.error);

    const firstStudentRecords = await loadLearningRecords(firstStudent.client, "integration-test");
    assert.ifError(firstStudentRecords.error);
    assert.deepEqual(
      firstStudentRecords.data?.map(({ item_type, item_key, score_percentage }) => ({
        item_type,
        item_key,
        score_percentage,
      })).sort((left, right) => left.item_key.localeCompare(right.item_key)),
      [
        { item_type: "lesson", item_key: "lesson-1", score_percentage: null },
        { item_type: "quiz", item_key: "quiz-1", score_percentage: 80 },
      ],
    );

    const otherStudentRecords = await loadLearningRecords(secondStudent.client, "integration-test");
    assert.ifError(otherStudentRecords.error);
    assert.deepEqual(otherStudentRecords.data, []);
  } finally {
    for (const sessionId of sessionIds) {
      const { error } = await admin.from("live_sessions").delete().eq("id", sessionId);
      if (error) throw new Error(`Unable to clean up test session: ${error.message}`);
    }

    await removeStudent(admin, firstStudent);
    await removeStudent(admin, secondStudent);
  }
});

async function removeStudent(
  admin: ReturnType<typeof adminClient>,
  student: Awaited<ReturnType<typeof createActiveStudent>> | undefined,
): Promise<void> {
  if (student) await deleteUser(admin, student.userId);
}
