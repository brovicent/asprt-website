"use client";

import { useRef, useEffect } from "react";

import Link from "next/link";
import { Flame, Star, Download, ChevronLeft, ChevronRight } from "lucide-react";
import { optimizeImageUrl } from "@/lib/utils";

export function TrendingCarousel({ trending }: { trending: any[] }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  // Fix: Track hover state so the auto-scroll interval can pause while the user
  // is reading a card. Using a ref (not state) avoids re-renders.
  const isHoveredRef = useRef(false);

  const scroll = (direction: "left" | "right") => {
    if (scrollRef.current) {
      const scrollAmount = scrollRef.current.clientWidth > 600 ? 600 + 16 : scrollRef.current.clientWidth * 0.8;
      scrollRef.current.scrollBy({
        left: direction === "left" ? -scrollAmount : scrollAmount,
        behavior: "smooth"
      });
    }
  };

  useEffect(() => {
    if (!trending || trending.length === 0) return;

    const el = scrollRef.current;
    if (!el) return;

    // Pause auto-scroll when user hovers
    const handleMouseEnter = () => { isHoveredRef.current = true; };
    const handleMouseLeave = () => { isHoveredRef.current = false; };
    el.addEventListener("mouseenter", handleMouseEnter);
    el.addEventListener("mouseleave", handleMouseLeave);

    const intervalId = setInterval(() => {
      // Fix: Skip scroll tick if user is hovering over the carousel
      if (isHoveredRef.current) return;

      if (scrollRef.current) {
        const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
        const scrollAmount = clientWidth > 600 ? 600 + 16 : clientWidth * 0.8;

        // If we reached the end (with a small 10px buffer), scroll back to start
        if (scrollLeft + clientWidth >= scrollWidth - 10) {
          scrollRef.current.scrollTo({
            left: 0,
            behavior: "smooth"
          });
        } else {
          scrollRef.current.scrollBy({
            left: scrollAmount,
            behavior: "smooth"
          });
        }
      }
    }, 5000);

    return () => {
      clearInterval(intervalId);
      el.removeEventListener("mouseenter", handleMouseEnter);
      el.removeEventListener("mouseleave", handleMouseLeave);
    };
  }, [trending]);


  if (!trending || trending.length === 0) return null;

  return (
    <section className="relative">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-text-primary flex items-center gap-2">
          <Flame size={18} className="text-accent" />
          Top 10 Trending
        </h2>
        
        {/* Navigation Buttons */}
        <div className="flex items-center gap-2">
          <button 
            onClick={() => scroll("left")} 
            className="p-1.5 sm:p-2 rounded-full bg-surface hover:bg-surface-elevated border border-border text-text-primary transition-colors focus:outline-none focus:ring-2 focus:ring-primary/50"
            aria-label="Scroll left"
          >
            <ChevronLeft size={18} />
          </button>
          <button 
            onClick={() => scroll("right")} 
            className="p-1.5 sm:p-2 rounded-full bg-surface hover:bg-surface-elevated border border-border text-text-primary transition-colors focus:outline-none focus:ring-2 focus:ring-primary/50"
            aria-label="Scroll right"
          >
            <ChevronRight size={18} />
          </button>
        </div>
      </div>

      <div 
        ref={scrollRef}
        className="flex overflow-x-auto gap-4 pb-4 snap-x snap-mandatory scrollbar-hide" 
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {trending.slice(0, 10).map((item, i) => (
          <div key={item.id} className="snap-center shrink-0 border-[8px] border-transparent">
            <div className="w-[85vw] sm:w-[600px] relative rounded-xl overflow-hidden border border-border bg-surface group h-full">
              {/* Backdrop */}
              <div className="absolute inset-0">
                {item.backdropUrl ? (
                  <img 
                    src={optimizeImageUrl(item.backdropUrl, 'w780')} 
                    alt="" 
                    // Fix: First slide is the LCP element — use eager loading to avoid
                    // delaying the critical render path. Subsequent slides use lazy.
                    loading={i === 0 ? "eager" : "lazy"}
                    className="w-full h-full object-cover opacity-60 group-hover:opacity-40 transition-opacity" 
                  />
                ) : (
                  <div className="w-full h-full bg-surface-elevated" />
                )}

                <div className="absolute inset-0 bg-gradient-to-r from-background via-background/90 to-transparent" />
              </div>

              <div className="relative flex items-center gap-4 p-4 sm:p-6 min-h-[200px]">
                {/* Rank Badge */}
                <span className="absolute top-4 left-4 flex items-center gap-1 text-xs font-bold text-accent uppercase tracking-wider">
                  <Flame size={12} /> #{i + 1} Trending
                </span>

                {/* Poster */}
                <div className="hidden sm:block w-24 flex-shrink-0 mt-6">
                  <div className="aspect-[2/3] rounded-lg overflow-hidden shadow-xl border border-border/50">
                    {item.posterUrl && (
                      <img 
                        src={optimizeImageUrl(item.posterUrl, 'w342')} 
                        alt={item.title} 
                        loading="lazy"
                        className="w-full h-full object-cover" 
                      />
                    )}
                  </div>
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0 mt-6">
                  <h3 className="text-xl sm:text-2xl font-bold text-text-primary leading-tight">
                    {item.title}
                  </h3>
                  <div className="flex items-center gap-3 mt-1 text-sm text-text-secondary">
                    {item.rating && (
                      <span className="flex items-center gap-1 text-accent font-medium">
                        <Star size={12} fill="currentColor" /> {item.rating}
                      </span>
                    )}
                    {item.year && <span>{item.year}</span>}
                    {item.duration && <span>{item.duration}</span>}
                  </div>
                  {item.description && (
                    <p className="mt-2 text-sm text-text-secondary line-clamp-2 max-w-md">
                      {item.description}
                    </p>
                  )}
                  <Link
                    href={`/movie/${item.slug}`}
                    className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary-hover text-white rounded-full text-xs sm:text-sm font-semibold transition-colors"
                  >
                    View
                  </Link>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
