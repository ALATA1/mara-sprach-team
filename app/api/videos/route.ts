import { readdir } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const allowedExtensions = new Set([".mp4", ".webm", ".ogg", ".mov"]);

export async function GET() {
  try {
    const directory = path.join(process.cwd(), "public", "Videos");
    const files = await readdir(directory, { withFileTypes: true });
    const videos = files
      .filter((file) => file.isFile() && allowedExtensions.has(path.extname(file.name).toLowerCase()))
      .map((file) => {
        const title = path.basename(file.name, path.extname(file.name)).replace(/[-_]+/g, " ").trim();
        return { title, url: `/Videos/${encodeURIComponent(file.name)}` };
      })
      .sort((first, second) => first.title.localeCompare(second.title, "fr", { numeric: true }));

    return NextResponse.json({ videos });
  } catch {
    return NextResponse.json({ error: "Impossible de lire le dossier des cours vidéo." }, { status: 500 });
  }
}