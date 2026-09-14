"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Save,
  Loader2,
  Film,
  Tv,
  Plus,
  X,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { EpisodeStreamManager } from "@/components/episode-stream-manager";

interface DownloadLinkInput {
  id?: number;
  quality: "480p" | "720p" | "1080p" | "2160p";
  episode?: string;
  size: string;
  host: string;
  url: string;
}

interface MovieFormData {
  title: string;
  description: string;
  contentType: "movie" | "tv_show";
  year: string;
  rating: string;
  duration: string;
  posterUrl: string;
  backdropUrl: string;
  imdbId: string;
  mediaInfo: string;
  trailerKey: string;
  streamUrl: string;
  genres: string[];
  language: string;
  status: string;
}

interface MovieFormProps {
  initialData?: MovieFormData;
  initialLinks?: DownloadLinkInput[];
  movieId?: number;
  mode: "create" | "edit";
}

const defaultFormData: MovieFormData = {
  title: "",
  description: "",
  contentType: "movie",
  year: "",
  rating: "",
  duration: "",
  posterUrl: "",
  backdropUrl: "",
  imdbId: "",
  mediaInfo: "",
  trailerKey: "",
  streamUrl: "",
  genres: [],
  language: "English",
  status: "published",
};

// We keep this for backward compatibility or basic options, but allow any string now
const qualityOptions = ["480p", "720p", "1080p", "2160p"] as const;

interface LinkGroup {
  id: string;
  quality: string;
  episode: string;
  size: string;
  services: { id?: number; host: string; url: string }[];
}

