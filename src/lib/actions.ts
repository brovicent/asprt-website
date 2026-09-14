"use server";

export async function getTMDBLogo(imdbId: string, type: 'movie' | 'tv_show') {
  if (!imdbId || !imdbId.startsWith("tmdb-")) return null;
  const tmdbId = imdbId.replace("tmdb-", "");
  const tmdbType = type === "tv_show" ? "tv" : "movie";
  try {
    const res = await fetch(`https://api.themoviedb.org/3/${tmdbType}/${tmdbId}/images?api_key=${process.env.TMDB_API_KEY}`, { next: { revalidate: 86400 } });
    const data = await res.json();
    const logo = data?.logos?.find((l: any) => l.iso_639_1 === 'en') || data?.logos?.[0];
    return logo ? `https://image.tmdb.org/t/p/w500${logo.file_path}` : null;
  } catch (e) {
    return null;
  }
}

export async function getTMDBDetails(imdbId: string, type: 'movie' | 'tv_show') {
  if (!imdbId || !imdbId.startsWith("tmdb-")) return null;
  const tmdbId = imdbId.replace("tmdb-", "");
  const tmdbType = type === "tv_show" ? "tv" : "movie";
  try {
    const res = await fetch(`https://api.themoviedb.org/3/${tmdbType}/${tmdbId}?api_key=${process.env.TMDB_API_KEY}`, { next: { revalidate: 86400 } });
    if (!res.ok) return null;
    return await res.json();
  } catch (e) {
    return null;
  }
}

export async function getTMDBCredits(imdbId: string, type: 'movie' | 'tv_show') {
  if (!imdbId || !imdbId.startsWith("tmdb-")) return null;
  const tmdbId = imdbId.replace("tmdb-", "");
  const tmdbType = type === "tv_show" ? "tv" : "movie";
  try {
    const res = await fetch(`https://api.themoviedb.org/3/${tmdbType}/${tmdbId}/credits?api_key=${process.env.TMDB_API_KEY}`, { next: { revalidate: 86400 } });
    if (!res.ok) return null;
    return await res.json();
  } catch (e) {
    return null;
  }
}

export async function getTMDBTrailers(imdbId: string, type: 'movie' | 'tv_show') {
  if (!imdbId || !imdbId.startsWith("tmdb-")) return null;
  const tmdbId = imdbId.replace("tmdb-", "");
  const tmdbType = type === "tv_show" ? "tv" : "movie";
  try {
    const res = await fetch(`https://api.themoviedb.org/3/${tmdbType}/${tmdbId}/videos?api_key=${process.env.TMDB_API_KEY}`, { next: { revalidate: 86400 } });
    if (!res.ok) return null;
    const data = await res.json();
    return data?.results?.filter((v: any) => v.site === 'YouTube' && (v.type === 'Trailer' || v.type === 'Teaser')) || [];
  } catch (e) {
    return null;
  }
}

export async function getTMDBSeason(imdbId: string, seasonNumber: number) {
  if (!imdbId || !imdbId.startsWith("tmdb-")) return null;
  const tmdbId = imdbId.replace("tmdb-", "");
  try {
    const res = await fetch(`https://api.themoviedb.org/3/tv/${tmdbId}/season/${seasonNumber}?api_key=${process.env.TMDB_API_KEY}`, { next: { revalidate: 86400 } });
    if (!res.ok) return null;
    return await res.json();
  } catch (e) {
    return null;
  }
}

import { db } from "@/db";
import { movies } from "@/db/schema";
import { sql, eq, and, desc } from "drizzle-orm";

export async function searchMoviesLive(query: string) {
  if (!query || query.length < 2) return [];
  try {
    const results = await db
      .select({
        id: movies.id,
        title: movies.title,
        slug: movies.slug,
        releaseYear: movies.year,
        posterUrl: movies.posterUrl,
        contentType: movies.contentType,
      })
      .from(movies)
      .where(
        and(
          eq(movies.status, "published"),
          sql`LOWER(${movies.title}) LIKE LOWER(${`%${query}%`})`
        )
      )
      .orderBy(desc(movies.views)) // Order by popularity
      .limit(5);
    return results;
  } catch (e) {
    console.error("Live search error:", e);
    return [];
  }
}
