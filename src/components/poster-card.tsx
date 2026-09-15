"use client";

import Link from "next/link";
import { Star, Film } from "lucide-react";
import { optimizeImageUrl } from "@/lib/utils";

export interface PosterData {
  id: number;
  title: string;
  slug: string;
  posterUrl: string | null;
  imdbId: string | null;
  year: number | null;
  rating: string | null;
  contentType: string;
  duration: string | null;
  trailerKey: string | null;
  description: string | null;
  genres: string[] | null;
  views?: number | null;
}

export function PosterCard({ movie }: { movie: PosterData }) {

  return (
    <Link href={`/movie/${movie.slug}`} className="block w-full group/card relative" draggable={false}>
      <div className="relative aspect-[2/3] rounded-md overflow-hidden bg-surface-elevated/50 transition-all duration-300 ease-out transform group-hover/card:scale-105 group-hover/card:z-50 group-hover/card:shadow-[0_0_20px_rgba(0,0,0,0.8)] group-hover/card:ring-2 group-hover/card:ring-white">
        {movie.posterUrl ? (
          <img
            src={optimizeImageUrl(movie.posterUrl, 'w342')}
            alt={movie.title}
            loading="lazy"
            draggable={false}
            className="w-full h-full object-cover select-none pointer-events-none"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center pointer-events-none select-none">
            <Film size={24} className="text-text-muted/50" />
          </div>
        )}
        
        {/* Simple gradient overlay on hover */}
        <div className="absolute inset-0 bg-black/0 group-hover/card:bg-black/10 transition-colors duration-300 pointer-events-none" />
      </div>

      <div className="mt-2 px-1">
        <p className="text-sm font-semibold text-text-primary truncate group-hover/card:text-white transition-colors">
          {movie.title} {movie.year ? `(${movie.year})` : ""}
        </p>
        <div className="flex items-center justify-between mt-1">
          {movie.rating ? (
            <span className="flex items-center gap-1 text-[11px] font-bold text-accent">
              <Star size={10} fill="currentColor" />
              {movie.rating}
            </span>
          ) : (
            <span />
          )}
          {movie.views != null && (
            <span className="text-[11px] text-text-muted font-medium flex items-center gap-1">
               <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3 h-3"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"></path><circle cx="12" cy="12" r="3"></circle></svg>
               {movie.views.toLocaleString()}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
