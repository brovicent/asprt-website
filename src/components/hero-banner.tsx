"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Play, Plus, Info, Star } from "lucide-react";
import { optimizeImageUrl } from "@/lib/utils";

export function HeroBanner({ movies, logos = [] }: { movies: any[], logos?: (string | null)[] }) {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (!movies || movies.length === 0) return;
    const interval = setInterval(() => {
      setCurrentIndex((prevIndex) => (prevIndex + 1) % movies.length);
    }, 6000); // 6 seconds per slide
    return () => clearInterval(interval);
  }, [movies]);

  if (!movies || movies.length === 0) return null;

  const movie = movies[currentIndex];
  const logoUrl = logos[currentIndex];
  const goToSlide = (index: number) => setCurrentIndex(index);

  return (
    <div className="relative w-full h-[70vh] sm:h-[85vh] md:h-[90vh] min-h-[500px] flex items-end pb-24 sm:pb-36 group overflow-hidden">
      
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
          {/* Gradients to fade into background */}
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-r from-background/90 via-background/40 to-transparent" />
        </div>
      ))}

      {/* Content */}
      <div className="relative z-10 w-full px-4 lg:px-12 xl:px-16 h-full flex items-end">
        <div className="relative w-full max-w-2xl h-full flex items-end">
          {movies.map((m, idx) => {
            const logoUrl = logos[idx];
            const isActive = idx === currentIndex;
            
            return (
              <div 
                key={`content-${m.id}`}
                className={`absolute bottom-16 sm:bottom-20 left-0 w-full transform ${
                  isActive 
                    ? 'opacity-100 translate-y-0 pointer-events-auto z-10 transition-all duration-1000 ease-out delay-100' 
                    : 'opacity-0 translate-y-8 pointer-events-none -z-10 transition-none'
                }`}
              >
                {logoUrl ? (
                  <img 
                    src={logoUrl} 
                    alt={m.title} 
                    className="max-h-24 sm:max-h-32 md:max-h-40 w-auto object-contain mb-6 drop-shadow-2xl" 
                    loading={idx === 0 ? "eager" : "lazy"}
                  />
                ) : (
                  <h1 className="text-5xl sm:text-6xl md:text-7xl font-black text-white tracking-tighter drop-shadow-xl mb-4">
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
                  <p className="text-sm sm:text-base md:text-lg text-white/80 drop-shadow-md line-clamp-3 mb-6 max-w-xl font-medium leading-relaxed">
                    {m.description}
                  </p>
                )}
              </div>
            );
          })}

          {/* Stationary Buttons - Not affected by crossfade animation */}
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

      {/* Pagination Indicators */}
      <div className="absolute bottom-20 sm:bottom-28 left-0 right-0 z-20 flex items-center justify-center gap-2">
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
                  key={`progress-${currentIndex}`} 
                  className="absolute top-0 left-0 h-full bg-white rounded-full"
                  style={{ animation: 'slideProgress 6s linear forwards' }}
                />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
