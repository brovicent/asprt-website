"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { Play, ChevronLeft, ChevronRight, Star } from "lucide-react";
import { optimizeImageUrl } from "@/lib/utils";

export function HeroBanner({ movies, logos = [] }: { movies: any[], logos?: (string | null)[] }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const startAutoPlay = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % movies.length);
    }, 6000);
  }, [movies.length]);

  useEffect(() => {
    if (!movies || movies.length === 0) return;
    if (!isPaused) startAutoPlay();
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [movies, isPaused, startAutoPlay]);

  if (!movies || movies.length === 0) return null;

  const movie = movies[currentIndex];

  const goToSlide = (index: number) => {
    setCurrentIndex(index);
    setIsPaused(true);
    // Resume auto-play after 8 seconds of inactivity
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = setTimeout(() => {
      setIsPaused(false);
    }, 8000) as unknown as NodeJS.Timeout;
  };

  const goPrev = () => goToSlide((currentIndex - 1 + movies.length) % movies.length);
  const goNext = () => goToSlide((currentIndex + 1) % movies.length);

  return (
    <div className="relative w-full h-[60vh] sm:h-[75vh] md:h-[90vh] min-h-[450px] flex items-end pb-24 sm:pb-36 group overflow-hidden">
      
      {/* Background Images with Crossfade */}
      {movies.map((m, idx) => (
        <div 
          key={`bg-${m.id}`}
          className={`absolute inset-0 w-full h-full transition-opacity duration-1000 ease-in-out ${idx === currentIndex ? 'opacity-100 z-0' : 'opacity-0 -z-10'}`}
        >
          {m.backdropUrl ? (
            <img
              src={optimizeImageUrl(m.backdropUrl, "w1280")}
              alt={m.title}
              className="w-full h-full object-cover"
              loading={idx === 0 ? "eager" : "lazy"}
            />
          ) : (
            <div className="w-full h-full bg-surface-elevated" />
          )}
          {/* Gradients */}
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-r from-background/90 via-background/40 to-transparent" />
        </div>
      ))}

      {/* Prev Arrow */}
      <button
        onClick={goPrev}
        aria-label="Previous"
        className="absolute left-3 sm:left-6 top-1/2 -translate-y-1/2 z-30 bg-black/40 hover:bg-black/70 backdrop-blur-md text-white p-2 sm:p-3 rounded-full transition-all duration-200 opacity-0 group-hover:opacity-100 hover:scale-110 shadow-lg"
      >
        <ChevronLeft className="w-5 h-5 sm:w-6 sm:h-6" />
      </button>

      {/* Next Arrow */}
      <button
        onClick={goNext}
        aria-label="Next"
        className="absolute right-3 sm:right-6 top-1/2 -translate-y-1/2 z-30 bg-black/40 hover:bg-black/70 backdrop-blur-md text-white p-2 sm:p-3 rounded-full transition-all duration-200 opacity-0 group-hover:opacity-100 hover:scale-110 shadow-lg"
      >
        <ChevronRight className="w-5 h-5 sm:w-6 sm:h-6" />
      </button>

      {/* Content */}
      <div className="relative z-10 w-full px-4 lg:px-12 xl:px-16 h-full flex items-end">
        <div className="relative w-full max-w-2xl h-full flex items-end">
          {movies.map((m, idx) => {
            const logoUrl = logos[idx];
            const isActive = idx === currentIndex;
            
            return (
              <div 
                key={`content-${m.id}`}
                className={`absolute bottom-12 sm:bottom-20 left-0 w-full transform ${
                  isActive 
                    ? 'opacity-100 translate-y-0 pointer-events-auto z-10 transition-all duration-1000 ease-out delay-100' 
                    : 'opacity-0 translate-y-8 pointer-events-none -z-10 transition-none'
                }`}
              >
                {logoUrl ? (
                  <img 
                    src={logoUrl} 
                    alt={m.title} 
                    className="max-h-16 sm:max-h-24 md:max-h-32 lg:max-h-40 w-auto object-contain mb-6 drop-shadow-2xl" 
                    loading={idx === 0 ? "eager" : "lazy"}
                  />
                ) : (
                  <h1 className="text-3xl sm:text-5xl md:text-6xl lg:text-7xl font-black text-white tracking-tighter drop-shadow-xl mb-4">
                    {m.title}
                  </h1>
                )}
                
                <div className="flex items-center gap-4 mb-4 text-sm sm:text-base font-semibold text-white/90 drop-shadow-md">
                  {m.rating && (
                    <span className="flex items-center gap-1">
                      <Star size={16} fill="currentColor" className="text-white" /> {m.rating}
                    </span>
                  )}
                  {m.year && <span>{m.year}</span>}
                  <span className="px-1.5 py-0.5 border border-white/40 rounded text-xs uppercase tracking-wider bg-black/20 backdrop-blur-sm">
                     {m.contentType === "movie" ? "Movie" : "Series"}
                  </span>
                </div>

                {m.description && (
                  <p className="text-xs sm:text-sm md:text-base text-white/80 drop-shadow-md line-clamp-3 mb-6 max-w-xl font-medium leading-relaxed">
                    {m.description}
                  </p>
                )}
              </div>
            );
          })}

          {/* Stationary Buttons */}
          <div className="absolute bottom-0 left-0 w-full flex items-center gap-3 pointer-events-auto z-20">
            <Link
              href={`/movie/${movie.slug}`}
              className="flex items-center gap-2 px-6 py-2.5 sm:px-8 sm:py-3 bg-white hover:bg-white/90 text-black rounded-full font-bold text-sm sm:text-base transition-colors shadow-lg"
            >
              <Play size={20} fill="currentColor" />
              Play
            </Link>
          </div>
        </div>
      </div>

      {/* Pagination Dots */}
      <div className="absolute bottom-16 sm:bottom-28 left-0 right-0 z-20 flex items-center justify-center gap-2">
        <style>{`
          @keyframes slideProgress {
            0% { width: 0%; }
            100% { width: 100%; }
          }
        `}</style>
        {movies.map((_, idx) => {
          const isActive = idx === currentIndex;
          return (
            <button
              key={`dot-${idx}`}
              onClick={() => goToSlide(idx)}
              className={`relative overflow-hidden transition-all duration-300 rounded-full ${isActive ? 'w-10 h-2 bg-white/30' : 'w-2 h-2 bg-white/40 hover:bg-white/70'}`}
              aria-label={`Go to slide ${idx + 1}`}
            >
              {isActive && (
                <div 
                  key={`progress-${currentIndex}-${isPaused ? 'paused' : 'playing'}`} 
                  className="absolute top-0 left-0 h-full bg-white rounded-full"
                  style={{ animation: isPaused ? 'none' : 'slideProgress 6s linear forwards', width: isPaused ? '100%' : undefined }}
                />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
