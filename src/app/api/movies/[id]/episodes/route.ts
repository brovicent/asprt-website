import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { episodeStreams } from "@/db/schema";
import { requireAdmin, handleApiError } from "@/lib/auth";
import { eq, and } from "drizzle-orm";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const movieId = parseInt(id);

    if (isNaN(movieId) || movieId <= 0) {
      return NextResponse.json(
        { error: "Invalid movie ID" },
        { status: 400 }
      );
    }

    const streams = await db
      .select()
      .from(episodeStreams)
      .where(eq(episodeStreams.movieId, movieId));

    return NextResponse.json({ episodeStreams: streams });
  } catch (error) {
    console.error("Get episode streams error:", error);
    const { error: errMsg, status } = handleApiError(error);
    return NextResponse.json({ error: errMsg }, { status });
  }
}

export async function POST(
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
    const { seasonNumber, episodeNumber, streamUrl } = body;

    if (!seasonNumber || !episodeNumber || !streamUrl) {
      return NextResponse.json(
        { error: "seasonNumber, episodeNumber, and streamUrl are required" },
        { status: 400 }
      );
    }

    // Check if an entry already exists for this season and episode
    const existing = await db
      .select()
      .from(episodeStreams)
      .where(
        and(
          eq(episodeStreams.movieId, movieId),
          eq(episodeStreams.seasonNumber, seasonNumber),
          eq(episodeStreams.episodeNumber, episodeNumber)
        )
      )
      .limit(1);

    if (existing.length > 0) {
      // Update
      await db
        .update(episodeStreams)
        .set({ streamUrl, updatedAt: new Date() })
        .where(eq(episodeStreams.id, existing[0].id));
    } else {
      // Insert
      await db.insert(episodeStreams).values({
        movieId,
        seasonNumber,
        episodeNumber,
        streamUrl,
      });
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("Post episode streams error:", error);
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

    if (isNaN(movieId) || movieId <= 0) {
      return NextResponse.json({ error: "Invalid movie ID" }, { status: 400 });
    }

    const body = await request.json();
    const { streamId } = body;

    if (!streamId) {
      return NextResponse.json({ error: "streamId is required" }, { status: 400 });
    }

    await db
      .delete(episodeStreams)
      .where(and(eq(episodeStreams.id, streamId), eq(episodeStreams.movieId, movieId)));

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("Delete episode stream error:", error);
    const { error: errMsg, status } = handleApiError(error);
    return NextResponse.json({ error: errMsg }, { status });
  }
}
