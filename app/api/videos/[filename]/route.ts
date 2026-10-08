import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { Readable } from "node:stream";
import path from "node:path";
import { NextResponse } from "next/server";
import { getCourseAccess } from "@/lib/payments/access";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const contentTypes: Record<string, string> = {
  ".mp4": "video/mp4",
  ".webm": "video/webm",
  ".ogg": "video/ogg",
  ".mov": "video/quicktime",
};

export async function GET(
  request: Request,
  { params }: { params: Promise<{ filename: string }> },
) {
  const access = await getCourseAccess();
  if (!access.allowed) return access.response;

  const { filename } = await params;
  const extension = path.extname(filename).toLowerCase();
  if (path.basename(filename) !== filename || !contentTypes[extension]) {
    return NextResponse.json({ error: "Cette vidéo n’existe pas." }, { status: 404 });
  }

  const filePath = path.join(process.cwd(), "private", "course-videos", filename);
  let fileStats;
  try {
    fileStats = await stat(filePath);
    if (!fileStats.isFile()) return NextResponse.json({ error: "Cette vidéo n’existe pas." }, { status: 404 });
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") {
      return NextResponse.json({ error: "Cette vidéo n’existe pas." }, { status: 404 });
    }
    console.error("Unable to inspect private course video", error);
    return NextResponse.json({ error: "Impossible de préparer la vidéo." }, { status: 500 });
  }

  let start = 0;
  let end = fileStats.size - 1;
  let status = 200;
  const range = request.headers.get("range");
  if (range) {
    const match = /^bytes=(\d*)-(\d*)$/.exec(range);
    if (!match || (!match[1] && !match[2])) {
      return new Response(null, { status: 416, headers: { "Content-Range": `bytes */${fileStats.size}` } });
    }

    if (match[1]) {
      start = Number(match[1]);
      if (match[2]) end = Number(match[2]);
    } else {
      const suffixLength = Number(match[2]);
      start = Math.max(fileStats.size - suffixLength, 0);
    }
    if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) ||
      start < 0 || start >= fileStats.size || end < start) {
      return new Response(null, { status: 416, headers: { "Content-Range": `bytes */${fileStats.size}` } });
    }
    end = Math.min(end, fileStats.size - 1);
    status = 206;
  }

  const stream = createReadStream(filePath, { start, end });
  return new Response(Readable.toWeb(stream) as ReadableStream<Uint8Array>, {
    status,
    headers: {
      "Accept-Ranges": "bytes",
      "Cache-Control": "private, no-store",
      "Content-Length": String(end - start + 1),
      "Content-Type": contentTypes[extension],
      ...(status === 206 ? { "Content-Range": `bytes ${start}-${end}/${fileStats.size}` } : {}),
    },
  });
}
