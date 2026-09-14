"use client";

import { useState } from "react";
import { Play, Film } from "lucide-react";
import { TrailerModal } from "./trailer-modal";
import type { PosterData } from "./poster-card";

export function TrailerButton({ movie }: { movie: PosterData }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 px-4 py-2 bg-surface-elevated hover:bg-surface-hover border border-border text-text-primary rounded-full text-sm font-medium transition-colors"
      >
        <Play size={15} fill="currentColor" />
        Tonton Trailer
      </button>
      {open && <TrailerModal movie={movie} onClose={() => setOpen(false)} />}
    </>
  );
}
