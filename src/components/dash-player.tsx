"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import dashjs from "dashjs";
import { Play, Pause, Volume1, VolumeX, Maximize, Minimize, Settings, Subtitles, ArrowLeft, LayoutList, Lock, Unlock, Sun } from "lucide-react";
import { saveProgress, getProgress } from "@/lib/progress";
import { getTMDBSeason } from "@/lib/actions";

interface CustomCue {
  start: number;
  end: number;
  text: string;
}

interface EpisodeStream {
  id?: number;
  seasonNumber: number;
  episodeNumber: number;
  streamUrl: string;
}

interface Season {
  season_number: number;
  name: string;
  episode_count: number;
}

interface EpisodeMeta {
  id: number;
  episode_number: number;
  name: string;
  overview: string;
  still_path: string | null;
  runtime: number | null;
}

interface DashPlayerProps {
  url: string;
  title?: string;
  onClose?: () => void;
  // Next props for TV show support (optional)
  seasons?: any[];
  tmdbId?: string;
  contentType?: string;
  currentSeason?: number;
  currentEpisode?: number;
  onEpisodeChange?: (season: number, episode: number) => void;
  episodeStreams?: EpisodeStream[];
  fallbackStreamUrl?: string;
  shouldAutoPlay?: boolean;
}

// Helper to determine the quality label based on width/height
const getQualityLabel = (width: number, height: number) => {
  if (width >= 3700 || height >= 2000) return "4K";
  if ((width >= 1800 && width <= 2560) || (height >= 900 && height <= 1200)) return "1080p";
  if ((width >= 1200 && width <= 1700) || (height >= 600 && height <= 850)) return "720p";
  if ((width >= 700 && width <= 1000) || (height >= 400 && height <= 550)) return "480p";
  if ((width >= 500 && width <= 690) || (height >= 300 && height <= 390)) return "360p";
  return `${height}p`;
};

