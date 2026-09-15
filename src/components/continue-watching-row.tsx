"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Clock } from "lucide-react";
import { getAllProgress, getAllMovieMeta, PlaybackProgress, CachedMovieMeta } from "@/lib/progress";
import { optimizeImageUrl } from "@/lib/utils";

interface WatchedItem {
  meta: CachedMovieMeta;
  progress: PlaybackProgress;
  season?: number;
  episode?: number;
}

function formatTimeLeft(currentTime: number, duration: number) {
  const leftSeconds = duration - currentTime;
  if (leftSeconds <= 0) return "Finished";
  const hours = Math.floor(leftSeconds / 3600);
  const minutes = Math.floor((leftSeconds % 3600) / 60);
  if (hours > 0) return `${hours}hr ${minutes}m left`;
  return `${minutes}m left`;
}

export function ContinueWatchingRow() {
  const [items, setItems] = useState<WatchedItem[]>([]);

  const scrollRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isMoved, setIsMoved] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);

  useEffect(() => {
    // Both getAllProgress() and getAllMovieMeta() are pure localStorage reads — instant, no network.
    const allProgress = getAllProgress();
    const allMeta = getAllMovieMeta();

    const progressEntries = Object.entries(allProgress).filter(([_, p]) => {
      return p.duration > 0 && p.currentTime > 5 && (p.currentTime / p.duration) < 0.95;
    });

    if (progressEntries.length === 0) {
      setItems([]);
      return;
    }

    progressEntries.sort((a, b) => b[1].updatedAt - a[1].updatedAt);

    const seen = new Set<string>();
    const result: WatchedItem[] = [];

    progressEntries.forEach(([key, p]) => {
      // Key format: "tmdb-12345|movie" or "tmdb-12345|tv|1|3"
      const parts = key.split("|");
      const imdbId = parts[0];
      if (seen.has(imdbId)) return;
      seen.add(imdbId);

      const meta = allMeta[imdbId];
      if (!meta) return; // No cached metadata yet (user hasn't visited the movie page since update)

      const season = parts.length > 2 ? parseInt(parts[2]) : undefined;
      const episode = parts.length > 3 ? parseInt(parts[3]) : undefined;

      result.push({ meta, progress: p, season, episode });
    });

    setItems(result);
  }, []);

  const scroll = (direction: "left" | "right") => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({
        left: direction === "left" ? -(scrollRef.current.clientWidth * 0.8) : scrollRef.current.clientWidth * 0.8,
        behavior: "smooth",
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

  if (items.length === 0) return null;

  return (
    <section className="mb-10 relative group">
      <div className="px-4 lg:px-12 xl:px-16 mb-4 mt-6">
        <h2 className="text-xl sm:text-2xl font-semibold text-white">Continue Watching</h2>
      </div>

      <div className="relative">
        <button
          onClick={() => scroll("left")}
          className="absolute left-0 top-0 bottom-6 z-20 w-16 bg-gradient-to-r from-background to-transparent hidden md:flex opacity-0 group-hover:opacity-100 items-center justify-start pl-3 text-white transition-opacity focus:outline-none"
        >
          <ChevronLeft size={36} />
        </button>
        <button
          onClick={() => scroll("right")}
          className="absolute right-0 top-0 bottom-6 z-20 w-16 bg-gradient-to-l from-background to-transparent hidden md:flex opacity-0 group-hover:opacity-100 items-center justify-end pr-3 text-white transition-opacity focus:outline-none"
        >
          <ChevronRight size={36} />
        </button>

        <div
          ref={scrollRef}
          onMouseDown={handleMouseDown}
          onMouseLeave={handleMouseLeave}
          onMouseUp={handleMouseUp}
          onMouseMove={handleMouseMove}
          onClickCapture={handleClick}
          className={`flex overflow-x-auto gap-4 px-4 lg:px-12 xl:px-16 py-2 ${isDragging ? "cursor-grabbing" : "cursor-grab"} scrollbar-hide`}
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
        >
          {items.map(({ meta, progress, season, episode }) => {
            const pct = Math.min((progress.currentTime / progress.duration) * 100, 100);
            const timeLeft = formatTimeLeft(progress.currentTime, progress.duration);

            const resumeUrl = new URL(window.location.origin + `/movie/${meta.slug}`);
            if ((meta.contentType === "tv_show" || meta.contentType === "tv") && season && episode) {
              resumeUrl.searchParams.set("s", season.toString());
              resumeUrl.searchParams.set("ep", episode.toString());
            }
            resumeUrl.searchParams.set("play", "true");

            const imageUrl = meta.backdropUrl || meta.posterUrl;

            return (
              <Link
                key={meta.imdbId}
                href={resumeUrl.pathname + resumeUrl.search}
                draggable={false}
                className="shrink-0 w-[240px] sm:w-[280px] group/cw block select-none"
              >
                {/* Image with progress bar */}
                <div className="relative aspect-video rounded-xl overflow-hidden bg-white/5 mb-2.5 ring-1 ring-white/10 group-hover/cw:ring-white/40 transition-all duration-300">
                  {imageUrl ? (
                    <img
                      src={optimizeImageUrl(imageUrl, "w780")}
                      alt={meta.title}
                      loading="lazy"
                      draggable={false}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover/cw:scale-105 pointer-events-none"
                    />
                  ) : (
                    <div className="w-full h-full bg-white/5" />
                  )}
                  {/* Bottom progress bar */}
                  <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-white/20">
                    <div className="h-full bg-primary transition-all" style={{ width: `${pct}%` }} />
                  </div>
                </div>

                {/* Title + Meta */}
                <div className="px-0.5">
                  <h3 className="text-sm font-bold text-white truncate mb-1 group-hover/cw:text-white/80 transition-colors">
                    {meta.title}
                  </h3>
                  <div className="flex items-center gap-1.5 text-xs text-white/50 font-medium">
                    {(meta.contentType === "tv_show" || meta.contentType === "tv") && season && episode && (
                      <>
                        <span>S{season}:E{episode}</span>
                        <span className="text-white/25">·</span>
                      </>
                    )}
                    <Clock size={11} className="shrink-0" />
                    <span>{timeLeft}</span>
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
