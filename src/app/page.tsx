import Link from "next/link";
import { db } from "@/db";
import { movies, type Movie } from "@/db/schema";
import { desc, eq, like, and, count, type SQL } from "drizzle-orm";
import { sql } from "drizzle-orm";
import { Search, Download, Settings } from "lucide-react";
import { PosterCard } from "@/components/poster-card";
import { HeroBanner } from "@/components/hero-banner";
import { MovieRow } from "@/components/movie-row";
import { ContinueWatchingRow } from "@/components/continue-watching-row";
import { Navbar } from "@/components/navbar";
import { getTMDBLogo } from "@/lib/actions";

export const dynamic = "force-dynamic";

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string; search?: string; page?: string; genre?: string; sort?: string }>;
}) {
  const params = await searchParams;
  const { type, search, genre, sort } = params;
  
  const page = parseInt(params.page || "1", 10);
  const limit = 30;
  const offset = (page - 1) * limit;

  const isGridView = Boolean(search || genre || sort);
  const isCategoryPage = Boolean((type === "movie" || type === "tv_show") && !isGridView);
  const isHome = !type && !search && !genre && !sort;

  const conditions: SQL[] = [eq(movies.status, "published")];
  if (type === "movie" || type === "tv_show") {
    conditions.push(eq(movies.contentType, type));
  }
  if (search) {
    conditions.push(sql`LOWER(${movies.title}) LIKE LOWER(${`%${search}%`})`);
  }
  if (genre) {
    conditions.push(sql`JSON_CONTAINS(${movies.genres}, ${JSON.stringify(genre)})`);
  }

  let results: Movie[] = [];
  let totalItems = 0;
  let heroMovies: Movie[] = [];
  let heroLogos: (string | null)[] = [];
  let trending: Movie[] = [];
  let filmList: Movie[] = [];
  let seriesList: Movie[] = [];
  let actionList: Movie[] = [];
  let dramaList: Movie[] = [];

  if (isGridView) {
    const orderByClause = sort === "trending" ? desc(movies.views) : desc(movies.createdAt);
    const [filteredResults, totalCountRes] = await Promise.all([
      db
        .select()
        .from(movies)
        .where(and(...conditions))
        .orderBy(orderByClause)
        .limit(limit)
        .offset(offset),
      db.select({ value: count() }).from(movies).where(and(...conditions)),
    ]);
    results = filteredResults;
    totalItems = totalCountRes[0].value;
  } else if (isCategoryPage) {
    // Category View (Movies or TV Shows) - Uses Row Layout
    const [trendingRes, newRes, actionRes, dramaRes] = await Promise.all([
      db.select().from(movies).where(and(...conditions)).orderBy(desc(movies.views)).limit(20),
      db.select().from(movies).where(and(...conditions)).orderBy(desc(movies.createdAt)).limit(18),
      db.select().from(movies).where(and(...conditions, sql`JSON_CONTAINS(${movies.genres}, '"Action"')`)).limit(18),
      db.select().from(movies).where(and(...conditions, sql`JSON_CONTAINS(${movies.genres}, '"Drama"')`)).limit(18),
    ]);
    
    if (trendingRes.length > 0) {
      heroMovies = trendingRes.slice(0, 10);
      trending = trendingRes.slice(10);
      heroLogos = await Promise.all(heroMovies.map(m => getTMDBLogo(m.imdbId || "", m.contentType)));
    }
    filmList = newRes;
    actionList = actionRes;
    dramaList = dramaRes;
  } else {
    // Home view: fetch trending, recent movies, and recent tv shows separately
    const [trendingResults, recentMovies, recentSeries] = await Promise.all([
      db
        .select()
        .from(movies)
        .where(and(...conditions))
        .orderBy(desc(movies.views))
        .limit(20), // Get 20, 10 for hero, 10 for row
      db
        .select()
        .from(movies)
        .where(and(...conditions, eq(movies.contentType, "movie")))
        .orderBy(desc(movies.createdAt))
        .limit(18),
      db
        .select()
        .from(movies)
        .where(and(...conditions, eq(movies.contentType, "tv_show")))
        .orderBy(desc(movies.createdAt))
        .limit(18),
    ]);
    
    if (trendingResults.length > 0) {
      heroMovies = trendingResults.slice(0, 10);
      trending = trendingResults.slice(10);
      heroLogos = await Promise.all(heroMovies.map(m => getTMDBLogo(m.imdbId || "", m.contentType)));
    }
    filmList = recentMovies;
    seriesList = recentSeries;
  }

  const totalPages = isGridView ? Math.ceil(totalItems / limit) : 0;

  const getPageUrl = (p: number) => {
    const sp = new URLSearchParams();
    if (type) sp.set("type", type);
    if (search) sp.set("search", search);
    if (genre) sp.set("genre", genre);
    if (sort) sp.set("sort", sort);
    if (p > 1) sp.set("page", p.toString());
    return `/?${sp.toString()}`;
  };

  const activeTab = type === "movie" ? "movie" : type === "tv_show" ? "tv_show" : "home";

  const navLink = (href: string, label: string, active: boolean) => (
    <Link
      href={href}
      className={
        active
          ? "text-sm font-bold text-white transition-colors"
          : "text-sm font-medium text-white/70 hover:text-white transition-colors"
      }
    >
      {label}
    </Link>
  );

  return (
    <div className="min-h-screen bg-background text-text-primary flex flex-col font-sans">
      <Navbar />

      <main className="flex-1 w-full">
        {heroMovies.length > 0 && (
          <HeroBanner movies={heroMovies} logos={heroLogos} />
        )}

        {isGridView ? (
          /* ============ FILTERED / SEARCH VIEW (GRID) ============ */
          <div className="max-w-[1400px] mx-auto px-4 lg:px-12 xl:px-16 pt-24 pb-12">
            <div className="flex items-center justify-between mb-8">
              <h1 className="text-2xl font-semibold text-white flex items-center gap-2">
                {search ? (
                  <>Search results for &ldquo;{search}&rdquo;</>
                ) : genre ? (
                  <>{genre.toUpperCase()} {type === 'movie' ? 'Movies' : type === 'tv_show' ? 'TV Series' : 'Movies & Series'}</>
                ) : sort === 'trending' ? (
                  <>Trending {type === 'movie' ? 'Movies' : type === 'tv_show' ? 'TV Series' : 'Now'}</>
                ) : sort === 'latest' ? (
                  <>New Releases</>
                ) : (
                  <>Explore</>
                )}
              </h1>
              <span className="text-sm text-text-muted">{totalItems} results</span>
            </div>

            {results.length === 0 ? (
              <div className="text-center py-32">
                <Search size={48} className="mx-auto text-white/20 mb-4" />
                <p className="text-xl text-white/60 font-medium">No titles found.</p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-x-3 gap-y-8 sm:gap-x-4 sm:gap-y-10">
                  {results.map((item) => (
                    <PosterCard key={item.id} movie={item} />
                  ))}
                </div>

                {totalPages > 1 && (
                  <div className="mt-16 flex items-center justify-center gap-2">
                    {page > 1 && (
                      <Link 
                        href={getPageUrl(page - 1)}
                        className="px-4 py-2 rounded bg-surface-elevated hover:bg-surface-hover text-white text-sm font-medium transition-colors"
                      >
                        Prev
                      </Link>
                    )}
                    
                    <div className="flex items-center gap-1">
                      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        let startPage = Math.max(1, page - 2);
                        if (startPage + 4 > totalPages) {
                          startPage = Math.max(1, totalPages - 4);
                        }
                        return startPage + i;
                      }).map(p => (
                        <Link
                          key={p}
                          href={getPageUrl(p)}
                          className={`w-10 h-10 flex items-center justify-center rounded text-sm font-medium transition-colors ${
                            p === page 
                              ? "bg-white text-black" 
                              : "bg-surface-elevated hover:bg-surface-hover text-white"
                          }`}
                        >
                          {p}
                        </Link>
                      ))}
                    </div>

                    {page < totalPages && (
                      <Link 
                        href={getPageUrl(page + 1)}
                        className="px-4 py-2 rounded bg-surface-elevated hover:bg-surface-hover text-white text-sm font-medium transition-colors"
                      >
                        Next
                      </Link>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        ) : isCategoryPage ? (
          /* ============ CATEGORY VIEW (ROWS) ============ */
          <div className="pb-12">
            <div className="-mt-8 sm:-mt-16 relative z-20">
              <ContinueWatchingRow />
              <MovieRow title={`Trending ${type === 'movie' ? 'Movies' : 'TV Series'}`} movies={trending} viewAllLink={`/?type=${type}&sort=trending`} />
              <MovieRow title="New Releases" movies={filmList} viewAllLink={`/?type=${type}&sort=latest`} />
              {actionList.length > 0 && <MovieRow title="Action & Adventure" movies={actionList} viewAllLink={`/?type=${type}&genre=Action`} />}
              {dramaList.length > 0 && <MovieRow title="Drama" movies={dramaList} viewAllLink={`/?type=${type}&genre=Drama`} />}
            </div>
          </div>
        ) : (
          /* ============ HOME VIEW (ROWS) ============ */
          <div className="pb-12">
            <div className="-mt-8 sm:-mt-16 relative z-20">
              <ContinueWatchingRow />
              <MovieRow title="Trending Now" movies={trending} viewAllLink="/?sort=trending" />
              <MovieRow title="New Releases" movies={filmList} viewAllLink="/?sort=latest" />
              <MovieRow title="TV Series" movies={seriesList} viewAllLink="/?type=tv_show" />
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
