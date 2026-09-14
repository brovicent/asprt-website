import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { movies, downloadLinks } from "@/db/schema";
import { requireAdmin, handleApiError } from "@/lib/auth";
import { eq } from "drizzle-orm";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Only admins can fetch movie details via the API (includes draft/archived)
    await requireAdmin();

    const { id } = await params;
    const movieId = parseInt(id);

    if (isNaN(movieId) || movieId <= 0) {
      return NextResponse.json(
        { error: "Invalid movie ID" },
        { status: 400 }
      );
    }

    const movie = await db
      .select()
      .from(movies)
      .where(eq(movies.id, movieId))
      .limit(1);

    if (movie.length === 0) {
      return NextResponse.json(
        { error: "Movie not found" },
        { status: 404 }
      );
    }

    const links = await db
      .select()
      .from(downloadLinks)
      .where(eq(downloadLinks.movieId, movieId));

    return NextResponse.json({
      movie: movie[0],
      downloadLinks: links,
    });
  } catch (error) {
    console.error("Get movie error:", error);
    const { error: errMsg, status } = handleApiError(error);
    return NextResponse.json({ error: errMsg }, { status });
  }
}


// Whitelist of fields allowed for movie updates
const ALLOWED_UPDATE_FIELDS = [
  "title", "slug", "description", "contentType", "year", "rating",
  "duration", "posterUrl", "backdropUrl", "imdbId", "mediaInfo",
  "trailerKey", "streamUrl", "genres", "language", "status",
] as const;

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id } = await params;
    const movieId = parseInt(id);

    if (isNaN(movieId) || movieId <= 0) {
      return NextResponse.json(
        { error: "Invalid movie ID" },
        { status: 400 }
      );
    }

    const body = await request.json();

    // Only allow whitelisted fields to be updated
    const updateData: Record<string, unknown> = {};
    for (const field of ALLOWED_UPDATE_FIELDS) {
      if (field in body) {
        updateData[field] = body[field];
      }
    }
    updateData.updatedAt = new Date();

    await db
      .update(movies)
      .set(updateData)
      .where(eq(movies.id, movieId));

    const [updatedMovie] = await db
      .select()
      .from(movies)
      .where(eq(movies.id, movieId));

    if (!updatedMovie) {
      return NextResponse.json(
        { error: "Movie not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ movie: updatedMovie });
  } catch (error) {
    console.error("Update movie error:", error);
    const { error: errMsg, status } = handleApiError(error);
    return NextResponse.json({ error: errMsg }, { status });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id } = await params;
    const movieId = parseInt(id);

    if (isNaN(movieId)) {
      return NextResponse.json(
        { error: "Invalid movie ID" },
        { status: 400 }
      );
    }

    // Verify movie exists before deleting
    const [existing] = await db
      .select({ id: movies.id })
      .from(movies)
      .where(eq(movies.id, movieId))
      .limit(1);

    if (!existing) {
      return NextResponse.json(
        { error: "Movie not found" },
        { status: 404 }
      );
    }

    // Also delete associated download links (cascade safety)
    await db.delete(downloadLinks).where(eq(downloadLinks.movieId, movieId));
    await db.delete(movies).where(eq(movies.id, movieId));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete movie error:", error);
    const { error: errMsg, status } = handleApiError(error);
    return NextResponse.json({ error: errMsg }, { status });
  }
}

