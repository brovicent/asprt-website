"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { Play } from "lucide-react";
import dynamic from "next/dynamic";

const DashPlayer = dynamic(() => import("./dash-player"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full bg-black flex items-center justify-center">
      <span className="text-white/50 text-sm">Loading player...</span>
    </div>
  ),
});

interface StreamButtonProps {
  streamUrl: string | null;
  title: string;
  seasons?: { season_number: number; name: string; episode_count: number }[];
  tmdbId?: string;
  contentType?: string;
  currentSeason?: number;
  currentEpisode?: number;
}

export function StreamButton({ streamUrl, title, seasons, tmdbId, contentType, currentSeason, currentEpisode }: StreamButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Lock body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  // For testing, use a dummy DASH url if streamUrl is missing
  // Updated to point to the user's local DASH server running on port 8080 (using the fixed manifest)
  const urlToPlay = streamUrl || (mounted ? `/video-stream/manifest_fixed.mpd` : "");

  const [playingSeason, setPlayingSeason] = useState<number>(currentSeason || 1);
  const [playingEpisode, setPlayingEpisode] = useState<number>(currentEpisode || 1);

  // Update local state if props change
  useEffect(() => {
    if (currentSeason) setPlayingSeason(currentSeason);
    if (currentEpisode) setPlayingEpisode(currentEpisode);
  }, [currentSeason, currentEpisode]);

  const handleEpisodeChange = (seasonNum: number, epNum: number) => {
    setPlayingSeason(seasonNum);
    setPlayingEpisode(epNum);
  };

  const modalContent = isOpen && mounted ? (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black animate-in fade-in duration-200">
      <div className="relative w-full h-full flex flex-col">
        <DashPlayer 
          key={`${playingSeason}-${playingEpisode}`}
          url={urlToPlay} 
          title={title} 
          onClose={() => setIsOpen(false)}
          seasons={seasons}
          tmdbId={tmdbId}
          contentType={contentType}
          currentSeason={playingSeason}
          currentEpisode={playingEpisode}
          onEpisodeChange={handleEpisodeChange}
        />
      </div>
    </div>
  ) : null;

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 px-6 py-2.5 sm:px-8 sm:py-3 bg-white hover:bg-white/90 text-black rounded-full font-bold text-sm sm:text-base transition-colors shadow-lg cursor-pointer"
      >
        <Play size={20} fill="currentColor" />
        Play
      </button>

      {mounted && modalContent ? createPortal(modalContent, document.body) : null}
    </>
  );
}
