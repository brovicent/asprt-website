"use client";

import { useRef } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Film } from "lucide-react";
import { optimizeImageUrl } from "@/lib/utils";

export function RelatedCarousel({ related, title }: { related: any[], title: string }) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: "left" | "right") => {
    if (scrollRef.current && scrollRef.current.firstElementChild) {
      const child = scrollRef.current.firstElementChild as HTMLElement;
      // We calculate one poster width + approx gap (16px)
      // CSS snap-mandatory will handle the exact pixel perfect snapping
      const scrollAmount = child.offsetWidth + 16;
      scrollRef.current.scrollBy({
        left: direction === "left" ? -scrollAmount : scrollAmount,
        behavior: "smooth"
      });
    }
  };

  if (!related || related.length === 0) return null;

  return (
    <section className="mt-10 sm:mt-12 relative">
      <div className="flex items-center justify-between mb-3 sm:mb-4">
        <h2 className="text-base sm:text-lg font-semibold text-text-primary">
          {title}
        </h2>
        
        {/* Navigation Buttons - Hidden on very small screens since touch swipe is natural */}
        <div className="hidden min-[400px]:flex items-center gap-1.5 sm:gap-2">
          <button 
            onClick={() => scroll("left")} 
            className="p-1.5 sm:p-2 rounded-full bg-surface hover:bg-surface-elevated border border-border text-text-primary transition-colors focus:outline-none focus:ring-2 focus:ring-primary/50"
            aria-label="Scroll left"
          >
            <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
          <button 
            onClick={() => scroll("right")} 
            className="p-1.5 sm:p-2 rounded-full bg-surface hover:bg-surface-elevated border border-border text-text-primary transition-colors focus:outline-none focus:ring-2 focus:ring-primary/50"
            aria-label="Scroll right"
          >
            <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        </div>
      </div>

      <div 
        ref={scrollRef}
        // Added negative margin trick on mobile to allow full edge-to-edge swiping if needed, 
        // or just keep it simple with padding bottom
        className="flex overflow-x-auto gap-3 sm:gap-4 pb-4 snap-x snap-mandatory scrollbar-hide" 
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {related.map((item) => (
          <Link
            key={item.id}
            href={`/movie/${item.slug}`}
            className="group block shrink-0 snap-start w-[110px] min-[400px]:w-[125px] sm:w-[140px] md:w-[160px]"
          >
            <div className="aspect-[2/3] rounded-lg overflow-hidden bg-surface-elevated relative shadow-sm">
              {item.posterUrl ? (
                <img
                  src={optimizeImageUrl(item.posterUrl, 'w342')}
                  alt={item.title}
                  loading="lazy"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Film size={24} className="text-text-muted" />
                </div>
              )}
            </div>
            <p className="mt-2 text-xs sm:text-sm font-medium text-text-secondary truncate group-hover:text-text-primary transition-colors">
              {item.title}
            </p>
          </Link>
        ))}
      </div>
    </section>
  );
}
