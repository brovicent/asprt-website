import Link from "next/link";
import { db } from "@/db";
import { movies, downloadLinks, episodeStreams } from "@/db/schema";
import { eq, desc, ne, and, sql, or } from "drizzle-orm";
import { notFound } from "next/navigation";
import { getSession } from "@/lib/auth";
import { Navbar } from "@/components/navbar";
import { getTMDBCredits, getTMDBDetails, getTMDBTrailers, getTMDBLogo } from "@/lib/actions";
import { MovieCast } from "@/components/movie-cast";
import { SeriesEpisodes } from "@/components/series-episodes";
import { MovieRow } from "@/components/movie-row";
import { TrailerButton } from "@/components/trailer-button";
import { StreamButton } from "@/components/stream-button";
import { Download, Play, Star, Eye, Plus, Minus, Info, ChevronDown } from "lucide-react";

export const dynamic = "force-dynamic";

function escapeHtml(html: string): string {
  return html
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/&lt;a href=&quot;(https?:\/\/[^&"<>]+)&quot;&gt;(.+?)&lt;\/a&gt;/g, '<a href="$1">$2</a>');
}

export default async function PublicMoviePage({ params, searchParams }: { params: Promise<{ slug: string }>, searchParams: Promise<{ [key: string]: string | string[] | undefined }> }) {
  const { slug } = await params;
  const search = await searchParams;
  const autoPlay = search.play === 'true';
  const currentSeason = search.s ? Number(search.s) : undefined;
  const currentEpisode = search.ep ? Number(search.ep) : undefined;
  const session = await getSession();
  const isAdmin = session?.role === "admin";
  const statusCondition = isAdmin ? eq(movies.slug, slug) : and(eq(movies.slug, slug), eq(movies.status, "published"));
  
  const movieResults = await db.select().from(movies).where(statusCondition).limit(1);
  if (movieResults.length === 0) notFound();
  const movie = movieResults[0];

  if (movie.status === "published") {
    await db.update(movies).set({ views: sql`COALESCE(${movies.views}, 0) + 1` }).where(eq(movies.id, movie.id));
  }

  const genres = (movie.genres as string[]) || [];
  const genreConditions = genres.length > 0 ? or(...genres.map((g) => sql`JSON_CONTAINS(${movies.genres}, ${JSON.stringify(g)})`)) : undefined;

  const [links, relatedByGenre, tmdbCredits, tmdbDetails, tmdbTrailers, tmdbLogo, epStreams] = await Promise.all([
    db.select().from(downloadLinks).where(eq(downloadLinks.movieId, movie.id)),
    db.select().from(movies).where(and(ne(movies.id, movie.id), eq(movies.contentType, movie.contentType), eq(movies.status, "published"), genreConditions)).orderBy(desc(movies.views)).limit(12),
    getTMDBCredits(movie.imdbId || "", movie.contentType),
    getTMDBDetails(movie.imdbId || "", movie.contentType),
    getTMDBTrailers(movie.imdbId || "", movie.contentType),
    getTMDBLogo(movie.imdbId || "", movie.contentType),
    movie.contentType === "tv_show" ? db.select().from(episodeStreams).where(eq(episodeStreams.movieId, movie.id)) : Promise.resolve([]),
  ]);

  let finalRelated = relatedByGenre;
  if (finalRelated.length < 12) {
    const popular = await db.select().from(movies).where(and(ne(movies.id, movie.id), eq(movies.contentType, movie.contentType), eq(movies.status, "published"))).orderBy(desc(movies.views)).limit(12 - finalRelated.length);
    const existingIds = new Set(finalRelated.map((r) => r.id));
    for (const p of popular) {
      if (!existingIds.has(p.id)) {
        finalRelated.push(p);
        existingIds.add(p.id);
      }
    }
  }

  const movieGroupedLinks = links.reduce((acc, link) => {
    const key = link.quality;
    if (!acc[key]) acc[key] = { size: link.size, links: [] };
    acc[key].links.push(link);
    return acc;
  }, {} as Record<string, { size: string | null; links: typeof links }>);

  const tvGroupedLinks = links.reduce((acc, link) => {
    const ep = link.episode || "Unknown Episode";
    if (!acc[ep]) acc[ep] = {};
    const q = link.quality;
    if (!acc[ep][q]) acc[ep][q] = { size: link.size, links: [] };
    acc[ep][q].links.push(link);
    return acc;
  }, {} as Record<string, Record<string, { size: string | null; links: typeof links }>>);

  const formatCurrency = (val: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(val);

  return (
    <div className="min-h-screen bg-background text-text-primary flex flex-col font-sans">
      <Navbar activeType={movie.contentType as "movie" | "tv_show"} />
      
      <main className="flex-1 w-full">
        {/* Full-Bleed Hero Section */}
        <div className="relative w-full h-[70vh] sm:h-[85vh] md:h-[90vh] min-h-[500px] flex items-end pb-24 sm:pb-36 group overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-full z-0 pointer-events-none overflow-hidden select-none">
            <img src={movie.backdropUrl || movie.posterUrl || undefined} alt="" className="w-full h-full object-cover opacity-80" />
            <div className="absolute inset-0 bg-gradient-to-r from-background via-background/60 to-transparent z-10" />
            <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent z-10" />
          </div>

          <div className="relative z-20 w-full px-4 lg:px-12 xl:px-16 h-full flex items-end">
            <div className="relative w-full max-w-2xl h-full flex items-end">
              
              {/* Title & Info */}
              <div className="absolute bottom-16 sm:bottom-20 left-0 w-full flex flex-col gap-4 sm:gap-6 z-10">
                {tmdbLogo ? (
                  <img src={tmdbLogo} alt={movie.title} className="max-h-16 sm:max-h-24 md:max-h-32 lg:max-h-40 w-auto object-contain drop-shadow-2xl origin-left" />
                ) : (
                  <h1 className="text-3xl sm:text-5xl md:text-6xl lg:text-7xl font-black text-white tracking-tighter drop-shadow-xl">
                    {movie.title}
                  </h1>
                )}

                <div className="flex items-center gap-4 text-sm sm:text-base font-semibold text-white/90 drop-shadow-md">
                  {movie.rating && <span className="flex items-center gap-1 text-white"><Star size={16} fill="currentColor" /> {movie.rating}</span>}
                  <span>{movie.year}</span>
                  {movie.duration && <span>{movie.duration}</span>}
                  <span className="px-1.5 py-0.5 border border-white/40 rounded text-xs uppercase tracking-wider bg-black/20 backdrop-blur-sm">
                    {movie.contentType === "movie" ? "Movie" : "Series"}
                  </span>
                </div>

                {genres.length > 0 && (
                  <div className="flex flex-wrap items-center gap-2">
                    {genres.map(g => (
                      <span key={g} className="px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/10 text-xs font-semibold text-white/90">
                        {g}
                      </span>
                    ))}
                  </div>
                )}

                {movie.description && (
                  <p className="text-xs sm:text-sm md:text-base text-white/80 drop-shadow-md line-clamp-3 max-w-xl font-medium leading-relaxed">
                    {movie.description}
                  </p>
                )}
              </div>

              {/* Buttons Row - Fixed at Bottom */}
              <div className="absolute bottom-0 left-0 w-full flex items-center gap-3 pointer-events-auto z-20">
                <StreamButton 
                  streamUrl={movie.streamUrl ?? null} 
                  title={movie.title}
                  seasons={movie.contentType === "tv_show" ? (tmdbDetails?.seasons ?? undefined) : undefined}
                  tmdbId={movie.imdbId ?? undefined}
                  contentType={movie.contentType}
                  episodeStreams={movie.contentType === "tv_show" ? epStreams : undefined}
                  autoPlay={autoPlay}
                  currentSeason={currentSeason}
                  currentEpisode={currentEpisode}
                />
                {movie.trailerKey && (
                  <TrailerButton
                    movie={{
                      id: movie.id, title: movie.title, slug: movie.slug, posterUrl: movie.posterUrl, imdbId: movie.imdbId ?? null,
                      year: movie.year ?? null, rating: movie.rating ?? null, contentType: movie.contentType,
                      duration: movie.duration ?? null, trailerKey: movie.trailerKey, description: movie.description ?? null, genres,
                    }}
                  />
                )}
              </div>

            </div>
          </div>
        </div>

        {/* Content Section */}
        <div className="w-full px-4 lg:px-12 xl:px-16 pb-12 mt-2 sm:-mt-6 relative z-30">
          
          {/* Series Episodes (TV Series Only) */}
          {movie.contentType === "tv_show" && tmdbDetails?.seasons && (
            <div className="max-w-full">
              <SeriesEpisodes 
                tmdbId={movie.imdbId || ""} 
                seasons={tmdbDetails.seasons} 
                streamUrl={movie.streamUrl ?? undefined}
                title={movie.title}
                episodeStreams={epStreams}
                initialSeason={currentSeason}
              />
            </div>
          )}

          {/* Cast */}
          {tmdbCredits?.cast && (
            <div className="max-w-full">
              <MovieCast cast={tmdbCredits.cast} />
            </div>
          )}


          {/* Related / You Might Also Like */}
          <div className="-mx-4 sm:-mx-8 lg:-mx-12 xl:-mx-16">
            <MovieRow title="You Might Also Like" movies={finalRelated} />
          </div>

        </div>
      </main>
    </div>
  );
}
