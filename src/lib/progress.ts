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
export const getProgressKey = (
  tmdbId: string,
  contentType: string,
  season?: number,
  episode?: number
) => {
  if (contentType === "tv") {
    return `${tmdbId}_${contentType}_${season || 1}_${episode || 1}`;
  }
  return `${tmdbId}_${contentType}`;
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
