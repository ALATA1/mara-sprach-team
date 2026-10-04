import { NextResponse } from "next/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

const allowedTopics = new Set([
  "Cours d’allemand",
  "Accompagnement administratif",
  "Autre demande",
]);

const readText = (value: unknown, maxLength: number) =>
  typeof value === "string" ? value.trim().slice(0, maxLength) : "";

export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Le formulaire envoyé est invalide." }, { status: 400 });
  }

  if (readText(body.website, 200)) {
    return NextResponse.json({ received: true }, { status: 201 });
  }

  const fullName = readText(body.fullName, 120);
  const email = readText(body.email, 254);
  const phone = readText(body.phone, 25);
  const topic = readText(body.topic, 80);
  const subject = readText(body.subject, 160);
  const message = readText(body.message, 5000);
  const privacyAccepted = body.privacyAccepted === "true" || body.privacyAccepted === true;

  if (
    fullName.length < 2 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
    !/^[0-9+(). -]{7,25}$/.test(phone) ||
    !allowedTopics.has(topic) ||
    subject.length < 2 ||
    message.length < 10 ||
    !privacyAccepted
  ) {
    return NextResponse.json({ error: "Vérifiez les champs obligatoires et votre consentement." }, { status: 400 });
  }

  const resendApiKey = process.env.RESEND_API_KEY;
  const sender = process.env.CONTACT_EMAIL_FROM;
  if (!resendApiKey || !sender) {
    return NextResponse.json({ error: "L’envoi des messages n’est pas configuré. Appelez le +33 6 18 65 77 20." }, { status: 503 });
  }

  const emailResponse = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${resendApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: sender,
      to: ["celidoura@gmail.com"],
      reply_to: email,
      subject: `Contact - ${subject}`,
      text: [
        `Nom : ${fullName}`,
        `E-mail : ${email}`,
        `Téléphone : ${phone}`,
        `Sujet : ${topic}`,
        `Objet : ${subject}`,
        "",
        message,
      ].join("\\n"),
    }),
  });

  if (!emailResponse.ok) {
    return NextResponse.json({ error: "Votre message n’a pas pu être envoyé. Appelez le +33 6 18 65 77 20." }, { status: 503 });
  }

  const client = createSupabaseAdminClient();
  if (client) {
    await client.from("contact_messages").insert({
      full_name: fullName,
      email,
      phone,
      topic,
      subject,
      message,
    });
  }

  return NextResponse.json({ received: true }, { status: 201 });
}