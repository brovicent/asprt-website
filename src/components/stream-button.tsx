"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { Play } from "lucide-react";
import dynamic from "next/dynamic";
import { saveMovieMeta, getAllProgress } from "@/lib/progress";

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
  movieMeta?: {
    slug: string;
    backdropUrl: string | null;
    posterUrl: string | null;
  };
}

export function StreamButton({ streamUrl, title, seasons, tmdbId, contentType, currentSeason, currentEpisode, episodeStreams = [], autoPlay = false, movieMeta }: StreamButtonProps) {
  const [isOpen, setIsOpen] = useState(autoPlay);
  const [wasOpenedByClick, setWasOpenedByClick] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [resumeLabel, setResumeLabel] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
    // Cache movie metadata in localStorage so Continue Watching loads instantly
    if (tmdbId && movieMeta) {
      saveMovieMeta({
        imdbId: tmdbId,
        title,
        slug: movieMeta.slug,
        backdropUrl: movieMeta.backdropUrl,
        posterUrl: movieMeta.posterUrl,
        contentType: contentType || "movie",
      });
    }
    // Check for existing progress to show Resume label
    if (tmdbId) {
      const allProgress = getAllProgress();
      const prefix = `${tmdbId}|`;
      let latestEntry: { key: string; updatedAt: number } | null = null;
      for (const key in allProgress) {
        if (key.startsWith(prefix)) {
          const p = allProgress[key];
          if (p.duration > 0 && p.currentTime > 5 && p.currentTime / p.duration < 0.95) {
            if (!latestEntry || p.updatedAt > latestEntry.updatedAt) {
              latestEntry = { key, updatedAt: p.updatedAt };
            }
          }
        }
      }
      if (latestEntry) {
        const parts = latestEntry.key.split("|");
        const isTv = parts[1] === "tv";
        if (isTv && parts.length >= 4) {
          setResumeLabel(`Resume S${parts[2]}:E${parts[3]}`);
        } else {
          setResumeLabel("Resume");
        }
      }
    }
  }, []);

  // Lock body scroll and handle screen orientation when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
      document.documentElement.style.overflow = "hidden";
      document.body.classList.add("scrollbar-hide");
      document.documentElement.classList.add("scrollbar-hide");
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
      document.documentElement.style.overflow = "unset";
      document.body.classList.remove("scrollbar-hide");
      document.documentElement.classList.remove("scrollbar-hide");
      // Unlock screen orientation when modal is closed
      try {
        if (screen.orientation && (screen.orientation as any).unlock) {
          (screen.orientation as any).unlock();
        }
      } catch (e) {}
    }
    
    return () => {
      document.body.style.overflow = "unset";
      document.documentElement.style.overflow = "unset";
      document.body.classList.remove("scrollbar-hide");
      document.documentElement.classList.remove("scrollbar-hide");
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
          shouldAutoPlay={wasOpenedByClick}
        />
      </div>
    </div>
  ) : null;

  return (
    <>
      <button
        onClick={() => {
          setWasOpenedByClick(true);
          setIsOpen(true);
          try {
            if (screen.orientation && (screen.orientation as any).lock) {
              (screen.orientation as any).lock("landscape").catch(() => {});
            }
          } catch (e) {}
        }}
        className="flex items-center gap-2 px-6 py-2.5 sm:px-8 sm:py-3 bg-white hover:bg-white/90 text-black rounded-full font-bold text-sm sm:text-base transition-colors shadow-lg cursor-pointer"
      >
        <Play size={18} fill="currentColor" />
        {resumeLabel ?? "Play"}
      </button>

      {mounted && modalContent ? createPortal(modalContent, document.body) : null}
    </>
  );
}
