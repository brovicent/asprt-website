"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Clock } from "lucide-react";
import { getAllProgress, PlaybackProgress } from "@/lib/progress";
import { getMoviesByTmdbIds } from "@/lib/actions";
import { optimizeImageUrl } from "@/lib/utils";

interface WatchedItem {
  movie: any;
  progress: PlaybackProgress;
  season?: number;
  episode?: number;
}

function formatTimeLeft(currentTime: number, duration: number) {
  const leftSeconds = duration - currentTime;
  if (leftSeconds <= 0) return "Finished";
  
  const hours = Math.floor(leftSeconds / 3600);
  const minutes = Math.floor((leftSeconds % 3600) / 60);
  
  if (hours > 0) {
    return `${hours}hr ${minutes}m left`;
  }
  return `${minutes}m left`;
}

export function ContinueWatchingRow() {
  const [items, setItems] = useState<WatchedItem[]>([]);
  const [loading, setLoading] = useState(true);
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isMoved, setIsMoved] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);

  useEffect(() => {
    async function loadContinueWatching() {
      try {
        const allProgress = getAllProgress();
        const progressEntries = Object.entries(allProgress).filter(([_, p]) => {
          // Keep if not finished (currentTime < 95% of duration)
          return p.duration > 0 && p.currentTime > 5 && (p.currentTime / p.duration) < 0.95;
        });

        if (progressEntries.length === 0) {
          setItems([]);
          setLoading(false);
          return;
        }

        // Sort by most recently updated
        progressEntries.sort((a, b) => b[1].updatedAt - a[1].updatedAt);

        const uniqueTmdbIds = new Set<string>();
        const itemMap = new Map<string, { p: PlaybackProgress, season?: number, episode?: number }>();

        progressEntries.forEach(([key, p]) => {
          // Key format: "tmdb-12345|movie" or "tmdb-12345|tv|1|3"
          const parts = key.split("|");
          const tmdbId = parts[0]; // full imdbId like "tmdb-12345"
          if (!uniqueTmdbIds.has(tmdbId)) {
            uniqueTmdbIds.add(tmdbId);
            const season = parts.length > 2 ? parseInt(parts[2]) : undefined;
            const episode = parts.length > 3 ? parseInt(parts[3]) : undefined;
            itemMap.set(tmdbId, { p, season, episode });
          }
        });

        // Pass the full imdbId (e.g. "tmdb-12345") and look up WITHOUT re-prefixing
        const movies = await getMoviesByTmdbIds(Array.from(uniqueTmdbIds));
        
        const watchedItems: WatchedItem[] = [];
        movies.forEach(m => {
          if (m.imdbId) {
            // The stored key uses the full imdbId as the first part
            const data = itemMap.get(m.imdbId);
            if (data) {
              watchedItems.push({
                movie: m,
                progress: data.p,
                season: data.season,
                episode: data.episode
              });
            }
          }
        });

        // Sort again to maintain recency order
        watchedItems.sort((a, b) => b.progress.updatedAt - a.progress.updatedAt);
        setItems(watchedItems);
      } catch (e) {
        console.error("Failed to load continue watching:", e);
      } finally {
        setLoading(false);
      }
    }

    loadContinueWatching();
  }, []);

  const scroll = (direction: "left" | "right") => {
    if (scrollRef.current) {
      const scrollAmount = scrollRef.current.clientWidth * 0.8;
      scrollRef.current.scrollBy({
        left: direction === "left" ? -scrollAmount : scrollAmount,
        behavior: "smooth"
      });
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setIsMoved(false);
    if (scrollRef.current) {
      setStartX(e.pageX - scrollRef.current.offsetLeft);
      setScrollLeft(scrollRef.current.scrollLeft);
    }
  };

  const handleMouseLeave = () => {
    setIsDragging(false);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !scrollRef.current) return;
    e.preventDefault();
    const x = e.pageX - scrollRef.current.offsetLeft;
    const walk = (x - startX) * 2;
    if (Math.abs(walk) > 10) setIsMoved(true);
    scrollRef.current.scrollLeft = scrollLeft - walk; 
  };

  const handleClick = (e: React.MouseEvent) => {
    if (isMoved) {
      e.stopPropagation();
      e.preventDefault();
    }
  };

  if (loading || items.length === 0) return null;

  return (
    <section className="mb-8 relative group">
      <div className="px-4 lg:px-12 xl:px-16 mb-4 mt-6">
        <h2 className="text-xl sm:text-2xl font-semibold text-text-primary">
          Continue Watching
        </h2>
      </div>

      <div className="relative">
        <button
          onClick={() => scroll("left")}
          className="absolute left-0 top-0 bottom-0 z-20 w-12 bg-gradient-to-r from-background to-transparent hidden md:flex opacity-0 group-hover:opacity-100 items-center justify-start pl-2 text-white transition-opacity focus:outline-none disabled:opacity-0"
        >
          <ChevronLeft size={32} className="drop-shadow-lg" />
        </button>
        <button
          onClick={() => scroll("right")}
          className="absolute right-0 top-0 bottom-0 z-20 w-12 bg-gradient-to-l from-background to-transparent hidden md:flex opacity-0 group-hover:opacity-100 items-center justify-end pr-2 text-white transition-opacity focus:outline-none"
        >
          <ChevronRight size={32} className="drop-shadow-lg" />
        </button>

        <div
          ref={scrollRef}
          onMouseDown={handleMouseDown}
          onMouseLeave={handleMouseLeave}
          onMouseUp={handleMouseUp}
          onMouseMove={handleMouseMove}
          onClickCapture={handleClick}
          className={`flex overflow-x-auto gap-4 px-4 lg:px-12 xl:px-16 py-2 ${isDragging ? "cursor-grabbing" : "cursor-grab"} scrollbar-hide`}
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {items.map(({ movie, progress, season, episode }) => {
            const pct = Math.min((progress.currentTime / progress.duration) * 100, 100);
            
            // Build the URL to resume. If series, append season and episode. Always append play=true.
            const url = new URL(window.location.origin + `/movie/${movie.slug}`);
            if (movie.contentType === "tv_show" && season && episode) {
              url.searchParams.set("s", season.toString());
              url.searchParams.set("ep", episode.toString());
            }
            url.searchParams.set("play", "true");

            return (
              <Link 
                key={movie.id} 
                href={url.pathname + url.search}
                className="shrink-0 w-64 sm:w-72 group/cw block select-none"
                draggable={false}
              >
                <div className="relative aspect-video rounded-xl overflow-hidden bg-surface-elevated mb-3 group-hover/cw:ring-2 group-hover/cw:ring-white transition-all shadow-lg">
                  {movie.backdropUrl || movie.posterUrl ? (
                    <img
                      src={optimizeImageUrl(movie.backdropUrl || movie.posterUrl, 'w780')}
                      alt={movie.title}
                      loading="lazy"
                      draggable={false}
                      className="w-full h-full object-cover pointer-events-none transition-transform duration-500 group-hover/cw:scale-105"
                    />
                  ) : (
                    <div className="w-full h-full bg-white/5" />
                  )}
                  
                  {/* Gradient Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent pointer-events-none" />
                  
                  {/* Season/Episode Badge for TV */}
                  {movie.contentType === "tv_show" && season && episode && (
                    <div className="absolute top-2 left-2 px-2 py-1 bg-black/60 backdrop-blur-md rounded text-[11px] font-bold text-white shadow-sm">
                      S{season} E{episode}
                    </div>
                  )}

                  {/* Play Overlay */}
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover/cw:opacity-100 transition-opacity">
                    <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-md border border-white/40 flex items-center justify-center group-hover/cw:bg-white/30 group-hover/cw:scale-110 transition-all">
                      <div className="w-0 h-0 border-t-[8px] border-t-transparent border-l-[12px] border-l-white border-b-[8px] border-b-transparent ml-1" />
                    </div>
                  </div>

                  {/* Progress Bar inside image */}
                  <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/20 z-10">
                    <div 
                      className="h-full bg-primary" 
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>

                <div className="px-1">
                  <h3 className="font-bold text-white text-base truncate group-hover/cw:text-white/80 transition-colors">
                    {movie.title}
                  </h3>
                  <div className="flex items-center gap-1.5 text-xs text-white/50 mt-1 font-medium">
                    <Clock size={12} />
                    <span>{formatTimeLeft(progress.currentTime, progress.duration)}</span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
