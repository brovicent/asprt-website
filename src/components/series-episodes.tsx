"use client";

import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { getTMDBSeason } from "@/lib/actions";
import { ChevronDown, Play } from "lucide-react";
import dynamic from "next/dynamic";
import { useRouter, usePathname } from "next/navigation";

const DashPlayer = dynamic(() => import("./dash-player"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full bg-black flex items-center justify-center">
      <span className="text-white/50 text-sm">Loading player...</span>
    </div>
  ),
});

interface Season {
  season_number: number;
  name: string;
  episode_count: number;
}

interface Episode {
  id: number;
  episode_number: number;
  name: string;
  overview: string;
  still_path: string | null;
  runtime: number;
  vote_average: number;
}

interface EpisodeStream {
  id: number;
  seasonNumber: number;
  episodeNumber: number;
  streamUrl: string;
}

interface SeriesEpisodesProps {
  tmdbId: string;
  seasons: Season[];
  streamUrl?: string;
  title?: string;
  episodeStreams?: EpisodeStream[];
  initialSeason?: number;
}

export function SeriesEpisodes({ tmdbId, seasons, streamUrl, title, episodeStreams = [], initialSeason }: SeriesEpisodesProps) {
  const router = useRouter();
  const pathname = usePathname();
  
  const validSeasons = seasons.filter(s => s.season_number > 0);
  const [selectedSeason, setSelectedSeason] = useState<number>(initialSeason || (validSeasons.length > 0 ? validSeasons[0].season_number : 1));
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);

  // Player state
  const [playerOpen, setPlayerOpen] = useState(false);
  const [playingSeason, setPlayingSeason] = useState<number>(1);
  const [playingEpisode, setPlayingEpisode] = useState<number>(1);
  const [currentUrlToPlay, setCurrentUrlToPlay] = useState<string>("");

  // Drag to scroll logic
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isMoved, setIsMoved] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);

  useEffect(() => {
    setMounted(true);
    // Lock scroll when player open
    if (playerOpen) {
      document.body.style.overflow = "hidden";
      document.documentElement.style.overflow = "hidden";
      document.body.classList.add("scrollbar-hide");
      document.documentElement.classList.add("scrollbar-hide");
    } else {
      document.body.style.overflow = "unset";
      document.documentElement.style.overflow = "unset";
      document.body.classList.remove("scrollbar-hide");
      document.documentElement.classList.remove("scrollbar-hide");
    }
    return () => { 
      document.body.style.overflow = "unset"; 
      document.documentElement.style.overflow = "unset";
      document.body.classList.remove("scrollbar-hide");
      document.documentElement.classList.remove("scrollbar-hide");
    };
  }, [playerOpen]);

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setIsMoved(false);
    if (scrollRef.current) {
      setStartX(e.pageX - scrollRef.current.offsetLeft);
      setScrollLeft(scrollRef.current.scrollLeft);
    }
  };

  const handleMouseLeave = () => setIsDragging(false);
  const handleMouseUp = () => setIsDragging(false);

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !scrollRef.current) return;
    e.preventDefault();
    const x = e.pageX - scrollRef.current.offsetLeft;
    const walk = (x - startX);
    if (Math.abs(walk) > 5) setIsMoved(true);
    scrollRef.current.scrollLeft = scrollLeft - walk;
  };

  const handleClick = (e: React.MouseEvent) => {
    if (isMoved) {
      e.stopPropagation();
      e.preventDefault();
    }
  };

  useEffect(() => {
    async function fetchEpisodes() {
      setLoading(true);
      const data = await getTMDBSeason(tmdbId, selectedSeason);
      if (data && data.episodes) {
        setEpisodes(data.episodes);
      } else {
        setEpisodes([]);
      }
      setLoading(false);
    }
    fetchEpisodes();
  }, [tmdbId, selectedSeason]);

  const handlePlayEpisode = (seasonNum: number, epNum: number) => {
    setPlayingSeason(seasonNum);
    setPlayingEpisode(epNum);
    
    // Sync URL with currently playing episode without reloading page
    if (mounted) {
      const params = new URLSearchParams(window.location.search);
      params.set('s', seasonNum.toString());
      params.set('ep', epNum.toString());
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    }
    
    // Find if we have a specific stream URL configured for this episode
    const specificStream = episodeStreams.find(s => s.seasonNumber === seasonNum && s.episodeNumber === epNum);
    
    if (specificStream && specificStream.streamUrl) {
      setCurrentUrlToPlay(specificStream.streamUrl);
    } else {
      // Fallback to a public DASH stream for dummy data so it works on Vercel
      setCurrentUrlToPlay(streamUrl || "https://dash.akamaized.net/akamai/bbb_30fps/bbb_30fps.mpd");
    }
    
    setPlayerOpen(true);
  };

  if (!seasons || seasons.length === 0) return null;

  const playerModal = playerOpen && mounted ? createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black">
      <div className="relative w-full h-full flex flex-col">
        <DashPlayer
          key={`${playingSeason}-${playingEpisode}`}
          url={currentUrlToPlay}
          title={title ?? ""}
          onClose={() => setPlayerOpen(false)}
          seasons={validSeasons}
          tmdbId={tmdbId}
          contentType="tv_show"
          currentSeason={playingSeason}
          currentEpisode={playingEpisode}
          onEpisodeChange={handlePlayEpisode}
          episodeStreams={episodeStreams}
          fallbackStreamUrl={streamUrl}
        />
      </div>
    </div>,
    document.body
  ) : null;

  return (
    <div className="mb-12">
      {playerModal}

      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl sm:text-2xl font-bold text-white">Episodes</h3>
        <div className="relative">
          <select
            value={selectedSeason}
            onChange={(e) => {
              const newSeason = Number(e.target.value);
              setSelectedSeason(newSeason);
              // Update URL to reflect the new season
              if (mounted) {
                const params = new URLSearchParams(window.location.search);
                params.set('s', newSeason.toString());
                router.replace(`${pathname}?${params.toString()}`, { scroll: false });
              }
            }}
            className="appearance-none bg-white/10 hover:bg-white/20 border border-white/20 text-white text-sm font-semibold rounded-lg pl-4 pr-10 py-2 outline-none transition-colors cursor-pointer"
          >
            {seasons.map(s => (
              <option key={s.season_number} value={s.season_number} className="bg-[#14151b] text-white">
                {s.name} ({s.episode_count} Episodes)
              </option>
            ))}
          </select>
          <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/70 pointer-events-none" />
        </div>
      </div>

      {loading ? (
        <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="flex-shrink-0 w-64 sm:w-72 h-40 bg-white/5 animate-pulse rounded-xl" />
          ))}
        </div>
      ) : episodes.length > 0 ? (
        <div
          ref={scrollRef}
          onMouseDown={handleMouseDown}
          onMouseLeave={handleMouseLeave}
          onMouseUp={handleMouseUp}
          onMouseMove={handleMouseMove}
          onClickCapture={handleClick}
          className={`flex overflow-x-auto gap-4 sm:gap-6 pb-6 scrollbar-hide ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {episodes.map(ep => (
            <div 
              key={ep.id} 
              className="flex flex-col flex-shrink-0 w-64 sm:w-80 group select-none cursor-pointer"
              onClick={() => {
                if (!isMoved) {
                  handlePlayEpisode(selectedSeason, ep.episode_number);
                }
              }}
            >
              <div className="relative w-full aspect-video rounded-xl overflow-hidden mb-3 bg-white/5 border border-white/10 shadow-lg group-hover:border-white/30 transition-colors duration-300">
                {ep.still_path ? (
                  <img
                    src={`https://image.tmdb.org/t/p/w500${ep.still_path}`}
                    alt={ep.name}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    draggable={false}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-white/20">
                    <Play size={32} />
                  </div>
                )}
                <div className="absolute inset-0 bg-black/20 group-hover:bg-black/40 transition-colors" />

                {/* Episode badge */}
                <div className="absolute top-2 left-2 px-2 py-0.5 bg-black/60 backdrop-blur-md rounded text-[11px] font-bold text-white shadow-sm">
                  E{ep.episode_number}
                </div>

                {/* Runtime badge */}
                {ep.runtime && (
                  <div className="absolute bottom-2 right-2 px-2 py-0.5 bg-black/60 backdrop-blur-md rounded text-[11px] font-bold text-white shadow-sm">
                    {ep.runtime}m
                  </div>
                )}

                {/* Play button overlay */}
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-md border border-white/40 flex items-center justify-center group-hover:bg-white/30 group-hover:scale-110 transition-all shadow-xl">
                    <Play size={20} fill="white" className="text-white ml-0.5" />
                  </div>
                </div>
              </div>
              <h4 className="text-sm font-bold text-white leading-tight mb-1 group-hover:text-white/80 transition-colors">{ep.name}</h4>
              <p className="text-[12px] text-white/50 leading-relaxed line-clamp-3">
                {ep.overview || "No description available."}
              </p>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-sm text-white/50 py-8">
          No episodes found for this season.
        </div>
      )}
    </div>
  );
}
