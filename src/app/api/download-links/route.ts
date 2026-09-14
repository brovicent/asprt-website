import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { downloadLinks } from "@/db/schema";
import { requireAdmin, handleApiError } from "@/lib/auth";
import { eq } from "drizzle-orm";

// Only allow http/https URLs to prevent javascript: or data: URI injection
const URL_REGEX = /^https?:\/\/.+/i;

export async function POST(request: NextRequest) {
  try {
    await requireAdmin();
    const body = await request.json();
    const { movieId, quality, episode, size, host, url } = body;

    if (!movieId || !quality || !host || !url) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Validate movieId is a positive integer
    const parsedMovieId = parseInt(String(movieId), 10);
    if (isNaN(parsedMovieId) || parsedMovieId <= 0) {
      return NextResponse.json(
        { error: "Invalid movie ID" },
        { status: 400 }
      );
    }

    // Validate URL must be http/https to prevent javascript: or data: injection
    if (typeof url !== "string" || !URL_REGEX.test(url.trim())) {
      return NextResponse.json(
        { error: "URL must start with http:// or https://" },
        { status: 400 }
      );
    }

    // Sanitize host and quality
    if (typeof host !== "string" || host.trim().length === 0 || host.length > 100) {
      return NextResponse.json(
        { error: "Host must be between 1 and 100 characters" },
        { status: 400 }
      );
    }

    if (typeof quality !== "string" || quality.trim().length === 0 || quality.length > 50) {
      return NextResponse.json(
        { error: "Quality must be between 1 and 50 characters" },
        { status: 400 }
      );
    }

    const [result] = await db
      .insert(downloadLinks)
      .values({
        movieId: parsedMovieId,
        quality: quality.trim(),
        episode: episode ? String(episode).trim() : undefined,
        size: size ? String(size).trim() : undefined,
        host: host.trim(),
        url: url.trim(),
        isActive: true,
      });

    const [newLink] = await db
      .select()
      .from(downloadLinks)
      .where(eq(downloadLinks.id, result.insertId));

    return NextResponse.json({ downloadLink: newLink }, { status: 201 });
  } catch (error) {
    console.error("Create download link error:", error);
    const { error: errMsg, status } = handleApiError(error);
    return NextResponse.json({ error: errMsg }, { status });
  }
}
