import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, handleApiError } from "@/lib/auth";

// Fix: TMDB API key is now read from server-side environment variable only.
// Previously the key was hardcoded in the client-side movie-form.tsx, exposing
// it to anyone who views the browser source/network requests.
const TMDB_API_KEY = process.env.TMDB_API_KEY;

export async function GET(request: NextRequest) {
  try {
    await requireAdmin();

    if (!TMDB_API_KEY) {
      return NextResponse.json(
        { error: "TMDB API key not configured on server" },
        { status: 503 }
      );
    }

    const { searchParams } = new URL(request.url);
    const query = searchParams.get("query");
    const type = searchParams.get("type") as "movie" | "tv" | null;

    if (!query || !type || (type !== "movie" && type !== "tv")) {
      return NextResponse.json(
        { error: "Missing or invalid query/type parameter" },
        { status: 400 }
      );
    }

    const isNumericId = /^\d+$/.test(query);
    let tmdbId = query;

    // Step 1: If query is a title (not numeric), search TMDB first
    if (!isNumericId) {
      const searchUrl = `https://api.themoviedb.org/3/search/${type}?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(query)}`;
      const searchRes = await fetch(searchUrl, { next: { revalidate: 0 } });

      if (!searchRes.ok) {
        return NextResponse.json(
          { error: "Failed to search TMDB" },
          { status: 502 }
        );
      }

      const searchData = await searchRes.json();
      if (!searchData.results || searchData.results.length === 0) {
        return NextResponse.json({ results: [] });
      }

      tmdbId = searchData.results[0].id.toString();
    }

    // Step 2: Fetch full details including videos + external_ids
    const detailUrl = `https://api.themoviedb.org/3/${type}/${tmdbId}?api_key=${TMDB_API_KEY}&append_to_response=videos,external_ids`;
    const detailRes = await fetch(detailUrl, { next: { revalidate: 0 } });

    if (!detailRes.ok) {
      return NextResponse.json(
        { error: "Failed to fetch TMDB details" },
        { status: 502 }
      );
    }

    const detailData = await detailRes.json();

    if (!detailData.id) {
      return NextResponse.json({ error: "TMDB ID not found" }, { status: 404 });
    }

    // Transform the TMDB response into a clean shape for the form
    const title = type === "movie" ? detailData.title : detailData.name;
    const year =
      type === "movie"
        ? detailData.release_date?.substring(0, 4) || ""
        : detailData.first_air_date?.substring(0, 4) || "";
    const rating = detailData.vote_average
      ? detailData.vote_average.toFixed(1)
      : "";
    const duration =
      type === "movie"
        ? detailData.runtime
          ? `${Math.floor(detailData.runtime / 60)}h ${detailData.runtime % 60}m`
          : ""
        : detailData.episode_run_time?.[0]
        ? `${detailData.episode_run_time[0]}m`
        : "";
    const imdbId =
      detailData.external_ids?.imdb_id || detailData.imdb_id || "";
    const genres: string[] =
      detailData.genres?.map((g: { name: string }) => g.name) || [];

    // Prefer Trailer, fall back to Teaser, then fall back to ANY YouTube video
    const trailerVideo = detailData.videos?.results?.find(
      (v: { site: string; type: string }) =>
        v.site === "YouTube" && (v.type === "Trailer" || v.type === "Teaser")
    ) || detailData.videos?.results?.find(
      (v: { site: string }) => v.site === "YouTube"
    );

    return NextResponse.json({
      title,
      description: detailData.overview || "",
      year,
      rating,
      duration,
      posterUrl: detailData.poster_path
        ? `https://image.tmdb.org/t/p/w500${detailData.poster_path}`
        : "",
      backdropUrl: detailData.backdrop_path
        ? `https://image.tmdb.org/t/p/original${detailData.backdrop_path}`
        : "",
      imdbId,
      trailerKey: trailerVideo?.key || "",
      genres,
    });
  } catch (error) {
    console.error("TMDB proxy error:", error);
    const { error: errMsg, status } = handleApiError(error);
    return NextResponse.json({ error: errMsg }, { status });
  }
}
