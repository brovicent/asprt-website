import { NextResponse } from "next/server";
import { db } from "@/db";
import { movies, users, downloadLinks } from "@/db/schema";
import { requireAdmin, handleApiError } from "@/lib/auth";
import { sql, eq } from "drizzle-orm";

export async function GET() {
  try {
    await requireAdmin();

    const [movieCount, userCount, linkCount, totalViews, actualMoviesCount, actualTvShowsCount] = await Promise.all([
      db.select({ count: sql<number>`count(*)` }).from(movies),
      db.select({ count: sql<number>`count(*)` }).from(users),
      db.select({ count: sql<number>`count(*)` }).from(downloadLinks),
      db
        .select({ total: sql<number>`COALESCE(SUM(views), 0)` })
        .from(movies),
      db.select({ count: sql<number>`count(*)` }).from(movies).where(eq(movies.contentType, 'movie')),
      db.select({ count: sql<number>`count(*)` }).from(movies).where(eq(movies.contentType, 'tv_show')),
    ]);

    const recentMovies = await db
      .select()
      .from(movies)
      .orderBy(sql`${movies.createdAt} DESC`)
      .limit(5);

    const popularMovies = await db
      .select()
      .from(movies)
      .orderBy(sql`COALESCE(${movies.views}, 0) DESC`)
      .limit(5);


    return NextResponse.json({
      stats: {
        totalMovies: Number(movieCount[0]?.count || 0),
        totalUsers: Number(userCount[0]?.count || 0),
        totalLinks: Number(linkCount[0]?.count || 0),
        totalViews: Number(totalViews[0]?.total || 0),
        actualMoviesCount: Number(actualMoviesCount[0]?.count || 0),
        actualTvShowsCount: Number(actualTvShowsCount[0]?.count || 0),
      },
      recentMovies,
      popularMovies,
    });
  } catch (error) {
    console.error("Get stats error:", error);
    const { error: errMsg, status } = handleApiError(error);
    return NextResponse.json({ error: errMsg }, { status });
  }
}

