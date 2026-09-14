"use client";

import { useEffect } from "react";
import Link from "next/link";
import { X, Star, Download, Film, Clock } from "lucide-react";
import type { PosterData } from "./poster-card";

export function TrailerModal({
  movie,
  onClose,
}: {
  movie: PosterData;
  onClose: () => void;
}) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-3xl bg-surface border border-border rounded-xl overflow-hidden shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-3 right-3 z-10 w-8 h-8 rounded-full bg-black/60 hover:bg-black/90 text-white flex items-center justify-center transition-colors"
          aria-label="Close"
        >
          <X size={16} />
        </button>

        {/* Trailer */}
        <div className="aspect-video bg-black">
          {movie.trailerKey ? (
            <iframe
              className="w-full h-full"
              src={`https://www.youtube.com/embed/${movie.trailerKey}?autoplay=1&rel=0`}
              title={`${movie.title} Trailer`}
              allow="autoplay; encrypted-media; picture-in-picture"
              allowFullScreen
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center text-text-muted">
              <Film size={32} />
              <p className="text-sm mt-2">Trailer belum tersedia</p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