export default function MovieForm({
  initialData = defaultFormData,
  initialLinks = [],
  movieId,
  mode,
}: MovieFormProps) {
  const router = useRouter();
  const [formData, setFormData] = useState<MovieFormData>(initialData);
  const [linkGroups, setLinkGroups] = useState<LinkGroup[]>(() => {
    const groups: Record<string, LinkGroup> = {};
    initialLinks.forEach(link => {
      // Group by quality + size + episode (if exists)
      const key = `${link.quality}-${link.size}-${link.episode || ""}`;
      if (!groups[key]) {
        groups[key] = { id: Math.random().toString(), quality: link.quality, episode: link.episode || "", size: link.size || "", services: [] };
      }
      groups[key].services.push({ id: link.id, host: link.host, url: link.url });
    });
    return Object.values(groups);
  });
  const [newGenre, setNewGenre] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isFetchingTMDB, setIsFetchingTMDB] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState("");
  const [submitSuccess, setSubmitSuccess] = useState("");

  async function handleFetchTMDB() {
    if (!formData.title.trim()) {
      alert("Please enter a Title or TMDB ID first.");
      return;
    }

    setIsFetchingTMDB(true);
    const type = formData.contentType === "tv_show" ? "tv" : "movie";

    try {
      // Fix: Call server-side proxy — API key stays on the server, not exposed to browser.
      const res = await fetch(
        `/api/tmdb?query=${encodeURIComponent(formData.title.trim())}&type=${type}`
      );

      if (!res.ok) {
        const errData = await res.json().catch(() => null);
        alert(errData?.error || "Failed to fetch data from TMDB.");
        return;
      }

      const data = await res.json();

      // Check if it came back with actual content
      if (data.title) {
        setFormData(prev => ({
          ...prev,
          title: data.title,
          description: data.description,
          year: data.year,
          rating: data.rating,
          duration: data.duration,
          posterUrl: data.posterUrl,
          backdropUrl: data.backdropUrl,
          imdbId: data.imdbId,
          trailerKey: data.trailerKey,
          genres: data.genres,
        }));
      } else {
        alert("No results found on TMDB for this title.");
      }
    } catch (error) {
      console.error("Failed to fetch from TMDB:", error);
      alert("Failed to fetch data from TMDB.");
    } finally {
      setIsFetchingTMDB(false);
    }
  }


  function validate(): boolean {
    const newErrors: Record<string, string> = {};
    if (!formData.title.trim()) {
      newErrors.title = "Title is required";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);
    setSubmitError("");
    try {
      const url = mode === "create" ? "/api/movies" : `/api/movies/${movieId}`;
      const method = mode === "create" ? "POST" : "PUT";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          year: formData.year ? parseInt(formData.year) : null,
          trailerKey: formData.trailerKey || null,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => null);
        setSubmitError(errData?.error || `Failed to ${mode} movie (${res.status})`);
        return;
      }

      const data = await res.json();
      const newMovieId = mode === "create" ? data.movie.id : movieId;

      // Flatten linkGroups for saving
      const flattenedLinks: DownloadLinkInput[] = [];
      linkGroups.forEach(group => {
        group.services.forEach(service => {
          if (group.quality && service.host && service.url) {
            flattenedLinks.push({
              id: service.id,
              quality: group.quality as any, // stored as varchar now
              episode: group.episode,
              size: group.size,
              host: service.host,
              url: service.url
            });
          }
        });
      });

      // Fix: Delete removed links in parallel and surface errors.
      if (mode === "edit") {
        const currentLinkIds = new Set(flattenedLinks.filter(l => l.id).map(l => l.id));
        const removedLinks = initialLinks.filter(l => l.id && !currentLinkIds.has(l.id));
        const deleteResults = await Promise.allSettled(
          removedLinks.map(link =>
            fetch(`/api/download-links/${link.id}`, { method: "DELETE" })
          )
        );
        const deleteErrors = deleteResults.filter(r => r.status === "rejected");
        if (deleteErrors.length > 0) {
          console.error("Some links failed to delete:", deleteErrors);
        }
      }

      // Fix: Save all links in parallel and surface any errors.
      const saveResults = await Promise.allSettled(
        flattenedLinks.map(link => {
          if (link.id) {
            return fetch(`/api/download-links/${link.id}`, {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(link),
            });
          } else {
            return fetch("/api/download-links", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ ...link, movieId: newMovieId }),
            });
          }
        })
      );
      const saveErrors = saveResults.filter(r => r.status === "rejected");
      if (saveErrors.length > 0) {
        setSubmitError(`Warning: ${saveErrors.length} download link(s) failed to save. Please check and retry.`);
        setIsSubmitting(false);
        return;
      }

      // Show success toast then redirect
      const successMsg = mode === "create" ? "Content created successfully!" : "Changes saved successfully!";
      setSubmitSuccess(successMsg);
      setTimeout(() => {
        router.push(formData.contentType === "tv_show" ? "/tv-shows" : "/movies");
      }, 1500);
    } catch (error) {
      console.error("Submit error:", error);
      setSubmitError("An unexpected error occurred. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  function addGenre() {
    if (newGenre.trim() && !formData.genres.includes(newGenre.trim())) {
      setFormData((prev) => ({
        ...prev,
        genres: [...prev.genres, newGenre.trim()],
      }));
      setNewGenre("");
    }
  }

  function removeGenre(genre: string) {
    setFormData((prev) => ({
      ...prev,
      genres: prev.genres.filter((g) => g !== genre),
    }));
  }

  function addLinkGroup() {
    setLinkGroups(prev => [
      ...prev,
      { id: Math.random().toString(), quality: "1080p", episode: "", size: "", services: [{ host: "", url: "" }] }
    ]);
  }

  function updateGroup(index: number, field: "quality" | "size" | "episode", value: string) {
    setLinkGroups(prev => prev.map((g, i) => i === index ? { ...g, [field]: value } : g));
  }

  function removeGroup(index: number) {
    setLinkGroups(prev => prev.filter((_, i) => i !== index));
  }

  function addService(groupIndex: number) {
    setLinkGroups(prev => prev.map((g, i) => i === groupIndex ? { ...g, services: [...g.services, { host: "", url: "" }] } : g));
  }

  function updateService(groupIndex: number, serviceIndex: number, field: "host" | "url", value: string) {
    setLinkGroups(prev => prev.map((g, i) => {
      if (i === groupIndex) {
        return {
          ...g,
          services: g.services.map((s, j) => j === serviceIndex ? { ...s, [field]: value } : s)
        };
      }
      return g;
    }));
  }

  function removeService(groupIndex: number, serviceIndex: number) {
    setLinkGroups(prev => prev.map((g, i) => {
      if (i === groupIndex) {
        return {
          ...g,
          services: g.services.filter((_, j) => j !== serviceIndex)
        };
      }
      return g;
    }));
  }

  return (
    <>
    <form onSubmit={handleSubmit} className="space-y-8 animate-fade-in">
      {submitSuccess && (
        <div className="px-4 py-3 bg-success/10 border border-success/20 rounded-lg text-success text-sm flex items-center gap-2">
          <span>✓</span> {submitSuccess}
        </div>
      )}
      {submitError && (
        <div className="px-4 py-3 bg-danger/10 border border-danger/20 rounded-lg text-danger text-sm">
          {submitError}
        </div>
      )}
      {/* Basic Info */}
      <div className="bg-surface border border-border rounded-xl p-6 space-y-5">
        <h2 className="text-lg font-semibold text-text-primary">
          Basic Information
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Title */}
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-text-secondary mb-1.5">
              Title or TMDB ID *
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={formData.title}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, title: e.target.value }))
                }
                className={cn(
                  "flex-1 px-4 py-2.5 bg-surface-elevated border rounded-lg text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-1 transition-all",
                  errors.title
                    ? "border-danger focus:ring-danger/20"
                    : "border-border focus:border-primary/50 focus:ring-primary/20"
                )}
                placeholder="Enter title or TMDB ID"
              />
              <button
                type="button"
                onClick={handleFetchTMDB}
                disabled={isFetchingTMDB}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-primary/10 hover:bg-primary/20 text-primary-light border border-primary/20 rounded-lg font-medium transition-colors disabled:opacity-50"
              >
                {isFetchingTMDB ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                Fetch TMDB
              </button>
            </div>
            {errors.title && (
              <p className="text-danger text-xs mt-1">{errors.title}</p>
            )}
          </div>

          {/* Content Type */}
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1.5">
              Content Type
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() =>
                  setFormData((prev) => ({ ...prev, contentType: "movie" }))
                }
                className={cn(
                  "flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border text-sm font-medium transition-all",
                  formData.contentType === "movie"
                    ? "border-primary/50 bg-primary/10 text-primary-light"
                    : "border-border bg-surface-elevated text-text-secondary hover:text-text-primary"
                )}
              >
                <Film size={16} /> Movie
              </button>
              <button
                type="button"
                onClick={() =>
                  setFormData((prev) => ({ ...prev, contentType: "tv_show" }))
                }
                className={cn(
                  "flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border text-sm font-medium transition-all",
                  formData.contentType === "tv_show"
                    ? "border-accent/50 bg-accent/10 text-accent"
                    : "border-border bg-surface-elevated text-text-secondary hover:text-text-primary"
                )}
              >
                <Tv size={16} /> Series
              </button>
            </div>
          </div>

          {/* Year */}
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1.5">
              Year
            </label>
            <input
              type="number"
              value={formData.year}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, year: e.target.value }))
              }
              className="w-full px-4 py-2.5 bg-surface-elevated border border-border rounded-lg text-text-primary placeholder:text-text-muted focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all"
              placeholder="2024"
            />
          </div>

          {/* Rating */}
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1.5">
              Rating
            </label>
            <input
              type="text"
              value={formData.rating}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, rating: e.target.value }))
              }
              className="w-full px-4 py-2.5 bg-surface-elevated border border-border rounded-lg text-text-primary placeholder:text-text-muted focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all"
              placeholder="8.5"
            />
          </div>

          {/* Duration */}
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1.5">
              Duration
            </label>
            <input
              type="text"
              value={formData.duration}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, duration: e.target.value }))
              }
              className="w-full px-4 py-2.5 bg-surface-elevated border border-border rounded-lg text-text-primary placeholder:text-text-muted focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all"
              placeholder="2h 30m"
            />
          </div>

          {/* Language */}
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1.5">
              Language
            </label>
            <input
              type="text"
              value={formData.language}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, language: e.target.value }))
              }
              className="w-full px-4 py-2.5 bg-surface-elevated border border-border rounded-lg text-text-primary placeholder:text-text-muted focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all"
              placeholder="English"
            />
          </div>

          {/* IMDB ID */}
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1.5">
              IMDB ID (or Full URL)
            </label>
            <input
              type="text"
              value={formData.imdbId}
              onChange={(e) => {
                let val = e.target.value;
                const match = val.match(/tt\d+/);
                if (match) {
                  val = match[0];
                }
                setFormData((prev) => ({ ...prev, imdbId: val }));
              }}
              className="w-full px-4 py-2.5 bg-surface-elevated border border-border rounded-lg text-text-primary placeholder:text-text-muted focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all"
              placeholder="tt1234567 or https://www.imdb.com/..."
            />
          </div>

          {/* Trailer Key */}
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1.5">
              Trailer Key (YouTube)
            </label>
            <input
              type="text"
              value={formData.trailerKey}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, trailerKey: e.target.value }))
              }
              className="w-full px-4 py-2.5 bg-surface-elevated border border-border rounded-lg text-text-primary placeholder:text-text-muted focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all"
              placeholder="dQw4w9WgXcQ"
            />
          </div>

          {/* Status */}
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1.5">
              Status
            </label>
            <select
              value={formData.status}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, status: e.target.value }))
              }
              className="w-full px-4 py-2.5 bg-surface-elevated border border-border rounded-lg text-text-primary focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all"
            >
              <option value="published">Published</option>
              <option value="draft">Draft</option>
              <option value="archived">Archived</option>
            </select>
          </div>
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-1.5">
            Description
          </label>
          <textarea
            value={formData.description}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, description: e.target.value }))
            }
            rows={4}
            className="w-full px-4 py-2.5 bg-surface-elevated border border-border rounded-lg text-text-primary placeholder:text-text-muted focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all resize-none"
            placeholder="Enter description..."
          />
        </div>

        {/* MediaInfo */}
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-1.5">
            Media Info (Simple Format)
          </label>
          <textarea
            value={formData.mediaInfo}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, mediaInfo: e.target.value }))
            }
            rows={3}
            className="w-full px-4 py-2.5 bg-surface-elevated border border-border rounded-lg text-text-primary placeholder:text-text-muted focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all font-mono text-sm resize-none"
            placeholder={`Video: HEVC 10bit, 3840x2160 (4K), 23.976 fps\nAudio: English, EAC3, 5.1 Channel\nSubtitles: Indonesian, English`}
          />
        </div>

        {/* Genres */}
        <div>
          <label className="block text-sm font-medium text-text-secondary mb-1.5">
            Genres
          </label>
          <div className="flex gap-2 mb-2">
            <input
              type="text"
              value={newGenre}
              onChange={(e) => setNewGenre(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addGenre())}
              className="flex-1 px-4 py-2.5 bg-surface-elevated border border-border rounded-lg text-text-primary placeholder:text-text-muted focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all"
              placeholder="Add genre"
            />
            <button
              type="button"
              onClick={addGenre}
              className="px-4 py-2.5 bg-surface-elevated border border-border rounded-lg text-text-secondary hover:text-text-primary hover:border-primary/30 transition-colors"
            >
              <Plus size={18} />
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {formData.genres.map((genre) => (
              <span
                key={genre}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium bg-primary/10 text-primary-light border border-primary/20"
              >
                {genre}
                <button
                  type="button"
                  onClick={() => removeGenre(genre)}
                  className="hover:text-danger transition-colors"
                >
                  <X size={12} />
                </button>
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Media */}
      <div className="bg-surface border border-border rounded-xl p-6 space-y-5">
        <h2 className="text-lg font-semibold text-text-primary">Media</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1.5">
              Poster URL
            </label>
            <input
              type="text"
              value={formData.posterUrl}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, posterUrl: e.target.value }))
              }
              className="w-full px-4 py-2.5 bg-surface-elevated border border-border rounded-lg text-text-primary placeholder:text-text-muted focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all"
              placeholder="https://..."
            />
            {formData.posterUrl && (
              <div className="mt-2 aspect-[2/3] max-w-[120px] rounded-lg overflow-hidden bg-surface-elevated border border-border">
                <img
                  src={formData.posterUrl}
                  alt="Poster preview"
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = "none";
                  }}
                />
              </div>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1.5">
              Backdrop URL
            </label>
            <input
              type="text"
              value={formData.backdropUrl}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  backdropUrl: e.target.value,
                }))
              }
              className="w-full px-4 py-2.5 bg-surface-elevated border border-border rounded-lg text-text-primary placeholder:text-text-muted focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all"
              placeholder="https://..."
            />
            {formData.backdropUrl && (
              <div className="mt-2 aspect-video max-w-[200px] rounded-lg overflow-hidden bg-surface-elevated border border-border">
                <img
                  src={formData.backdropUrl}
                  alt="Backdrop preview"
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = "none";
                  }}
                />
              </div>
            )}
          </div>
          
          {formData.contentType === "movie" && (
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-text-secondary mb-1.5">
                Stream / Media Configuration (JSON)
              </label>
              <textarea
                value={formData.streamUrl || ""}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    streamUrl: e.target.value,
                  }))
                }
                rows={4}
                className="w-full px-4 py-2.5 bg-surface-elevated border border-border rounded-lg text-text-primary placeholder:text-text-muted focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all font-mono text-sm resize-y"
                placeholder={`{\n  "url": "https://.../manifest.mpd",\n  "subtitles": [...]\n}`}
              />
              <p className="text-xs text-text-muted mt-1.5">
                Paste your DASH player JSON configuration or simply the raw .mpd URL here.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Download Links (Grouped) */}
      <div className="bg-surface border border-border rounded-xl p-6 space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-text-primary">
              Download Links
            </h2>
            <p className="text-xs text-text-muted mt-1">Group your links by Release Name (e.g. 1080p BluRay)</p>
          </div>
          <button
            type="button"
            onClick={addLinkGroup}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 hover:bg-primary/20 text-primary-light rounded-lg text-sm font-medium transition-colors"
          >
            <Plus size={14} />
            Add Group
          </button>
        </div>

        {linkGroups.length === 0 ? (
          <div className="text-center py-6 text-text-muted">
            No download links added yet
          </div>
        ) : (
          <div className="space-y-6">
            {linkGroups.map((group, index) => (
              <div
                key={group.id}
                className="p-4 bg-surface-elevated border border-border rounded-xl space-y-4"
              >
                <div className="flex items-start justify-between gap-4">
                  {/* Quality, Episode & Size Inputs */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4 flex-1">
                    <div>
                      <label className="block text-xs font-medium text-text-secondary mb-1.5">
                        Resolution / Quality
                      </label>
                      <input
                        type="text"
                        value={group.quality}
                        onChange={(e) => updateGroup(index, "quality", e.target.value)}
                        className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-text-primary text-sm focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all"
                        placeholder="e.g. 1080p Web-DL"
                      />
                    </div>
                    {formData.contentType === "tv_show" && (
                      <div>
                        <label className="block text-xs font-medium text-text-secondary mb-1.5">
                          Episode (Optional)
                        </label>
                        <input
                          type="text"
                          value={group.episode}
                          onChange={(e) => updateGroup(index, "episode", e.target.value)}
                          className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-text-primary text-sm focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all"
                          placeholder="e.g. Episode 1, Batch"
                        />
                      </div>
                    )}
                    <div>
                      <label className="block text-xs font-medium text-text-secondary mb-1.5">
                        File Size
                      </label>
                      <input
                        type="text"
                        value={group.size}
                        onChange={(e) => updateGroup(index, "size", e.target.value)}
                        className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-text-primary text-sm focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all"
                        placeholder="e.g. 1.2 GB"
                      />
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeGroup(index)}
                    className="p-2 mt-5 text-danger hover:bg-danger/10 rounded-lg transition-colors"
                    title="Remove Group"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>

                {/* Services within the group */}
                <div className="pl-4 border-l-2 border-border space-y-3">
                  <h4 className="text-xs font-semibold text-text-secondary uppercase tracking-wider mb-2">Services</h4>
                  {group.services.map((service, serviceIndex) => (
                    <div key={serviceIndex} className="flex flex-col sm:flex-row gap-3 items-start sm:items-center bg-surface p-3 rounded-lg border border-border-subtle">
                      <div className="w-full sm:w-1/3">
                        <input
                          type="text"
                          value={service.host}
                          onChange={(e) => updateService(index, serviceIndex, "host", e.target.value)}
                          className="w-full px-3 py-1.5 bg-surface-elevated border border-border rounded-md text-text-primary text-sm placeholder:text-text-muted focus:outline-none focus:border-primary/50"
                          placeholder="Host (e.g. Google Drive)"
                        />
                      </div>
                      <div className="w-full sm:flex-1">
                        <input
                          type="text"
                          value={service.url}
                          onChange={(e) => updateService(index, serviceIndex, "url", e.target.value)}
                          className="w-full px-3 py-1.5 bg-surface-elevated border border-border rounded-md text-text-primary text-sm placeholder:text-text-muted focus:outline-none focus:border-primary/50"
                          placeholder="URL (https://...)"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => removeService(index, serviceIndex)}
                        className="p-1.5 text-text-muted hover:text-danger hover:bg-danger/10 rounded-md transition-colors"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => addService(index)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-text-secondary hover:text-primary-light hover:bg-primary/10 rounded-md transition-colors"
                  >
                    <Plus size={12} />
                    Add Service
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Submit */}
      <div className="flex items-center justify-end gap-3">
        <Link
          href={formData.contentType === "tv_show" ? "/tv-shows" : "/movies"}
          className="px-4 py-2 bg-surface-elevated border border-border text-text-secondary hover:text-text-primary rounded-lg text-sm font-medium transition-colors"
        >
          Cancel
        </Link>
        <button
          type="submit"
          disabled={isSubmitting}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary hover:bg-primary-hover text-white rounded-lg font-medium transition-colors disabled:opacity-50"
        >
          {isSubmitting ? (
            <Loader2 size={18} className="animate-spin" />
          ) : (
            <Save size={18} />
          )}
          {mode === "create" ? "Create" : "Save Changes"}
        </button>
      </div>
    </form>
    
    {mode === "edit" && formData.contentType === "tv_show" && movieId && (
      <EpisodeStreamManager movieId={movieId} />
    )}
    </>
  );
}
