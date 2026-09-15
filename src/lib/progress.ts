export interface PlaybackProgress {
  currentTime: number;
  duration: number;
  updatedAt: number;
}

export interface ProgressStorage {
  [key: string]: PlaybackProgress;
}

const STORAGE_KEY = "asprt_playback_progress";

// Generate a unique key for the media item
// Uses '|' as separator to avoid ambiguity with '_' in tmdbId or contentType
export const getProgressKey = (
  tmdbId: string,
  contentType: string,
  season?: number,
  episode?: number
) => {
  const type = contentType === "tv_show" || contentType === "tv" ? "tv" : "movie";
  if (type === "tv" && season && episode) {
    return `${tmdbId}|${type}|${season}|${episode}`;
  }
  return `${tmdbId}|${type}`;
};

export const saveProgress = (
  tmdbId: string,
  contentType: string,
  currentTime: number,
  duration: number,
  season?: number,
  episode?: number
) => {
  if (typeof window === "undefined" || duration <= 0) return;

  try {
    const key = getProgressKey(tmdbId, contentType, season, episode);
    const stored = localStorage.getItem(STORAGE_KEY);
    const progress: ProgressStorage = stored ? JSON.parse(stored) : {};

    // If progress is > 95% or < 5 seconds, clear it so it starts from beginning next time
    if (currentTime < 5 || (duration > 0 && currentTime / duration > 0.95)) {
      delete progress[key];
    } else {
      progress[key] = {
        currentTime,
        duration,
        updatedAt: Date.now(),
      };
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
  } catch (error) {
    console.error("Failed to save playback progress:", error);
  }
};

export const getProgress = (
  tmdbId: string,
  contentType: string,
  season?: number,
  episode?: number
): PlaybackProgress | null => {
  if (typeof window === "undefined") return null;

  try {
    const key = getProgressKey(tmdbId, contentType, season, episode);
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return null;

    const progress: ProgressStorage = JSON.parse(stored);
    return progress[key] || null;
  } catch (error) {
    console.error("Failed to get playback progress:", error);
    return null;
  }
};

export const getAllProgress = (): ProgressStorage => {
  if (typeof window === "undefined") return {};

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch (error) {
    console.error("Failed to get all playback progress:", error);
    return {};
  }
};

// ── Movie Metadata Cache ──────────────────────────────────────────────────────
// Stores minimal movie info in localStorage so Continue Watching can render
// instantly without a server round-trip.

const MOVIE_META_KEY = "asprt_movie_meta";

export interface CachedMovieMeta {
  title: string;
  slug: string;
  backdropUrl: string | null;
  posterUrl: string | null;
  contentType: string;
  imdbId: string;
}

export const saveMovieMeta = (meta: CachedMovieMeta) => {
  if (typeof window === "undefined") return;
  try {
    const stored = localStorage.getItem(MOVIE_META_KEY);
    const cache: Record<string, CachedMovieMeta> = stored ? JSON.parse(stored) : {};
    cache[meta.imdbId] = meta;
    localStorage.setItem(MOVIE_META_KEY, JSON.stringify(cache));
  } catch (error) {
    console.error("Failed to save movie meta:", error);
  }
};

export const getAllMovieMeta = (): Record<string, CachedMovieMeta> => {
  if (typeof window === "undefined") return {};
  try {
    const stored = localStorage.getItem(MOVIE_META_KEY);
    return stored ? JSON.parse(stored) : {};
  } catch (error) {
    return {};
  }
};
