import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { movies } from "@/db/schema";
import { requireAdmin, handleApiError } from "@/lib/auth";
import { sanitizeSearch, clampInt } from "@/lib/validation";
import { eq, desc, sql, like, and } from "drizzle-orm";

export async function GET(request: NextRequest) {
  try {
    // Only admins can enumerate all movies (including draft/archived)
    await requireAdmin();

    const { searchParams } = new URL(request.url);

    // Clamp pagination to prevent abuse (e.g. limit=999999)
    const page = clampInt(searchParams.get("page"), 1, 1000, 1);
    const limit = clampInt(searchParams.get("limit"), 1, 100, 12);
    const search = sanitizeSearch(searchParams.get("search"), 100);
    const type = searchParams.get("type") || "";
    const offset = (page - 1) * limit;

    const conditions = [];
    if (search) {
      conditions.push(like(movies.title, `%${search}%`));
    }
    if (type === "movie" || type === "tv_show") {
      conditions.push(eq(movies.contentType, type as "movie" | "tv_show"));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const [movieList, countResult] = await Promise.all([
      db
        .select()
        .from(movies)
        .where(whereClause)
        .orderBy(desc(movies.createdAt))
        .limit(limit)
        .offset(offset),
      db
        .select({ count: sql<number>`count(*)` })
        .from(movies)
        .where(whereClause),
    ]);

    const total = Number(countResult[0]?.count || 0);

    return NextResponse.json({
      movies: movieList,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Get movies error:", error);
    const { error: errMsg, status } = handleApiError(error);
    return NextResponse.json({ error: errMsg }, { status });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAdmin();

    const body = await request.json();
    const {
      title,
      description,
      contentType,
      year,
      rating,
      duration,
      posterUrl,
      backdropUrl,
      imdbId,
      mediaInfo,
      trailerKey,
      streamUrl,
      genres,
      language,
      status,
    } = body;

    if (!title || typeof title !== "string" || title.trim().length === 0) {
      return NextResponse.json(
        { error: "Title is required" },
        { status: 400 }
      );
    }

    // Validate contentType
    const validContentType = contentType === "tv_show" ? "tv_show" : "movie";

    const slug =
      body.slug ||
      title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "") +
        "-" +
        Date.now();

    const [result] = await db
      .insert(movies)
      .values({
        title: title.trim(),
        slug,
        description,
        contentType: validContentType,
        year,
        rating,
        duration,
        posterUrl,
        backdropUrl,
        imdbId,
        mediaInfo,
        trailerKey,
        streamUrl,
        genres,
        language,
        status: status || "published",
        createdBy: user.id,
      });

    const [newMovie] = await db
      .select()
      .from(movies)
      .where(eq(movies.id, result.insertId));

    return NextResponse.json({ movie: newMovie }, { status: 201 });
  } catch (error) {
    console.error("Create movie error:", error);
    const { error: errMsg, status } = handleApiError(error);
    return NextResponse.json({ error: errMsg }, { status });
  }
}
