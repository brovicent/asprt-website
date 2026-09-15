"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Play, Plus, Info } from "lucide-react";
import { getAllProgress, PlaybackProgress } from "@/lib/progress";
import { getMoviesByTmdbIds } from "@/lib/actions";
import { optimizeImageUrl } from "@/lib/utils";

interface WatchedItem {
  movie: any;
  progress: PlaybackProgress;
  season?: number;
  episode?: number;
  episodeName?: string;
}

// Format: "23 of 54m"
function formatProgress(currentTime: number, duration: number) {
  const currentMin = Math.floor(currentTime / 60);
  const totalMin = Math.floor(duration / 60);
  if (totalMin <= 0) return "";
  return `${currentMin} of ${totalMin}m`;
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
          return p.duration > 0 && p.currentTime > 5 && (p.currentTime / p.duration) < 0.95;
        });

        if (progressEntries.length === 0) {
          setItems([]);
          setLoading(false);
          return;
        }

        progressEntries.sort((a, b) => b[1].updatedAt - a[1].updatedAt);

        const uniqueImdbIds = new Set<string>();
        const itemMap = new Map<string, { p: PlaybackProgress; season?: number; episode?: number }>();

        progressEntries.forEach(([key, p]) => {
          // Key format: "tmdb-12345|movie" or "tmdb-12345|tv|1|3"
          const parts = key.split("|");
          const imdbId = parts[0];
          if (!uniqueImdbIds.has(imdbId)) {
            uniqueImdbIds.add(imdbId);
            const season = parts.length > 2 ? parseInt(parts[2]) : undefined;
            const episode = parts.length > 3 ? parseInt(parts[3]) : undefined;
            itemMap.set(imdbId, { p, season, episode });
          }
        });

        const movies = await getMoviesByTmdbIds(Array.from(uniqueImdbIds));

        const watchedItems: WatchedItem[] = [];
        movies.forEach((m) => {
          if (m.imdbId) {
            const data = itemMap.get(m.imdbId);
            if (data) {
              watchedItems.push({
                movie: m,
                progress: data.p,
                season: data.season,
                episode: data.episode,
              });
            }
          }
        });

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
      scrollRef.current.scrollBy({ left: direction === "left" ? -scrollAmount : scrollAmount, behavior: "smooth" });
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
  const handleMouseLeave = () => setIsDragging(false);
  const handleMouseUp = () => setIsDragging(false);
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !scrollRef.current) return;
    e.preventDefault();
    const x = e.pageX - scrollRef.current.offsetLeft;
    const walk = (x - startX) * 2;
    if (Math.abs(walk) > 10) setIsMoved(true);
    scrollRef.current.scrollLeft = scrollLeft - walk;
  };
  const handleClick = (e: React.MouseEvent) => {
    if (isMoved) { e.stopPropagation(); e.preventDefault(); }
  };

  if (loading || items.length === 0) return null;

  return (
    <section className="mb-8 relative group">
      <div className="px-4 lg:px-12 xl:px-16 mb-4 mt-6">
        <h2 className="text-xl sm:text-2xl font-semibold text-white">Continue Watching</h2>
      </div>

      <div className="relative">
        <button
          onClick={() => scroll("left")}
          className="absolute left-0 top-0 bottom-0 z-20 w-16 bg-gradient-to-r from-background to-transparent hidden md:flex opacity-0 group-hover:opacity-100 items-center justify-start pl-3 text-white transition-opacity focus:outline-none"
        >
          <ChevronLeft size={36} className="drop-shadow-lg" />
        </button>
        <button
          onClick={() => scroll("right")}
          className="absolute right-0 top-0 bottom-0 z-20 w-16 bg-gradient-to-l from-background to-transparent hidden md:flex opacity-0 group-hover:opacity-100 items-center justify-end pr-3 text-white transition-opacity focus:outline-none"
        >
          <ChevronRight size={36} className="drop-shadow-lg" />
        </button>

        <div
          ref={scrollRef}
          onMouseDown={handleMouseDown}
          onMouseLeave={handleMouseLeave}
          onMouseUp={handleMouseUp}
          onMouseMove={handleMouseMove}
          onClickCapture={handleClick}
          className={`flex overflow-x-auto gap-3 px-4 lg:px-12 xl:px-16 py-2 ${isDragging ? "cursor-grabbing" : "cursor-grab"} scrollbar-hide`}
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
        >
          {items.map(({ movie, progress, season, episode }) => {
            const pct = Math.min((progress.currentTime / progress.duration) * 100, 100);
            const progressText = formatProgress(progress.currentTime, progress.duration);

            const resumeUrl = new URL(window.location.origin + `/movie/${movie.slug}`);
            if (movie.contentType === "tv_show" && season && episode) {
              resumeUrl.searchParams.set("s", season.toString());
              resumeUrl.searchParams.set("ep", episode.toString());
            }
            resumeUrl.searchParams.set("play", "true");

            const infoUrl = `/movie/${movie.slug}`;

            return (
              <div
                key={movie.id}
                className="shrink-0 w-[260px] sm:w-[300px] group/cw select-none rounded-xl overflow-hidden bg-[#1c1c1c] shadow-2xl border border-white/5 hover:border-white/20 transition-all duration-300"
              >
                {/* Image */}
                <div className="relative aspect-video overflow-hidden">
                  {movie.backdropUrl || movie.posterUrl ? (
                    <img
                      src={optimizeImageUrl(movie.backdropUrl || movie.posterUrl, "w780")}
                      alt={movie.title}
                      loading="lazy"
                      draggable={false}
                      className="w-full h-full object-cover pointer-events-none transition-transform duration-500 group-hover/cw:scale-105"
                    />
                  ) : (
                    <div className="w-full h-full bg-white/5" />
                  )}
                  {/* Gradient bottom overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-[#1c1c1c] via-transparent to-transparent pointer-events-none" />
                </div>

                {/* Card Bottom Section */}
                <div className="px-3 pt-2.5 pb-3 bg-[#1c1c1c]">
                  {/* Buttons Row */}
                  <div className="flex items-center justify-between mb-2.5">
                    <div className="flex items-center gap-2">
                      {/* Play Button */}
                      <Link
                        href={resumeUrl.pathname + resumeUrl.search}
                        draggable={false}
                        onClick={(e) => isMoved && (e.preventDefault(), e.stopPropagation())}
                        className="w-9 h-9 rounded-full bg-white flex items-center justify-center hover:bg-white/85 transition-colors shadow-lg shrink-0"
                        title="Resume"
                      >
                        <Play size={15} fill="black" className="text-black ml-0.5" />
                      </Link>

                      {/* Add to List Button */}
                      <button
                        className="w-9 h-9 rounded-full bg-[#2a2a2a] border border-white/30 flex items-center justify-center hover:border-white/70 transition-colors shrink-0"
                        title="Add to My List"
                        onClick={(e) => e.preventDefault()}
                      >
                        <Plus size={16} className="text-white" />
                      </button>
                    </div>

                    {/* Info Button */}
                    <Link
                      href={infoUrl}
                      draggable={false}
                      onClick={(e) => isMoved && (e.preventDefault(), e.stopPropagation())}
                      className="w-9 h-9 rounded-full bg-[#2a2a2a] border border-white/30 flex items-center justify-center hover:border-white/70 transition-colors shrink-0"
                      title="More Info"
                    >
                      <Info size={16} className="text-white" />
                    </Link>
                  </div>

                  {/* Episode label for TV */}
                  {movie.contentType === "tv_show" && season && episode && (
                    <p className="text-white text-[12px] font-medium mb-2 truncate">
                      S{season}:E{episode}
                    </p>
                  )}

                  {/* Progress Bar + Time */}
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-[3px] bg-white/20 rounded-full overflow-hidden">
                      <div className="h-full bg-primary rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                    {progressText && (
                      <span className="text-[11px] text-white/50 font-medium shrink-0 whitespace-nowrap">
                        {progressText}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
