"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import dynamic from "next/dynamic";

const MovieForm = dynamic(() => import("@/components/movie-form"), {
  ssr: false,
});
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
}

interface DownloadLink {
  id: number;
  movieId: number;
  quality: "480p" | "720p" | "1080p" | "2160p";
  episode?: string | null;
  size: string | null;
  host: string;
  url: string;
  isActive: boolean | null;
}

export default function EditMoviePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const router = useRouter();
  const [movie, setMovie] = useState<Movie | null>(null);
  const [downloadLinks, setDownloadLinks] = useState<DownloadLink[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    params.then((p) => {
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
        router.push("/tv-shows");
      }
    } catch {
      router.push("/tv-shows");
    } finally {
      setIsLoading(false);
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

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">
          Edit: {movie.title}
        </h1>
        <p className="text-text-secondary mt-1">
          Update movie or series details
        </p>
      </div>
      <MovieForm
        mode="edit"
        movieId={movie.id}
        initialData={{
          title: movie.title,
          description: movie.description || "",
          contentType: movie.contentType,
          year: movie.year?.toString() || "",
          rating: movie.rating || "",
          duration: movie.duration || "",
          posterUrl: movie.posterUrl || "",
          backdropUrl: movie.backdropUrl || "",
          imdbId: movie.imdbId || "",
          mediaInfo: movie.mediaInfo || "",
          trailerKey: movie.trailerKey || "",
          genres: (movie.genres as string[]) || [],
          language: movie.language || "",
          status: movie.status || "published",
        }}
        initialLinks={downloadLinks.map((link) => ({
          id: link.id,
          quality: link.quality,
          episode: link.episode || "",
          size: link.size || "",
          host: link.host,
          url: link.url,
        }))}
      />
    </div>
  );
}
