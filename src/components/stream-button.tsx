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
  episodeStreams?: { id: number; seasonNumber: number; episodeNumber: number; streamUrl: string }[];
  autoPlay?: boolean;
}

export function StreamButton({ streamUrl, title, seasons, tmdbId, contentType, currentSeason, currentEpisode, episodeStreams = [], autoPlay = false }: StreamButtonProps) {
  const [isOpen, setIsOpen] = useState(autoPlay);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Lock body scroll and handle screen orientation when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
      // Attempt to lock screen orientation to landscape on mobile
      try {
        if (screen.orientation && (screen.orientation as any).lock) {
          (screen.orientation as any).lock("landscape").catch((err: any) => {
            console.log("Orientation lock failed:", err);
          });
        }
      } catch (e) {
        console.log("Screen orientation API not supported");
      }
    } else {
      document.body.style.overflow = "unset";
      // Unlock screen orientation when modal is closed
      try {
        if (screen.orientation && (screen.orientation as any).unlock) {
          (screen.orientation as any).unlock();
        }
      } catch (e) {}
    }
    
    return () => {
      document.body.style.overflow = "unset";
      try {
        if (screen.orientation && (screen.orientation as any).unlock) {
          (screen.orientation as any).unlock();
        }
      } catch (e) {}
    };
  }, [isOpen]);

  const fallbackUrl = "https://dash.akamaized.net/akamai/bbb_30fps/bbb_30fps.mpd";

  const [playingSeason, setPlayingSeason] = useState<number>(currentSeason || 1);
  const [playingEpisode, setPlayingEpisode] = useState<number>(currentEpisode || 1);
  const [currentUrlToPlay, setCurrentUrlToPlay] = useState<string>(() => {
    // Pick the initial URL: use first episodeStream for S1E1, else fallback
    const initStream = episodeStreams.find(s => s.seasonNumber === (currentSeason || 1) && s.episodeNumber === (currentEpisode || 1));
    return initStream?.streamUrl || streamUrl || fallbackUrl;
  });

  const handleEpisodeChange = (seasonNum: number, epNum: number) => {
    setPlayingSeason(seasonNum);
    setPlayingEpisode(epNum);
    // Look up the specific stream URL — same logic as SeriesEpisodes.handlePlayEpisode
    const specificStream = episodeStreams.find(
      s => s.seasonNumber === seasonNum && s.episodeNumber === epNum
    );
    setCurrentUrlToPlay(specificStream?.streamUrl || streamUrl || fallbackUrl);
  };

  const modalContent = isOpen && mounted ? (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black animate-in fade-in duration-200">
      <div className="relative w-full h-full flex flex-col">
        <DashPlayer 
          key={`${playingSeason}-${playingEpisode}`}
          url={currentUrlToPlay} 
          title={title} 
          onClose={() => setIsOpen(false)}
          seasons={seasons}
          tmdbId={tmdbId}
          contentType={contentType}
          currentSeason={playingSeason}
          currentEpisode={playingEpisode}
          onEpisodeChange={handleEpisodeChange}
          episodeStreams={episodeStreams}
          fallbackStreamUrl={streamUrl || undefined}
        />
      </div>
    </div>
  ) : null;

  return (
    <>
      <button
        onClick={() => {
          setIsOpen(true);
          try {
            if (screen.orientation && (screen.orientation as any).lock) {
              (screen.orientation as any).lock("landscape").catch(() => {});
            }
          } catch (e) {}
        }}
        className="flex items-center gap-2 px-6 py-2.5 sm:px-8 sm:py-3 bg-white hover:bg-white/90 text-black rounded-full font-bold text-sm sm:text-base transition-colors shadow-lg cursor-pointer"
      >
        <Play size={20} fill="currentColor" />
        Play
      </button>

      {mounted && modalContent ? createPortal(modalContent, document.body) : null}
    </>
  );
}
