"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Film,
  Tv,
  Star,
  Eye,
  Calendar,
  Clock,
  Download,
  Loader2,
  Edit3,
  Trash2,
  ExternalLink,
  Globe,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Movie {
  id: number;
  title: string;
  slug: string;
  description: string | null;
  contentType: "movie" | "tv_show";
  year: number | null;
  rating: string | null;
  duration: string | null;
  posterUrl: string | null;
  backdropUrl: string | null;
  imdbId: string | null;
  mediaInfo: string | null;
  trailerKey: string | null;
  genres: string[] | null;
  language: string | null;
  status: string | null;
  views: number | null;
  createdAt: string;
}

interface DownloadLink {
  id: number;
  movieId: number;
  quality: string;
  size: string | null;
  host: string;
  url: string;
  isActive: boolean | null;
  episode?: string | null;
}

export default function MovieDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const router = useRouter();
  const [movie, setMovie] = useState<Movie | null>(null);
  const [downloadLinks, setDownloadLinks] = useState<DownloadLink[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const [movieId, setMovieId] = useState<string>("");

  useEffect(() => {
    params.then((p) => {
      setMovieId(p.id);
      fetchMovie(p.id);
    });
  }, [params]);

  async function fetchMovie(id: string) {
    try {
      const res = await fetch(`/api/movies/${id}`);
      if (res.ok) {
        const data = await res.json();
        setMovie(data.movie);
        setDownloadLinks(data.downloadLinks || []);
      } else {
        router.push("/movies");
      }
    } catch {
      router.push("/movies");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleDelete() {
    if (!confirm("Are you sure you want to delete this item?")) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/movies/${movieId}`, { method: "DELETE" });
      if (res.ok) {
        router.push("/movies");
      }
    } catch (error) {
      console.error("Delete failed:", error);
    } finally {
      setIsDeleting(false);
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="animate-spin text-primary" size={32} />
      </div>
    );
  }

  if (!movie) return null;

  const genres = (movie.genres as string[]) || [];

  // Group logic for Movies
  const movieGroupedLinks = downloadLinks.reduce((acc, link) => {
    const key = link.quality;
    if (!acc[key]) {
      acc[key] = { size: link.size, links: [] };
    }
    acc[key].links.push(link);
    return acc;
  }, {} as Record<string, { size: string | null; links: DownloadLink[] }>);

  // Group logic for Series
  const tvGroupedLinks = downloadLinks.reduce((acc, link) => {
    const ep = link.episode || "Unknown Episode";
    if (!acc[ep]) {
      acc[ep] = {};
    }
    const q = link.quality;
    if (!acc[ep][q]) {
      acc[ep][q] = { size: link.size, links: [] };
    }
    acc[ep][q].links.push(link);
    return acc;
  }, {} as Record<string, Record<string, { size: string | null; links: DownloadLink[] }>>);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/movies"
            className="p-2 rounded-lg bg-surface border border-border text-text-secondary hover:text-text-primary transition-colors"
          >
            <ArrowLeft size={18} />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-text-primary">
              {movie.title}
            </h1>
            <p className="text-text-secondary text-sm mt-0.5">
              {movie.contentType === "tv_show" ? "Series" : "Movie"} Details
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={`/movies/${movieId}/edit`}
            className="inline-flex items-center gap-2 px-4 py-2 bg-surface border border-border text-text-primary rounded-lg text-sm font-medium hover:bg-surface-hover transition-colors"
          >
            <Edit3 size={16} />
            Edit
          </Link>
          <button
            onClick={handleDelete}
            disabled={isDeleting}
            className="inline-flex items-center gap-2 px-4 py-2 bg-danger/10 border border-danger/20 text-danger rounded-lg text-sm font-medium hover:bg-danger/20 transition-colors disabled:opacity-50"
          >
            {isDeleting ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Trash2 size={16} />
            )}
            Delete
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-5 gap-6 lg:gap-8">
        {/* Poster */}
        <div className="md:col-span-1 lg:col-span-1 flex justify-center md:justify-start">
          <div className="w-48 md:w-full aspect-[2/3] rounded-xl overflow-hidden bg-surface-elevated border border-border shadow-lg">
            {movie.posterUrl ? (
              <img
                src={movie.posterUrl}
                alt={movie.title}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Film size={48} className="text-text-muted" />
              </div>
            )}
          </div>
        </div>

        {/* Info */}
        <div className="md:col-span-3 lg:col-span-4 space-y-5">
          {/* Meta */}
          <div className="flex flex-wrap items-center gap-3">
            <span
              className={cn(
                "px-2.5 py-1 rounded-lg text-xs font-medium",
                movie.contentType === "tv_show"
                  ? "bg-accent/10 text-accent"
                  : "bg-primary/10 text-primary-light"
              )}
            >
              {movie.contentType === "tv_show" ? (
                <span className="flex items-center gap-1">
                  <Tv size={12} /> Series
                </span>
              ) : (
                <span className="flex items-center gap-1">
                  <Film size={12} /> Movie
                </span>
              )}
            </span>
            {movie.rating && (
              <span className="flex items-center gap-1 text-accent text-sm font-medium">
                <Star size={14} fill="currentColor" />
                {movie.rating}
              </span>
            )}
            {movie.year && (
              <span className="flex items-center gap-1 text-text-secondary text-sm">
                <Calendar size={14} />
                {movie.year}
              </span>
            )}
            {movie.duration && (
              <span className="flex items-center gap-1 text-text-secondary text-sm">
                <Clock size={14} />
                {movie.duration}
              </span>
            )}
            <span className="flex items-center gap-1 text-text-secondary text-sm">
              <Eye size={14} />
              {(movie.views || 0).toLocaleString()} views
            </span>
          </div>

          {/* Genres */}
          {genres.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {genres.map((genre) => (
                <span
                  key={genre}
                  className="px-2.5 py-1 bg-surface-elevated border border-border rounded-lg text-xs text-text-secondary"
                >
                  {genre}
                </span>
              ))}
            </div>
          )}

          {/* Description */}
          {movie.description && (
            <div>
              <h3 className="text-sm font-medium text-text-primary mb-1">
                Description
              </h3>
              <p className="text-text-secondary text-sm leading-relaxed">
                {movie.description}
              </p>
            </div>
          )}

          {/* Details Grid */}
          <div className="grid grid-cols-2 gap-4 p-4 bg-surface border border-border rounded-xl">
            <div>
              <p className="text-xs text-text-muted">Status</p>
              <p className="text-sm text-text-primary capitalize mt-0.5">
                {movie.status || "N/A"}
              </p>
            </div>
            <div>
              <p className="text-xs text-text-muted">Language</p>
              <p className="text-sm text-text-primary mt-0.5">
                {movie.language || "N/A"}
              </p>
            </div>
            <div>
              <p className="text-xs text-text-muted">IMDB ID</p>
              <p className="text-sm text-text-primary mt-0.5">
                {movie.imdbId ? (
                  <a
                    href={`https://www.imdb.com/title/${movie.imdbId}/`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary-light hover:underline flex items-center gap-1"
                  >
                    {movie.imdbId} <ExternalLink size={12} />
                  </a>
                ) : (
                  "N/A"
                )}
              </p>
            </div>
            <div>
              <p className="text-xs text-text-muted">Slug</p>
              <p className="text-sm text-text-primary mt-0.5 truncate">
                {movie.slug}
              </p>
            </div>
          </div>

          {/* Download Links */}
          <div>
            <h3 className="text-sm font-medium text-text-primary mb-3 flex items-center gap-2">
              <Download size={16} />
              Download Links ({downloadLinks.length})
            </h3>
            {downloadLinks.length === 0 ? (
              <p className="text-sm text-text-muted py-4 text-center bg-surface border border-border rounded-xl">
                No download links added yet
              </p>
            ) : movie.contentType === "tv_show" ? (
              <div className="flex flex-col gap-3">
                {Object.keys(tvGroupedLinks).map((episode) => (
                  <details key={episode} className="group/ep bg-surface-elevated border border-border rounded-xl overflow-hidden [&_summary::-webkit-details-marker]:hidden">
                    <summary className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-surface-hover/50 transition-colors outline-none">
                      <h3 className="text-sm font-bold text-text-primary group-hover/ep:text-primary-light transition-colors">
                        {episode}
                      </h3>
                    </summary>
                    <div className="px-4 py-3 border-t border-border/50 bg-background/50 flex flex-col gap-2">
                      {Object.keys(tvGroupedLinks[episode]).map((quality) => {
                        const group = tvGroupedLinks[episode][quality];
                        return (
                          <details key={quality} className="group/qual bg-surface border border-border/50 rounded-lg overflow-hidden [&_summary::-webkit-details-marker]:hidden">
                            <summary className="flex items-center justify-between px-4 py-2 cursor-pointer hover:bg-surface-hover transition-colors outline-none">
                              <h4 className="text-[13px] font-bold text-text-primary">
                                {quality}
                              </h4>
                            </summary>
                            <div className="px-4 py-3 border-t border-border/50 bg-background/30 space-y-2">
                              {group.links.map((link) => (
                                <div key={link.id} className="flex items-center justify-between gap-3 p-2 bg-surface border border-border rounded-lg">
                                  <span className="text-sm text-text-primary flex-1">{link.host}</span>
                                  {link.size && <span className="text-xs text-text-muted">{link.size}</span>}
                                  <a href={link.url} target="_blank" rel="noopener noreferrer" className="p-1 text-text-muted hover:text-primary-light transition-colors">
                                    <ExternalLink size={14} />
                                  </a>
                                </div>
                              ))}
                            </div>
                          </details>
                        );
                      })}
                    </div>
                  </details>
                ))}
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {Object.keys(movieGroupedLinks).map((quality) => {
                  const group = movieGroupedLinks[quality];
                  return (
                    <details key={quality} className="group/qual bg-surface-elevated border border-border rounded-xl overflow-hidden [&_summary::-webkit-details-marker]:hidden">
                      <summary className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-surface-hover/50 transition-colors outline-none">
                        <h4 className="text-sm font-bold text-text-primary group-hover/qual:text-primary-light transition-colors">
                          {quality}
                        </h4>
                      </summary>
                      <div className="px-4 py-3 border-t border-border/50 bg-background/50 space-y-2">
                        {group.links.map((link) => (
                          <div key={link.id} className="flex items-center justify-between gap-3 p-2 bg-surface border border-border rounded-lg">
                            <span className="text-sm text-text-primary flex-1">{link.host}</span>
                            {link.size && <span className="text-xs text-text-muted">{link.size}</span>}
                            <a href={link.url} target="_blank" rel="noopener noreferrer" className="p-1 text-text-muted hover:text-primary-light transition-colors">
                              <ExternalLink size={14} />
                            </a>
                          </div>
                        ))}
                      </div>
                    </details>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
