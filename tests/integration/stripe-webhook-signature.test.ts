import assert from "node:assert/strict";
import { createHmac, randomUUID } from "node:crypto";
import { test } from "node:test";
import { POST } from "../../app/api/webhooks/stripe/route";
import {
  anonKey,
  adminClient,
  deleteUser,
  ensureSupabaseReachable,
  serviceRoleKey,
  supabaseUrl,
} from "./helpers/supabase";

test("Stripe webhooks reject invalid signatures and accept a signed event", async (context) => {
  try {
    await ensureSupabaseReachable();
  } catch (error) {
    context.skip(error instanceof Error ? error.message : "Local Supabase is unavailable.");
    return;
  }

  configureLocalWebhook();

  const payload = JSON.stringify({
    id: "evt_local_webhook_signature_test",
    object: "event",
    api_version: "2025-09-30.clover",
    created: Math.floor(Date.now() / 1000),
    data: { object: { id: "cus_local_signature_test", object: "customer" } },
    livemode: false,
    pending_webhooks: 1,
    request: { id: null, idempotency_key: null },
    type: "customer.created",
  });
  const signature = signPayload(payload, process.env.STRIPE_WEBHOOK_SECRET);

  const missingSignature = await POST(new Request("http://localhost/api/webhooks/stripe", {
    method: "POST",
    body: payload,
  }));
  assert.equal(missingSignature.status, 400);

  const invalidSignature = await POST(new Request("http://localhost/api/webhooks/stripe", {
    method: "POST",
    body: payload,
    headers: { "stripe-signature": "t=1,v1=invalid" },
  }));
  assert.equal(invalidSignature.status, 400);

  const validSignature = await POST(new Request("http://localhost/api/webhooks/stripe", {
    method: "POST",
    body: payload,
    headers: { "stripe-signature": signature },
  }));
  assert.equal(validSignature.status, 200);
  assert.deepEqual(await validSignature.json(), { received: true });
});

test("signed Stripe refund updates synchronize local pending and failed states", async (context) => {
  try {
    await ensureSupabaseReachable();
  } catch (error) {
    context.skip(error instanceof Error ? error.message : "Local Supabase is unavailable.");
    return;
  }

  configureLocalWebhook();
  const admin = adminClient();
  const userEmail = `stripe-refund-webhook-${randomUUID()}@example.test`;
  const { data: userResult, error: userError } = await admin.auth.admin.createUser({
    email: userEmail,
    password: "Test-password-123",
    email_confirm: true,
  });
  if (userError || !userResult.user) {
    throw new Error(`Unable to create local webhook fixture: ${userError?.message ?? "no user returned"}`);
  }

  const userId = userResult.user.id;
  const paymentId = randomUUID();
  const requestId = randomUUID();
  try {
    const { error: paymentError } = await admin.from("payments").insert({
      id: paymentId,
      user_id: userId,
      provider: "stripe",
      product_type: "membership",
      status: "succeeded",
      amount_cents: 1000,
      currency: "eur",
    });
    assert.ifError(paymentError);

    const { error: actionError } = await admin.from("admin_refund_actions").insert({
      id: requestId,
      payment_id: paymentId,
      requested_by: userId,
      reason: "Local webhook integration test",
      status: "pending",
    });
    assert.ifError(actionError);

    for (const status of ["pending", "failed"] as const) {
      const payload = JSON.stringify({
        id: `evt_local_refund_${status}_${randomUUID()}`,
        object: "event",
        api_version: "2025-09-30.clover",
        created: Math.floor(Date.now() / 1000),
        data: {
          object: {
            id: "re_local_webhook_test",
            object: "refund",
            amount: 1000,
            charge: null,
            currency: "eur",
            metadata: { mara_refund_request_id: requestId },
            payment_intent: null,
            status,
          },
        },
        livemode: false,
        pending_webhooks: 1,
        request: { id: null, idempotency_key: null },
        type: "refund.updated",
      });
      const response = await POST(new Request("http://localhost/api/webhooks/stripe", {
        method: "POST",
        body: payload,
        headers: { "stripe-signature": signPayload(payload, process.env.STRIPE_WEBHOOK_SECRET) },
      }));
      assert.equal(response.status, 200);

      const { data: action, error: actionLookupError } = await admin.from("admin_refund_actions")
        .select("status").eq("id", requestId).single();
      assert.ifError(actionLookupError);
      assert.equal(action.status, status);
    }
  } finally {
    await admin.from("admin_refund_actions").delete().eq("id", requestId);
    await admin.from("payments").delete().eq("id", paymentId);
    await deleteUser(admin, userId);
  }
});

function configureLocalWebhook(): void {
  process.env.NEXT_PUBLIC_SUPABASE_URL = supabaseUrl();
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = anonKey();
  process.env.SUPABASE_SERVICE_ROLE_KEY = serviceRoleKey();
  process.env.STRIPE_SECRET_KEY = "sk_test_webhook_signature_only";
  process.env.STRIPE_WEBHOOK_SECRET = "whsec_local_webhook_signature_test";
}

function signPayload(payload: string, secret: string | undefined): string {
  assert.ok(secret);
  const timestamp = Math.floor(Date.now() / 1000);
  const digest = createHmac("sha256", secret)
    .update(`${timestamp}.${payload}`, "utf8")
    .digest("hex");
  return `t=${timestamp},v1=${digest}`;
}