export default function DashPlayer({ 
  url, 
  title, 
  onClose,
  seasons,
  tmdbId,
  contentType,
  currentSeason,
  currentEpisode,
  onEpisodeChange,
  episodeStreams = [],
  fallbackStreamUrl,
  shouldAutoPlay = false,
}: DashPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<dashjs.MediaPlayerClass | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const progressBarRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef(false);

  const [isPlaying, setIsPlaying] = useState(false);
  const [isBuffering, setIsBuffering] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  
  const [showControls, setShowControls] = useState(true);
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Settings state
  const [showSettings, setShowSettings] = useState(false);
  const [bitrates, setBitrates] = useState<any[]>([]);
  const [currentBitrateIdx, setCurrentBitrateIdx] = useState<number>(-1); // -1 = Auto
  const [tracks, setTracks] = useState<any[]>([]);
  const [currentTrackIdx, setCurrentTrackIdx] = useState<number>(-1); // -1 = Off
  const [activeSubtitle, setActiveSubtitle] = useState<string>("");
  const [customCues, setCustomCues] = useState<CustomCue[]>([]);
  const [useCustomSubtitle, setUseCustomSubtitle] = useState(false);
  const [customSubtitleName, setCustomSubtitleName] = useState<string>("");
  const [externalSubtitles, setExternalSubtitles] = useState<{lang: string, url: string}[]>([]);

  // Subtitle appearance settings
  const [subtitleFontSize, setSubtitleFontSize] = useState(() => {
    if (typeof window !== "undefined" && window.innerWidth < 768) return 24;
    return 44;
  });
  const [subtitleBottom, setSubtitleBottom] = useState(160);
  const [subtitleDelay, setSubtitleDelay] = useState(0);
  const [subtitleFont, setSubtitleFont] = useState("Arial, sans-serif");
  const [showSubtitlePanel, setShowSubtitlePanel] = useState(false);
  const [subtitlePanelPage, setSubtitlePanelPage] = useState<"main" | "appearance">("main");
  const subtitlePanelPageRef = useRef<"main" | "appearance">("main");

  const [centerIcon, setCenterIcon] = useState<{ type: "play" | "pause", id: number } | null>(null);
  const centerIconTimer = useRef<NodeJS.Timeout | null>(null);
  const isPlayPending = useRef(false);

  const clickTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const menuTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const volumeHudTimer = useRef<NodeJS.Timeout | null>(null);
  const [showVolumeHud, setShowVolumeHud] = useState(false);
  
  // Lock & Gestures
  const [isLocked, setIsLocked] = useState(false);
  const [brightness, setBrightness] = useState(1);
  const [showBrightnessHud, setShowBrightnessHud] = useState(false);
  const brightnessHudTimer = useRef<NodeJS.Timeout | null>(null);
  const touchState = useRef({ active: false, startY: 0, startX: 0, type: 'none' as 'volume' | 'brightness' | 'none', initialVal: 0 });

  // Episode panel state
  const [showEpisodePanel, setShowEpisodePanel] = useState(false);
  const [panelSeason, setPanelSeason] = useState<number>(currentSeason ?? (seasons?.[0]?.season_number ?? 1));
  const [panelEpisodes, setPanelEpisodes] = useState<EpisodeMeta[]>([]);
  const [loadingEpisodes, setLoadingEpisodes] = useState(false);
  const episodeScrollRef = useRef<HTMLDivElement>(null);
  const epIsDragging = useRef(false);
  const epIsMoved = useRef(false);
  const epStartX = useRef(0);
  const epScrollLeft = useRef(0);
  const [selectedEp, setSelectedEp] = useState<{ season: number; episode: number } | null>(
    currentSeason && currentEpisode ? { season: currentSeason, episode: currentEpisode } : null
  );

  const isFirstLoad = useRef(true);
  const hasSeekedRef = useRef(false);
  const lastSavedTimeRef = useRef(0);

  // Hide scrollbar whenever the player is mounted (even on autoplay/reload)
  useEffect(() => {
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";
    document.body.classList.add("scrollbar-hide");
    document.documentElement.classList.add("scrollbar-hide");
    return () => {
      document.body.style.overflow = "unset";
      document.documentElement.style.overflow = "unset";
      document.body.classList.remove("scrollbar-hide");
      document.documentElement.classList.remove("scrollbar-hide");
    };
  }, []);

  // Handle Browser Back Button
  useEffect(() => {
    // Use a hash to prevent Next.js from resetting the page state on popstate
    const url = new URL(window.location.href);
    url.hash = "player";
    window.history.pushState(window.history.state, "", url.toString());

    const handlePopState = (e: PopStateEvent) => {
      if (window.location.hash !== "#player") {
        if (onClose) {
          onClose();
        }
      }
    };

    window.addEventListener("popstate", handlePopState);

    return () => {
      window.removeEventListener("popstate", handlePopState);
      if (window.location.hash === "#player") {
        window.history.back();
      }
    };
  }, [onClose]);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (isLocked) return;
    if (e.touches.length !== 1) return;
    const touch = e.touches[0];
    const { clientX, clientY } = touch;
    const { innerWidth } = window;
    
    // Left side for brightness, right side for volume
    const type = clientX < innerWidth / 2 ? 'brightness' : 'volume';
    
    touchState.current = {
      active: true,
      startX: clientX,
      startY: clientY,
      type,
      initialVal: type === 'brightness' ? brightness : volume,
    };
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!touchState.current.active || isLocked) return;
    const touch = e.touches[0];
    const { clientY, clientX } = touch;
    const deltaY = touchState.current.startY - clientY; // Up is positive
    
    const deltaX = Math.abs(touchState.current.startX - clientX);
    if (deltaX > Math.abs(deltaY) && Math.abs(deltaY) < 20) return; // Prevent horizontal swipes
    
    const maxChangePx = 150; // 150px swipe = 100% change
    let newVal = touchState.current.initialVal + (deltaY / maxChangePx);
    newVal = Math.max(0, Math.min(1, newVal));
    
    if (touchState.current.type === 'brightness') {
      setBrightness(newVal);
      setShowBrightnessHud(true);
      if (brightnessHudTimer.current) clearTimeout(brightnessHudTimer.current);
      brightnessHudTimer.current = setTimeout(() => setShowBrightnessHud(false), 2000);
    } else {
      setVolume(newVal);
      if (playerRef.current) {
        playerRef.current.setVolume(newVal);
      } else if (videoRef.current) {
        videoRef.current.volume = newVal;
      }
      setIsMuted(newVal === 0);
      setShowVolumeHud(true);
      if (volumeHudTimer.current) clearTimeout(volumeHudTimer.current);
      volumeHudTimer.current = setTimeout(() => setShowVolumeHud(false), 2000);
    }
  };

  const handleTouchEnd = () => {
    touchState.current.active = false;
  };

  const handleMenuMouseLeave = () => {
    menuTimeoutRef.current = setTimeout(() => {
      setShowSettings(false);
      setShowSubtitlePanel(false);
    }, 250);
  };

  const handleMenuMouseEnter = () => {
    if (menuTimeoutRef.current) {
      clearTimeout(menuTimeoutRef.current);
      menuTimeoutRef.current = null;
    }
  };

  const fetchPanelEpisodes = useCallback(async (seasonNum: number) => {
    if (!tmdbId) return;
    setLoadingEpisodes(true);
    try {
      const data = await getTMDBSeason(tmdbId, seasonNum);
      setPanelEpisodes(data?.episodes ?? []);
    } catch {
      setPanelEpisodes([]);
    } finally {
      setLoadingEpisodes(false);
    }
  }, [tmdbId]);

  useEffect(() => {
    if (contentType === 'tv_show' && tmdbId) {
      fetchPanelEpisodes(panelSeason);
    }
  }, [panelSeason, fetchPanelEpisodes, tmdbId, contentType]);

  // Auto center active episode in scroll view
  useEffect(() => {
    if (showEpisodePanel && panelEpisodes.length > 0 && episodeScrollRef.current) {
      const activeEpIndex = panelEpisodes.findIndex(ep => {
        const effectiveSeason = selectedEp?.season ?? currentSeason ?? 1;
        const effectiveEpisode = selectedEp?.episode ?? currentEpisode ?? 1;
        return panelSeason === effectiveSeason && ep.episode_number === effectiveEpisode;
      });

      if (activeEpIndex !== -1) {
        const container = episodeScrollRef.current;
        const cardWidth = 288; // w-72 (288px)
        const gap = 16; // gap-4 (16px)
        const scrollPos = (activeEpIndex * (cardWidth + gap)) + (cardWidth / 2) - (container.clientWidth / 2);
        
        // Timeout ensures the DOM is fully rendered/visible before calculating/scrolling
        setTimeout(() => {
          if (episodeScrollRef.current) {
            episodeScrollRef.current.scrollTo({ left: Math.max(0, scrollPos), behavior: 'auto' });
          }
        }, 100);
      }
    }
  }, [showEpisodePanel, panelEpisodes, panelSeason, selectedEp, currentSeason, currentEpisode]);

  const parseTime = (timeStr: string): number => {
    const parts = timeStr.replace(',', '.').split(':');
    let seconds = 0;
    if (parts.length === 3) {
      seconds = parseInt(parts[0]) * 3600 + parseInt(parts[1]) * 60 + parseFloat(parts[2]);
    } else if (parts.length === 2) {
      seconds = parseInt(parts[0]) * 60 + parseFloat(parts[1]);
    }
    return seconds;
  };

  const handleUploadSubtitle = (e: React.ChangeEvent<HTMLInputElement>) => {
    const target = e.target;
    const file = target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const cues: CustomCue[] = [];
        const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
        
        let i = 0;
        while (i < lines.length) {
          const line = lines[i].trim();
          if (!line) {
            i++;
            continue;
          }
          
          if (line.includes('-->')) {
            const parts = line.split('-->');
            const start = parseTime(parts[0].trim());
            const end = parseTime(parts[1].trim());
            
            let textLines = [];
            i++;
            while (i < lines.length && lines[i].trim() !== '' && !lines[i].includes('-->')) {
              textLines.push(lines[i].trim());
              i++;
            }
            
            if (!isNaN(start) && !isNaN(end)) {
              cues.push({ start, end, text: textLines.join('\n') });
            }
          } else {
            i++;
          }
        }
        
        setCustomCues(cues);
        setCustomSubtitleName(file.name);
        setUseCustomSubtitle(true);
        setCurrentTrackIdx(-1);
      } catch (err) {
        console.error("Subtitle parsing error", err);
      }
      
      target.value = '';
    };
    reader.readAsText(file);
  };

  const loadExternalSubtitle = async (sub: {lang: string, url: string}, idx: number) => {
    try {
      const response = await fetch(sub.url);
      if (!response.ok) return;
      const text = await response.text();
      const cues: CustomCue[] = [];
      const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
      
      let i = 0;
      while (i < lines.length) {
        const line = lines[i].trim();
        if (!line) { i++; continue; }
        if (line.includes('-->')) {
          const parts = line.split('-->');
          const start = parseTime(parts[0].trim());
          const end = parseTime(parts[1].trim());
          let textLines = [];
          i++;
          while (i < lines.length && lines[i].trim() !== '' && !lines[i].includes('-->')) {
            textLines.push(lines[i].trim());
            i++;
          }
          if (!isNaN(start) && !isNaN(end)) {
            cues.push({ start, end, text: textLines.join('\n') });
          }
        } else {
          i++;
        }
      }
      setCustomCues(cues);
      setCustomSubtitleName(sub.lang);
      setUseCustomSubtitle(true);
      setCurrentTrackIdx(-100 - idx);
    } catch (e) {
      console.error("External subtitle error", e);
    }
  };

  useEffect(() => {
    if (!videoRef.current) return;

    let finalUrl = url;
    try {
      const parsed = JSON.parse(url);
      if (parsed && typeof parsed === 'object') {
        let extracted = parsed.url || parsed.file || parsed.src;
        if (!extracted && parsed.source && parsed.source.url) {
          extracted = parsed.source.url;
        }
        
        if (extracted && typeof extracted === 'string') {
          // Check for markdown link [text](url)
          const mdMatch = extracted.match(/\]\((https?:\/\/[^\)]+)\)/);
          if (mdMatch) {
            finalUrl = mdMatch[1];
          } else {
            finalUrl = extracted;
          }
        }
        
        let extSubs: {lang: string, url: string}[] = [];
        if (parsed.subtitles && Array.isArray(parsed.subtitles)) {
          extSubs = parsed.subtitles.map((sub: any) => {
            let subUrl = sub.url || "";
            const mdMatch = subUrl.match(/\]\((https?:\/\/[^\)]+)\)/);
            if (mdMatch) subUrl = mdMatch[1];
            subUrl = subUrl.replace(/\\([\(\)])/g, '$1');
            return { lang: sub.lang || "External", url: subUrl };
          }).filter((s: any) => s.url);
        }
        setExternalSubtitles(extSubs);
      }
    } catch (e) {
      // Not JSON, assume it's a raw URL string
      const mdMatch = finalUrl.match(/\]\((https?:\/\/[^\)]+)\)/);
      if (mdMatch) {
        finalUrl = mdMatch[1];
      }
    }

    let isMounted = true;

    const initPlayer = async () => {
      let playerUrl = finalUrl;

      // Clean up accidental backslash escapes in URLs (e.g. from markdown \(2025\))
      playerUrl = playerUrl.replace(/\\([\(\)])/g, '$1');
      const cleanUrl = playerUrl;

      // Fix for Hugging Face or other CDNs that redirect MPDs and break relative paths.
      // We manually fetch the manifest and inject <BaseURL> so dash.js knows where to find chunks.
      if (cleanUrl.includes("huggingface.co")) {
        try {
          const res = await fetch(cleanUrl);
          let text = await res.text();
          if (!text.includes('<BaseURL>')) {
            const parsedUrl = new URL(cleanUrl);
            const path = parsedUrl.pathname;
            const baseUrl = parsedUrl.origin + path.substring(0, path.lastIndexOf('/') + 1);
            text = text.replace(/(<MPD[^>]*>)/i, `$1\n  <BaseURL>${baseUrl}</BaseURL>`);
            const blob = new Blob([text], { type: 'application/dash+xml' });
            playerUrl = URL.createObjectURL(blob);
          }
        } catch (e) {
          console.warn("Failed to inject BaseURL", e);
        }
      }

      if (!isMounted || !videoRef.current) return;

      const autoPlayThisTime = isFirstLoad.current ? shouldAutoPlay : true;
      isFirstLoad.current = false;

      playerRef.current = dashjs.MediaPlayer().create();
      playerRef.current.initialize(videoRef.current, playerUrl, autoPlayThisTime);
      
      playerRef.current.updateSettings({
        streaming: {
          buffer: { fastSwitchEnabled: true },
          abr: { autoSwitchBitrate: { video: true } }
        },
      });

    const player = playerRef.current;

    player.on(dashjs.MediaPlayer.events.STREAM_INITIALIZED, () => {
      // In dash.js v4.7.4, this method exists and returns bitrates
      if (typeof player.getBitrateInfoListFor === "function") {
        const availableBitrates = player.getBitrateInfoListFor("video");
        // Sort highest resolution first
        const sorted = [...(availableBitrates || [])].sort((a, b) => b.height - a.height);
        setBitrates(sorted);
      }
      
      const availableTracks = player.getTracksFor("text");
      setTracks(availableTracks || []);
      
      if (availableTracks && availableTracks.length > 0) {
        let targetIdx = -1;
        // Priority 1: ID / Indonesian
        targetIdx = availableTracks.findIndex((t: any) => 
          t.lang && (t.lang.toLowerCase() === 'id' || t.lang.toLowerCase() === 'ind' || t.lang.toLowerCase() === 'indonesian')
        );
        
        // Priority 2: EN / English
        if (targetIdx === -1) {
          targetIdx = availableTracks.findIndex((t: any) => 
            t.lang && (t.lang.toLowerCase() === 'en' || t.lang.toLowerCase() === 'eng' || t.lang.toLowerCase() === 'english')
          );
        }
        
        if (targetIdx !== -1) {
          if (typeof player.enableText === "function") {
            player.enableText(true);
          }
          player.setTextTrack(targetIdx);
          setCurrentTrackIdx(targetIdx);
        }
      }
    });

    player.on(dashjs.MediaPlayer.events.QUALITY_CHANGE_RENDERED, (e: any) => {
      if (e.mediaType === "video") {
        const auto = player.getSettings().streaming?.abr?.autoSwitchBitrate?.video;
        if (auto) {
          setCurrentBitrateIdx(-1);
        } else {
          setCurrentBitrateIdx(e.newQuality);
        }
      }
    });

    };

    initPlayer();

    return () => {
      isMounted = false;
      if (playerRef.current) {
        playerRef.current.destroy();
        playerRef.current = null;
      }
    };
  }, [url]);

  // Subtitle Polling via TimeUpdate
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleTimeUpdate = () => {
      setCurrentTime(video.currentTime);
      setProgress((video.currentTime / (video.duration || 1)) * 100);

      // Save progress every 5 seconds
      if (Math.abs(video.currentTime - lastSavedTimeRef.current) >= 5) {
        saveProgress(
          tmdbId || "unknown",
          contentType || "movie",
          video.currentTime,
          video.duration,
          currentSeason,
          currentEpisode
        );
        lastSavedTimeRef.current = video.currentTime;
      }

      // Extract subtitles and force native tracks to be hidden
      if (useCustomSubtitle && customCues.length > 0) {
        const time = video.currentTime - subtitleDelay;
        const active = customCues.find(c => time >= c.start && time <= c.end);
        setActiveSubtitle(active ? active.text : "");
      } else if (currentTrackIdx !== -1 && video.textTracks.length > 0) {
        let text = "";
        const time = video.currentTime - subtitleDelay;
        for (let i = 0; i < video.textTracks.length; i++) {
          const track = video.textTracks[i];
          // We only care about the track dashjs has activated
          if (track.mode === "showing" || track.mode === "hidden") {
            // Force hidden so native player doesn't draw it
            if (track.mode === "showing") {
              track.mode = "hidden";
            }
            if (subtitleDelay === 0 && track.activeCues && track.activeCues.length > 0) {
              const texts = Array.from(track.activeCues).map(c => (c as VTTCue).text || "");
              text = texts.join("\n");
              break; // Found the active text
            } else if (subtitleDelay !== 0 && track.cues) {
              for (let j = 0; j < track.cues.length; j++) {
                const cue = track.cues[j] as VTTCue;
                if (time >= cue.startTime && time <= cue.endTime) {
                  text += (text ? "\n" : "") + cue.text;
                }
              }
              break;
            }
          }
        }
        setActiveSubtitle(text);
      } else {
        setActiveSubtitle("");
      }
    };

    video.addEventListener("timeupdate", handleTimeUpdate);
    return () => {
      video.removeEventListener("timeupdate", handleTimeUpdate);
    };
  }, [currentTrackIdx, useCustomSubtitle, customCues, subtitleDelay]);

  // Video Native Events
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleDuration = () => {
      setDuration(video.duration);
      
      // Seek to saved progress on initial load
      if (!hasSeekedRef.current && tmdbId) {
        const saved = getProgress(tmdbId, contentType || "movie", currentSeason, currentEpisode);
        if (saved && saved.currentTime > 0 && video.duration > 0) {
          // If not near the end, seek to saved time
          if (saved.currentTime < video.duration - 10) {
            video.currentTime = saved.currentTime;
          }
        }
        hasSeekedRef.current = true;
      }
    };
    
    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    
    video.addEventListener("loadedmetadata", handleDuration);
    video.addEventListener("play", handlePlay);
    video.addEventListener("pause", handlePause);

    return () => {
      video.removeEventListener("loadedmetadata", handleDuration);
      video.removeEventListener("play", handlePlay);
      video.removeEventListener("pause", handlePause);
    };
  }, []);

  const triggerCenterIcon = (type: "play" | "pause") => {
    setCenterIcon({ type, id: Date.now() });
    if (centerIconTimer.current) clearTimeout(centerIconTimer.current);
    centerIconTimer.current = setTimeout(() => {
      setCenterIcon(null);
    }, 500);
  };

  const togglePlay = () => {
    if (!videoRef.current || isPlayPending.current) return;

    if (videoRef.current.paused) {
      isPlayPending.current = true;
      const playPromise = videoRef.current.play();
      if (playPromise !== undefined) {
        playPromise.then(() => {
          isPlayPending.current = false;
          triggerCenterIcon("play");
        }).catch(() => {
          isPlayPending.current = false;
        });
      } else {
        isPlayPending.current = false;
        triggerCenterIcon("play");
      }
    } else {
      videoRef.current.pause();
      triggerCenterIcon("pause");
    }
  };

  const seekToPosition = (clientX: number) => {
    if (!progressBarRef.current || !videoRef.current || !duration) return;
    const rect = progressBarRef.current.getBoundingClientRect();
    const ratio = Math.min(Math.max((clientX - rect.left) / rect.width, 0), 1);
    const time = ratio * duration;
    videoRef.current.currentTime = time;
    setProgress(ratio * 100);
  };

  const handleProgressMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    e.stopPropagation();
    isDraggingRef.current = true;
    seekToPosition(e.clientX);

    const onMouseMove = (ev: MouseEvent) => {
      if (isDraggingRef.current) seekToPosition(ev.clientX);
    };
    const onMouseUp = () => {
      isDraggingRef.current = false;
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
  };

  const skip = (seconds: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = Math.min(Math.max(videoRef.current.currentTime + seconds, 0), duration);
    }
  };

  const toggleMute = () => {
    if (!videoRef.current) return;
    videoRef.current.muted = !videoRef.current.muted;
    setIsMuted(videoRef.current.muted);
    if (!videoRef.current.muted && volume === 0) {
      videoRef.current.volume = 1;
      setVolume(1);
    }
  };

  const handleVolume = (e: React.ChangeEvent<HTMLInputElement>) => {
    const vol = Number(e.target.value);
    setVolume(vol);
    if (videoRef.current) {
      videoRef.current.volume = vol;
      videoRef.current.muted = vol === 0;
      setIsMuted(vol === 0);
    }
  };

  const toggleFullscreen = async () => {
    if (!document.fullscreenElement) {
      await containerRef.current?.requestFullscreen();
      setIsFullscreen(true);
    } else {
      await document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  const adjustVolume = (delta: number) => {
    if (!videoRef.current) return;
    const newVol = Math.min(1, Math.max(0, videoRef.current.volume + delta));
    videoRef.current.volume = newVol;
    videoRef.current.muted = newVol === 0;
    setVolume(newVol);
    setIsMuted(newVol === 0);
    // Show volume HUD
    setShowVolumeHud(true);
    if (volumeHudTimer.current) clearTimeout(volumeHudTimer.current);
    volumeHudTimer.current = setTimeout(() => setShowVolumeHud(false), 1200);
  };

  const formatTime = (time: number) => {
    if (isNaN(time)) return "00:00:00";
    const h = Math.floor(time / 3600);
    const m = Math.floor((time % 3600) / 60).toString().padStart(2, "0");
    const s = Math.floor(time % 60).toString().padStart(2, "0");
    return `${h.toString().padStart(2, "0")}:${m}:${s}`;
  };

  const handleUserActivity = () => {
    setShowControls(true);
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    controlsTimeoutRef.current = setTimeout(() => {
      if (isPlaying) setShowControls(false);
      setShowSettings(false);
      setShowSubtitlePanel(false);
      // Don't close episode panel automatically — user may be browsing it
    }, 3000);
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept if user is typing in an input/textarea
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

      switch (e.key) {
        case ' ':
        case 'k':
          e.preventDefault();
          togglePlay();
          handleUserActivity();
          break;
        case 'ArrowRight':
          e.preventDefault();
          skip(10);
          handleUserActivity();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          skip(-10);
          handleUserActivity();
          break;
        case 'ArrowUp':
          e.preventDefault();
          adjustVolume(0.1);
          handleUserActivity();
          break;
        case 'ArrowDown':
          e.preventDefault();
          adjustVolume(-0.1);
          handleUserActivity();
          break;
        case 'f':
        case 'F':
          e.preventDefault();
          toggleFullscreen();
          break;
        case 'Escape':
          if (!document.fullscreenElement) {
            // Let parent handle escape if not fullscreen
          }
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPlaying, volume, duration]);

  const handleMouseLeavePlayer = () => {
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    controlsTimeoutRef.current = setTimeout(() => {
      if (isPlaying) setShowControls(false);
      setShowSettings(false);
      setShowSubtitlePanel(false);
    }, 3000);
  };

  const changeQuality = (qualityIndex: number) => {
    if (!playerRef.current) return;
    if (qualityIndex === -1) {
      playerRef.current.updateSettings({ streaming: { abr: { autoSwitchBitrate: { video: true } } } });
      setCurrentBitrateIdx(-1);
    } else {
      playerRef.current.updateSettings({ streaming: { abr: { autoSwitchBitrate: { video: false } } } });
      // The third argument "true" forces the player to clear the buffer and switch immediately
      playerRef.current.setQualityFor("video", qualityIndex, true);
      setCurrentBitrateIdx(qualityIndex);
    }
  };

  const changeSubtitle = (idx: number) => {
    if (!playerRef.current) return;
    if (idx === -1) {
      if (typeof playerRef.current.enableText === "function") {
        playerRef.current.enableText(false);
      } else {
        playerRef.current.setTextTrack(-1);
      }
      setCurrentTrackIdx(-1);
    } else {
      if (typeof playerRef.current.enableText === "function") {
        playerRef.current.enableText(true);
      }
      playerRef.current.setTextTrack(idx);
      setCurrentTrackIdx(idx);
    }
  };

  // Update URL with current season + episode + play status so reload restores position
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    params.set("play", "true");
    
    if (contentType === 'tv_show' && currentSeason && currentEpisode) {
      params.set("s", currentSeason.toString());
      params.set("ep", currentEpisode.toString());
    }
    
    window.history.replaceState(null, '', `${window.location.pathname}?${params.toString()}`);
  }, [currentSeason, currentEpisode, contentType]);

  // Clean up 'play' param when player is closed
  useEffect(() => {
    return () => {
      const params = new URLSearchParams(window.location.search);
      params.delete("play");
      const newUrl = params.toString() ? `${window.location.pathname}?${params.toString()}` : window.location.pathname;
      window.history.replaceState(null, '', newUrl);
    };
  }, []);

  const currentEpData = panelEpisodes.find(ep => ep.episode_number === (selectedEp?.episode ?? currentEpisode));

  return (
    <div 
      ref={containerRef}
      onMouseMove={handleUserActivity}
      onMouseLeave={handleMouseLeavePlayer}
      className="relative w-full h-full bg-black flex flex-col overflow-hidden font-sans group select-none"
    >
      <style dangerouslySetInnerHTML={{__html: `
        /* Hide native subtitles completely since we render them in React */
        video::cue {
          color: transparent !important;
          background: transparent !important;
          text-shadow: none !important;
        }
        video::-webkit-media-text-track-container {
          display: none !important;
          opacity: 0 !important;
        }
        video::-webkit-media-text-track-display {
          display: none !important;
          opacity: 0 !important;
        }
        @keyframes centerIconAnim {
          0% { transform: scale(0.8); opacity: 0; }
          20% { transform: scale(1); opacity: 1; }
          100% { transform: scale(1.5); opacity: 0; }
        }
        .animate-center-icon {
          animation: centerIconAnim 0.5s ease-out forwards;
        }
      `}} />
      
      {/* Video Element - fills all remaining space */}
      <div 
        className="relative flex-1 w-full overflow-hidden bg-black touch-none"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onClick={(e) => {
          e.stopPropagation();
          if (showEpisodePanel) { setShowEpisodePanel(false); return; }
          if (showSettings) { setShowSettings(false); return; }
          if (showSubtitlePanel) { setShowSubtitlePanel(false); return; }
          
          if (clickTimeoutRef.current) clearTimeout(clickTimeoutRef.current);
          
          clickTimeoutRef.current = setTimeout(() => {
            const isMobileDevice = typeof window !== 'undefined' && (window.innerWidth < 768 || navigator.maxTouchPoints > 0);

            if (isMobileDevice) {
              if (showControls) {
                setShowControls(false);
                if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
              } else {
                handleUserActivity();
              }
            } else {
              if (isLocked) return;
              togglePlay();
              handleUserActivity();
            }
          }, 250);
        }}
        onDoubleClick={(e) => {
          e.stopPropagation();
          if (isLocked) return;
          
          if (clickTimeoutRef.current) clearTimeout(clickTimeoutRef.current);
          
          const isMobileDevice = typeof window !== 'undefined' && (window.innerWidth < 768 || navigator.maxTouchPoints > 0);

          if (isMobileDevice) {
            togglePlay();
            handleUserActivity();
          } else {
            // Double click on PC toggles fullscreen (Standard video player behavior)
            if (containerRef.current) {
              if (document.fullscreenElement) {
                document.exitFullscreen().catch(() => {});
              } else {
                containerRef.current.requestFullscreen().catch(() => {});
              }
            }
          }
        }}
      >
        <video
          ref={videoRef}
          className="w-full h-full object-contain"
          onWaiting={() => setIsBuffering(true)}
          onPlaying={() => setIsBuffering(false)}
          onCanPlay={() => setIsBuffering(false)}
        />

        {/* Center Play/Pause Icon Animation */}
        {centerIcon && (
          <div key={centerIcon.id} className="absolute inset-0 flex items-center justify-center pointer-events-none z-40">
            <div className="bg-black/40 backdrop-blur-md rounded-full p-4 sm:p-6 animate-center-icon">
              {centerIcon.type === "play" ? (
                <Play className="w-12 h-12 sm:w-16 sm:h-16 text-white fill-white" />
              ) : (
                <Pause className="w-12 h-12 sm:w-16 sm:h-16 text-white fill-white" />
              )}
            </div>
          </div>
        )}

        {/* Persistent Large Play Button when Paused */}
        {!isPlaying && !isBuffering && !centerIcon && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-30">
            <div className="bg-black/40 rounded-full p-3 shadow-lg ring-2 ring-white/60">
              <Play className="w-8 h-8 text-white fill-white" style={{ marginLeft: '2px' }} />
            </div>
          </div>
        )}

        {/* Brightness Overlay (Simulated via black overlay with opacity) */}
        <div 
          className="absolute inset-0 bg-black pointer-events-none z-10 transition-opacity duration-75"
          style={{ opacity: 1 - brightness }}
        />

        {/* Volume HUD Overlay (Left side) */}
        {showVolumeHud && (
          <div className="absolute top-1/2 left-8 sm:left-12 -translate-y-1/2 flex items-center justify-center pointer-events-none z-50">
            <div className="flex flex-col items-center gap-3 bg-black/60 backdrop-blur-sm rounded-2xl px-4 py-6 shadow-2xl">
              {isMuted || volume === 0 ? (
                <VolumeX size={28} className="text-white" />
              ) : (
                <Volume1 size={28} className="text-white" />
              )}
              <div className="w-1.5 h-24 sm:h-32 bg-white/20 rounded-full overflow-hidden flex flex-col justify-end">
                <div 
                  className="w-full bg-white rounded-full transition-all duration-75"
                  style={{ height: `${Math.round(volume * 100)}%` }}
                />
              </div>
              <span className="text-white text-xs font-semibold tabular-nums">{Math.round(volume * 100)}%</span>
            </div>
          </div>
        )}

        {/* Brightness HUD Overlay (Right side) */}
        {showBrightnessHud && (
          <div className="absolute top-1/2 right-8 sm:right-12 -translate-y-1/2 flex items-center justify-center pointer-events-none z-50">
            <div className="flex flex-col items-center gap-3 bg-black/60 backdrop-blur-sm rounded-2xl px-4 py-6 shadow-2xl">
              <Sun size={28} className="text-white" />
              <div className="w-1.5 h-24 sm:h-32 bg-white/20 rounded-full overflow-hidden flex flex-col justify-end">
                <div 
                  className="w-full bg-white rounded-full transition-all duration-75"
                  style={{ height: `${Math.round(brightness * 100)}%` }}
                />
              </div>
              <span className="text-white text-xs font-semibold tabular-nums">{Math.round(brightness * 100)}%</span>
            </div>
          </div>
        )}
        {isBuffering && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-30">
            <div className="w-16 h-16 border-4 border-white/20 border-t-[#E50914] rounded-full animate-spin"></div>
          </div>
        )}

        {/* Hidden Subtitle File Input */}
        <input 
          ref={fileInputRef}
          type="file" 
          accept=".srt,.vtt" 
          className="hidden" 
          onChange={handleUploadSubtitle} 
        />
      </div>

      {/* Custom Subtitle Overlay - outside video div, anchored to outer container */}
      {activeSubtitle && (currentTrackIdx !== -1 || useCustomSubtitle) && (
        <div
          className="absolute w-full flex justify-center pointer-events-none z-40 px-4 sm:px-16"
          style={{ bottom: `${showControls || !isPlaying ? Math.max(160, subtitleBottom) : Math.max(30, subtitleBottom - 130)}px` }}
        >
          <div
            className="text-white font-bold text-center whitespace-pre-line"
            style={{
              fontSize: `${subtitleFontSize}px`,
              lineHeight: "1.4",
              fontFamily: subtitleFont,
              textShadow: "0 1px 3px rgba(0,0,0,1), 0 2px 6px rgba(0,0,0,1), 0 0 10px rgba(0,0,0,0.8)",
            }}
          >
            {activeSubtitle}
          </div>
        </div>
      )}

      {/* Top Controls Overlay - anchored to outer container */}
      <div 
        className={`absolute top-0 left-0 w-full p-4 sm:p-8 bg-gradient-to-b from-black/80 to-transparent flex items-center gap-4 z-10 pointer-events-none ${
          (!isLocked && (showControls || !isPlaying)) ? "opacity-100" : "opacity-0"
        }`}
      >
        <button 
          onClick={onClose}
          className="bg-black/40 hover:bg-black/60 backdrop-blur-md p-2 sm:p-3 rounded-full text-white hover:text-[#E50914] transition-all pointer-events-auto"
          title="Back"
        >
          <ArrowLeft className="w-5 h-5 sm:w-6 sm:h-6" />
        </button>
        {/* Mobile Title (hidden on md and above where the bottom title is shown) */}
        <div className="md:hidden flex flex-col pointer-events-none truncate">
          {contentType === 'tv_show' && currentEpData ? (
            <>
              <span className="text-white font-semibold text-sm sm:text-base truncate drop-shadow-md">{currentEpData.name}</span>
              <span className="text-white/70 font-medium text-[10px] sm:text-xs uppercase truncate drop-shadow-md">{title}</span>
            </>
          ) : (
            <span className="text-white font-semibold text-sm sm:text-base truncate drop-shadow-md">{title}</span>
          )}
        </div>
      </div>

      {/* Episode Panel Overlay (Netflix-style) - anchored to outer container */}
      {showEpisodePanel && seasons && seasons.length > 0 && (showControls || !isPlaying) && (
          <div
            className="absolute bottom-0 left-0 w-full z-50"
            style={{ paddingBottom: "88px" }}
            onClick={e => e.stopPropagation()}
            onMouseEnter={() => {
              // Keep controls and panel visible while hovering
              if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
              setShowControls(true);
            }}
            onMouseLeave={handleUserActivity}
          >
            {/* Gradient blend at top */}
            <div className="absolute top-0 left-0 w-full h-8 bg-gradient-to-b from-transparent to-[#0e0e0e] pointer-events-none -translate-y-full" />
            <div className="w-full" style={{ background: "#0e0e0e" }}>
              {/* Header row */}
              <div className="flex items-center justify-between px-4 sm:px-8 pt-4 sm:pt-5 pb-2 sm:pb-3">
                <div className="relative">
                  <select
                    value={panelSeason}
                    onChange={e => setPanelSeason(Number(e.target.value))}
                    className="appearance-none bg-[#2a2a2a] hover:bg-[#333] border border-[#3a3a3a] text-white text-sm font-bold rounded-lg pl-4 pr-9 py-2 outline-none cursor-pointer"
                    style={{ colorScheme: "dark" }}
                    onClick={e => e.stopPropagation()}
                  >
                    {seasons.filter(s => s.season_number > 0).map(s => (
                      <option key={s.season_number} value={s.season_number} style={{ background: "#161616" }}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                  <svg className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-white/60" width="11" height="11" viewBox="0 0 12 12" fill="none">
                    <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <button
                  onClick={() => setShowEpisodePanel(false)}
                  className="text-white/40 hover:text-white transition-colors p-1"
                  title="Close episode list"
                >
                  <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                    <path d="M4 4l10 10M14 4L4 14" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
                  </svg>
                </button>
              </div>

              {/* Episode Cards */}
              <div className="px-4 sm:px-8 pb-5">
                {loadingEpisodes ? (
                  <div className="flex gap-3 sm:gap-4" style={{ scrollbarWidth: "none" }}>
                    {[1,2,3,4,5,6].map(i => (
                      <div key={i} className="flex-shrink-0 w-[75vw] sm:w-72 space-y-2">
                        <div className="w-full aspect-video bg-white/5 animate-pulse rounded-xl" />
                        <div className="h-3 bg-white/5 animate-pulse rounded w-3/4" />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div
                    ref={episodeScrollRef}
                    className="flex gap-4 overflow-x-auto overflow-y-visible py-6 pl-1"
                    style={{ scrollbarWidth: "none", msOverflowStyle: "none", cursor: epIsDragging.current ? "grabbing" : "grab" }}
                    onClick={e => e.stopPropagation()}
                    onMouseDown={e => {
                      epIsDragging.current = true;
                      epIsMoved.current = false;
                      epStartX.current = e.pageX - (episodeScrollRef.current?.offsetLeft ?? 0);
                      epScrollLeft.current = episodeScrollRef.current?.scrollLeft ?? 0;
                    }}
                    onMouseLeave={() => { epIsDragging.current = false; }}
                    onMouseUp={() => { epIsDragging.current = false; }}
                    onMouseMove={e => {
                      if (!epIsDragging.current || !episodeScrollRef.current) return;
                      e.preventDefault();
                      const x = e.pageX - (episodeScrollRef.current.offsetLeft);
                      const walk = x - epStartX.current;
                      if (Math.abs(walk) > 5) epIsMoved.current = true;
                      episodeScrollRef.current.scrollLeft = epScrollLeft.current - walk;
                    }}
                  >
                    {panelEpisodes.map(ep => {
                      // If user has selected an episode, that becomes "Now Playing"
                      // Otherwise fall back to prop values (default S1E1)
                      const effectiveSeason = selectedEp?.season ?? currentSeason ?? 1;
                      const effectiveEpisode = selectedEp?.episode ?? currentEpisode ?? 1;
                      const isNowPlaying = panelSeason === effectiveSeason && ep.episode_number === effectiveEpisode;
                      const isHighlighted = isNowPlaying;
                      return (
                        <div
                          key={ep.id}
                          className={`flex-shrink-0 cursor-pointer select-none transition-all duration-500 ease-out hover:scale-[1.08] hover:z-10 hover:opacity-100 ${
                            isHighlighted
                              ? "w-[72vw] sm:w-[280px] opacity-100 scale-100 z-10"
                              : "w-[64vw] sm:w-[248px] opacity-60 group"
                          }`}
                          onClick={e => {
                            e.stopPropagation();
                            if (epIsMoved.current) return;
                            
                            setSelectedEp({ season: panelSeason, episode: ep.episode_number });

                            // Resolve the correct stream URL for the selected episode,
                            // exactly the same logic as SeriesEpisodes.handlePlayEpisode
                            if (onEpisodeChange) {
                              const specificStream = episodeStreams.find(
                                s => s.seasonNumber === panelSeason && s.episodeNumber === ep.episode_number
                              );
                              const resolvedUrl = specificStream?.streamUrl
                                || fallbackStreamUrl
                                || "https://dash.akamaized.net/akamai/bbb_30fps/bbb_30fps.mpd";
                              // Pass the resolved URL as a 3rd argument via onEpisodeChange wrapper
                              // Because onEpisodeChange signature is (season, episode),
                              // we call it and let parent re-open with correct URL.
                              onEpisodeChange(panelSeason, ep.episode_number);
                              void resolvedUrl; // Used implicitly via parent's episodeStreams lookup
                            }
                            
                            // Close panel after selection
                            setTimeout(() => setShowEpisodePanel(false), 400);
                          }}
                        >
                          {/* Thumbnail */}
                          <div className={`relative w-full aspect-video rounded-xl overflow-hidden mb-2.5 transition-all duration-300 ${
                            isHighlighted
                              ? "ring-[3px] ring-white shadow-[0_0_20px_rgba(255,255,255,0.25)]"
                              : "ring-1 ring-white/10 group-hover:ring-white/40"
                          }`}>
                            {ep.still_path ? (
                              <img
                                src={`https://image.tmdb.org/t/p/w400${ep.still_path}`}
                                alt={ep.name}
                                className="w-full h-full object-cover"
                                draggable={false}
                              />
                            ) : (
                              <div className="w-full h-full bg-[#1a1a1a] flex items-center justify-center">
                                <svg width="28" height="28" fill="none" viewBox="0 0 24 24">
                                  <circle cx="12" cy="12" r="10" stroke="white" strokeOpacity="0.15" strokeWidth="1.5"/>
                                  <path d="M10 8l6 4-6 4V8z" fill="white" fillOpacity="0.3"/>
                                </svg>
                              </div>
                            )}
                            {/* Overlay on hover */}
                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
                            {/* Top-left: Now Playing badge */}
                            <div className="absolute top-2 left-2 flex items-center gap-1.5">
                              {isNowPlaying && (
                                <span className="flex items-center gap-1 px-2 py-0.5 bg-[#161616]/90 border border-white/20 text-white/90 text-[10px] font-semibold rounded-md tracking-wide">
                                  <svg width="8" height="8" viewBox="0 0 8 8" fill="currentColor"><path d="M1 1l6 3-6 3V1z"/></svg>
                                  Now Playing
                                </span>
                              )}
                            </div>
                            {/* Top-right: Episode number badge */}
                            <div className="absolute top-2 right-2 px-1.5 py-0.5 bg-black/70 text-white/80 text-[10px] font-bold rounded backdrop-blur-sm tracking-wide">
                              E{ep.episode_number.toString().padStart(2, "0")}
                            </div>
                            {/* Bottom-right: duration badge */}
                            {ep.runtime && (
                              <div className="absolute bottom-2 right-2 px-1.5 py-0.5 bg-black/70 text-white/90 text-[10px] font-medium rounded backdrop-blur-sm">
                                {ep.runtime}m
                              </div>
                            )}
                          </div>
                          {/* Info */}
                          <div className="px-1">
                            <h4 className={`text-sm font-bold truncate mb-1 ${isHighlighted ? "text-white" : "text-white/90 group-hover:text-white"}`}>
                              {ep.name}
                            </h4>
                            <p className="text-[11px] text-white/40 line-clamp-2 leading-relaxed">
                              {ep.overview || "No overview available for this episode."}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

      {/* Lock Button (Top Right) */}
      <div 
        className={`absolute top-4 right-4 sm:top-8 sm:right-8 z-50 transition-opacity duration-300 ${
          showControls || !isPlaying ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
      >
        <button
          onClick={(e) => {
            e.stopPropagation();
            const newLocked = !isLocked;
            setIsLocked(newLocked);
            if (newLocked) {
              setShowEpisodePanel(false);
              setShowSettings(false);
              setShowSubtitlePanel(false);
            }
            handleUserActivity();
          }}
          className="bg-black/40 hover:bg-black/60 backdrop-blur-md p-2 sm:p-3 rounded-full text-white hover:text-[#E50914] transition-all"
          title={isLocked ? "Unlock Controls" : "Lock Controls"}
        >
          {isLocked ? <Lock className="w-5 h-5 sm:w-6 sm:h-6" /> : <Unlock className="w-5 h-5 sm:w-6 sm:h-6" />}
        </button>
      </div>

      {/* Bottom Controls Overlay */}
      <div 
        className={`absolute bottom-0 left-0 w-full px-2 sm:px-6 pb-2 sm:pb-6 pt-8 sm:pt-16 bg-gradient-to-t from-black/90 via-black/40 to-transparent flex flex-col z-20 transition-opacity duration-300 ${
          (!isLocked && (showControls || !isPlaying || showSettings || showSubtitlePanel || showEpisodePanel)) ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        onClick={e => e.stopPropagation()}
        onMouseEnter={() => {
          if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
          setShowControls(true);
        }}
        onMouseLeave={handleMouseLeavePlayer}
      >
        
        {/* Progress Bar */}
        <div 
          className="relative w-full h-2 sm:h-1.5 bg-white/20 rounded-full cursor-pointer mb-3 sm:mb-5 group/progress overflow-visible flex items-center hover:h-2.5 sm:hover:h-2 transition-all"
          onMouseDown={handleProgressMouseDown}
          ref={progressBarRef}
        >
          {/* Buffered */}
          <div className="absolute top-0 left-0 h-full bg-white/40 rounded-full" style={{ width: '0%' }} />
          {/* Played */}
          <div 
            className="absolute top-0 left-0 h-full bg-[#E50914] rounded-full"
            style={{ width: `${progress}%` }}
          />
          {/* Thumb */}
          <div 
            className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-[#E50914] rounded-full shadow-lg opacity-0 group-hover/progress:opacity-100 pointer-events-none"
            style={{ left: `calc(${progress}% - 8px)` }}
          />
        </div>

        {/* Control Buttons Row */}
        <div className="px-2 sm:px-6 py-2 sm:py-4 flex items-center justify-between">
          
          {/* Left: Play/Pause, Skip, Volume, Duration */}
          <div className="flex items-center gap-2 sm:gap-6">
            <button onClick={togglePlay} className="text-white hover:scale-110 transition-transform">
              {isPlaying ? <Pause className="w-6 h-6 sm:w-8 sm:h-8" fill="currentColor" /> : <Play className="w-6 h-6 sm:w-8 sm:h-8" fill="currentColor" />}
            </button>
            
            <button onClick={() => skip(-10)} className="text-white hover:text-white/70 transition-colors" title="Rewind 10s">
              <svg viewBox="0 0 26 26" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 sm:w-[26px] sm:h-[26px]">
                <path d="M7.5 5.5L4 9l3.5 3.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M4 9A9 9 0 1 1 4 17" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
                <text x="13" y="15" textAnchor="middle" fill="currentColor" fontSize="7.5" fontWeight="bold" fontFamily="Arial, sans-serif">10</text>
              </svg>
            </button>
            <button onClick={() => skip(10)} className="text-white hover:text-white/70 transition-colors" title="Forward 10s">
              <svg viewBox="0 0 26 26" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 sm:w-[26px] sm:h-[26px]">
                <path d="M18.5 5.5L22 9l-3.5 3.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M22 9A9 9 0 1 0 22 17" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
                <text x="13" y="15" textAnchor="middle" fill="currentColor" fontSize="7.5" fontWeight="bold" fontFamily="Arial, sans-serif">10</text>
              </svg>
            </button>

            {/* Duration / Current Time */}
            <span className="text-white/80 text-xs sm:text-sm font-medium ml-1 sm:ml-2 font-mono">
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>
          </div>

          {/* Center: Title */}
          <div className="hidden md:flex flex-col items-center gap-0.5 absolute left-1/2 -translate-x-1/2 pointer-events-none">
            {contentType === 'tv_show' && currentEpData ? (
              <>
                <span className="text-white font-semibold text-lg tracking-wide drop-shadow-md">{currentEpData.name}</span>
                <span className="text-white/70 font-medium text-xs tracking-wider uppercase drop-shadow-md">{title}</span>
              </>
            ) : (
              <span className="text-white font-semibold text-lg tracking-wide drop-shadow-md">{title}</span>
            )}
          </div>

          {/* Right: Settings, Fullscreen */}
          <div 
            className="flex items-center gap-3 sm:gap-5 relative"
            onMouseEnter={handleMenuMouseEnter}
            onMouseLeave={handleMenuMouseLeave}
          >
            {/* Volume Control */}
            <div className="relative flex items-center justify-center group/vol">
              <button onClick={toggleMute} className="text-white hover:text-white/70 transition-colors z-10">
                {isMuted || volume === 0 ? <VolumeX className="w-5 h-5 sm:w-7 sm:h-7" /> : <Volume1 className="w-5 h-5 sm:w-7 sm:h-7" />}
              </button>
              
              {/* Vertical Slider Popup */}
              <div className="hidden md:block absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-10 h-32 opacity-0 pointer-events-none group-hover/vol:opacity-100 group-hover/vol:pointer-events-auto transition-all duration-300 translate-y-2 group-hover/vol:translate-y-0 z-50">
                {/* Bridge to prevent hover loss */}
                <div className="absolute -bottom-4 left-0 w-full h-4 bg-transparent" />
                
                <div className="w-full h-full bg-[#161616] border border-[#2a2a2a] rounded-xl shadow-2xl flex justify-center items-center">
                  <input
                    type="range"
                    min="0" max="1" step="0.05"
                    value={isMuted ? 0 : volume}
                    onChange={handleVolume}
                    className="w-24 h-1 bg-white/30 rounded-full appearance-none outline-none -rotate-90 origin-center [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3.5 [&::-webkit-slider-thumb]:h-3.5 [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:rounded-full cursor-pointer"
                  />
                </div>
              </div>
            </div>

            <button 
              onClick={() => { setShowSettings(!showSettings); setShowSubtitlePanel(false); }} 
              className={`text-white transition-colors hover:text-white/70 ${showSettings ? "text-[#E50914]" : ""}`}
              title="Settings"
            >
              <Settings className="w-5 h-5 sm:w-7 sm:h-7" />
            </button>

            {/* Episodes Button (TV Series Only) */}
            {contentType === "tv_show" && seasons && seasons.length > 0 && (
              <button
                onClick={() => { setShowEpisodePanel(v => !v); setShowSettings(false); setShowSubtitlePanel(false); }}
                className={`text-white transition-colors hover:text-white/70 ${showEpisodePanel ? "opacity-100" : "opacity-60"}`}
                title="Episodes"
              >
                <LayoutList className="w-5 h-5 sm:w-7 sm:h-7" />
              </button>
            )}

            {/* Dedicated Subtitle (CC) Button */}
            <button
              onClick={() => { setShowSubtitlePanel(v => !v); setShowSettings(false); setShowEpisodePanel(false); setSubtitlePanelPage("main"); }}
              className={`text-white transition-colors hover:text-white/70 ${currentTrackIdx !== -1 || useCustomSubtitle ? "opacity-100" : "opacity-60"}`}
              title="Subtitles"
            >
              <Subtitles className="w-5 h-5 sm:w-7 sm:h-7" />
            </button>
            
            <button onClick={toggleFullscreen} className="text-white hover:text-white/70 transition-colors" title="Fullscreen">
              {isFullscreen ? <Minimize className="w-5 h-5 sm:w-7 sm:h-7" /> : <Maximize className="w-5 h-5 sm:w-7 sm:h-7" />}
            </button>

            {/* Settings Menu Popup */}
            {showSettings && (
              <div className="absolute bottom-16 -right-2 sm:right-0 w-[calc(100vw-24px)] sm:w-64 max-w-sm bg-[#161616] border border-[#2a2a2a] rounded-2xl py-4 px-2 shadow-2xl flex flex-col gap-4 z-50 animate-in slide-in-from-bottom-2 duration-200">
                
                {/* Quality Settings */}
                {bitrates.length > 0 && (
                  <div className="flex flex-col gap-2">
                    <h4 className="text-[11px] font-bold text-white/50 uppercase tracking-wider mb-1 px-1">Quality</h4>
                    <button 
                      onClick={() => changeQuality(-1)}
                      className={`text-left text-sm font-medium px-3 py-2 rounded-lg transition-colors ${currentBitrateIdx === -1 ? "bg-white/10 text-white font-bold" : "text-white/70 hover:bg-white/5 hover:text-white"}`}
                    >
                      Auto
                    </button>
                    {bitrates.map((b, idx) => (
                      <button 
                        key={idx}
                        onClick={() => changeQuality(b.qualityIndex)}
                        className={`text-left text-sm font-medium px-3 py-2 rounded-lg transition-colors ${currentBitrateIdx === b.qualityIndex ? "bg-white/10 text-white font-bold" : "text-white/70 hover:bg-white/5 hover:text-white"}`}
                      >
                        {getQualityLabel(b.width, b.height)} <span className="text-white/30 text-xs ml-2">{(b.bitrate / 1000000).toFixed(1)} Mbps</span>
                      </button>
                    ))}
                  </div>
                )}

                {bitrates.length === 0 && (
                  <div className="text-white/50 text-sm text-center py-2">No settings available</div>
                )}
              </div>
            )}

            {/* Subtitle Panel Popup */}
            {showSubtitlePanel && (
              <div className="absolute bottom-16 -right-2 sm:right-0 w-[calc(100vw-24px)] sm:w-64 max-w-sm bg-[#161616] border border-[#2a2a2a] rounded-2xl py-4 px-2 shadow-2xl z-50 animate-in slide-in-from-bottom-2 duration-200">
                
                {subtitlePanelPage === "main" && (
                  <div className="flex flex-col gap-2">
                    {/* Header */}
                    <div className="flex items-center justify-between mb-1 px-1">
                      <h4 className="text-[11px] font-bold text-white/50 uppercase tracking-wider">Subtitles</h4>
                      <div className="flex gap-3">
                        <button
                          onClick={() => fileInputRef.current?.click()}
                          className="text-[10px] text-white/50 hover:text-white transition-colors cursor-pointer"
                        >
                          Upload
                        </button>
                        <button
                          onClick={() => setSubtitlePanelPage("appearance")}
                          className="text-[10px] text-white/50 hover:text-white transition-colors"
                        >
                          Customize
                        </button>
                      </div>
                    </div>

                    {/* Track List */}
                    <button
                      onClick={() => { setUseCustomSubtitle(false); changeSubtitle(-1); }}
                      className={`text-left text-sm font-medium px-3 py-2 rounded-lg transition-colors ${currentTrackIdx === -1 && !useCustomSubtitle ? "bg-white/10 text-white font-bold" : "text-white/70 hover:bg-white/5 hover:text-white"}`}
                    >
                      Off
                    </button>
                    {customSubtitleName && currentTrackIdx >= -1 && (
                      <button
                        onClick={() => { setUseCustomSubtitle(true); changeSubtitle(-1); }}
                        className={`text-left text-sm font-medium px-3 py-2 rounded-lg transition-colors truncate ${useCustomSubtitle ? "bg-white/10 text-white font-bold" : "text-white/70 hover:bg-white/5 hover:text-white"}`}
                      >
                        {customSubtitleName}
                      </button>
                    )}
                    {externalSubtitles.map((sub, idx) => (
                      <button
                        key={`ext-${idx}`}
                        onClick={() => { loadExternalSubtitle(sub, idx); setShowSubtitlePanel(false); }}
                        className={`text-left text-sm font-medium px-3 py-2 rounded-lg transition-colors ${currentTrackIdx === (-100 - idx) && useCustomSubtitle ? "bg-white/10 text-white font-bold" : "text-white/70 hover:bg-white/5 hover:text-white"}`}
                      >
                        {sub.lang}
                      </button>
                    ))}
                    {tracks.map((t, idx) => (
                      <button
                        key={idx}
                        onClick={() => { setUseCustomSubtitle(false); changeSubtitle(idx); }}
                        className={`text-left text-sm font-medium px-3 py-2 rounded-lg transition-colors ${currentTrackIdx === idx && !useCustomSubtitle ? "bg-white/10 text-white font-bold" : "text-white/70 hover:bg-white/5 hover:text-white"}`}
                      >
                        {t.lang ? t.lang.toUpperCase() : `Track ${idx + 1}`}
                      </button>
                    ))}
                  </div>
                )}

                {subtitlePanelPage === "appearance" && (
                  <>
                    {/* Header */}
                    <div className="flex items-center gap-3 px-5 pt-2 pb-3 border-b border-[#2a2a2a]">
                      <button
                        onClick={() => setSubtitlePanelPage("main")}
                        className="text-white/50 hover:text-white transition-colors text-lg leading-none"
                      >
                        ←
                      </button>
                      <span className="text-white font-bold text-base">Subtitle Style</span>
                    </div>

                    <div className="flex flex-col gap-5 px-5 py-5">
                      {/* Font Family */}
                      <div>
                        <label className="text-[11px] font-bold text-white/40 uppercase tracking-wider block mb-2">Font</label>
                        <select
                          value={subtitleFont}
                          onChange={e => setSubtitleFont(e.target.value)}
                          className="w-full bg-[#222] text-white text-sm rounded-xl px-3 py-2.5 outline-none border border-[#333] cursor-pointer"
                          style={{ colorScheme: "dark" }}
                        >
                          <option value="sans-serif" style={{ background: "#222", color: "white" }}>Sans Serif</option>
                          <option value="serif" style={{ background: "#222", color: "white" }}>Serif</option>
                          <option value="monospace" style={{ background: "#222", color: "white" }}>Monospace</option>
                          <option value="Georgia, serif" style={{ background: "#222", color: "white" }}>Georgia</option>
                          <option value="Arial, sans-serif" style={{ background: "#222", color: "white" }}>Arial</option>
                          <option value="'Times New Roman', serif" style={{ background: "#222", color: "white" }}>Times New Roman</option>
                        </select>
                      </div>

                      {/* Font Size */}
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <label className="text-[11px] font-bold text-white/40 uppercase tracking-wider">Size</label>
                          <span className="text-white/70 text-xs">{subtitleFontSize}px</span>
                        </div>
                        <input
                          type="range" min="30" max="72" step="2"
                          value={subtitleFontSize}
                          onChange={e => setSubtitleFontSize(Number(e.target.value))}
                          className="w-full h-1 bg-white/20 rounded-full appearance-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:rounded-full cursor-pointer"
                        />
                        <div className="flex justify-between text-[11px] text-white/30 mt-1">
                          <span className="text-xs">Small</span>
                          <span className="text-base font-bold">Large</span>
                        </div>
                      </div>

                      {/* Vertical Position */}
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <label className="text-[11px] font-bold text-white/40 uppercase tracking-wider">Position</label>
                          <span className="text-white/70 text-xs">{subtitleBottom}px</span>
                        </div>
                        <input
                          type="range" min="60" max="300" step="5"
                          value={subtitleBottom}
                          onChange={e => setSubtitleBottom(Number(e.target.value))}
                          className="w-full h-1 bg-white/20 rounded-full appearance-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:rounded-full cursor-pointer"
                        />
                        <div className="flex justify-between text-[11px] text-white/30 mt-1">
                          <span>↓ Lower</span>
                          <span>Higher ↑</span>
                        </div>
                      </div>

                      {/* Subtitle Latency (Sync) */}
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <label className="text-[11px] font-bold text-white/40 uppercase tracking-wider">Latency</label>
                          <span className="text-white/70 text-xs">{subtitleDelay > 0 ? `+${subtitleDelay.toFixed(1)}s` : `${subtitleDelay.toFixed(1)}s`}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <button 
                            onClick={() => setSubtitleDelay(d => Number((d - 0.5).toFixed(1)))}
                            className="flex-1 bg-white/5 hover:bg-white/10 text-white rounded-lg py-2 text-xs font-medium border border-white/10 transition-colors"
                          >
                            - 0.5s
                          </button>
                          <button 
                            onClick={() => setSubtitleDelay(0)}
                            className="flex-1 bg-white/5 hover:bg-white/10 text-white rounded-lg py-2 text-xs font-medium border border-white/10 transition-colors"
                          >
                            Reset
                          </button>
                          <button 
                            onClick={() => setSubtitleDelay(d => Number((d + 0.5).toFixed(1)))}
                            className="flex-1 bg-white/5 hover:bg-white/10 text-white rounded-lg py-2 text-xs font-medium border border-white/10 transition-colors"
                          >
                            + 0.5s
                          </button>
                        </div>
                      </div>

                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
