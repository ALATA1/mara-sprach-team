import { readdir } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { getCourseAccess } from "@/lib/payments/access";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const allowedExtensions = new Set([".mp4", ".webm", ".ogg", ".mov"]);

export async function GET() {
  const access = await getCourseAccess();
  if (!access.allowed) return access.response;

  try {
    const directory = path.join(process.cwd(), "private", "course-videos");
    const files = await readdir(directory, { withFileTypes: true });
    const videos = files
      .filter((file) => file.isFile() && allowedExtensions.has(path.extname(file.name).toLowerCase()))
      .map((file) => {
        const title = path.basename(file.name, path.extname(file.name)).replace(/[-_]+/g, " ").trim();
        return { title, url: `/api/videos/${encodeURIComponent(file.name)}` };
      })
      .sort((first, second) => first.title.localeCompare(second.title, "fr", { numeric: true }));

    return NextResponse.json({ videos });
  } catch (error) {
    console.error("Unable to list private course videos", error);
    return NextResponse.json({ error: "Impossible de lire le dossier des cours vidéo." }, { status: 500 });
  }
}