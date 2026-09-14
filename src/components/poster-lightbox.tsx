"use client";

import { Film } from "lucide-react";

export function PosterLightbox({ posterUrl, title }: { posterUrl: string | null; title: string }) {
  return (
    <div className="aspect-[2/3] rounded-xl overflow-hidden shadow-xl border border-border/50 bg-surface-elevated relative">
      {posterUrl ? (
        <img
          src={posterUrl}
          alt={title}
          className="w-full h-full object-cover"
        />
      ) : (
        <div className="w-full h-full flex flex-col items-center justify-center text-text-muted p-4 text-center">
          <Film size={40} className="mb-2 opacity-50" />
          <span className="text-sm font-medium">No Poster</span>
        </div>
      )}
    </div>
  );
}

