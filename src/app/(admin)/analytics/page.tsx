"use client";

import { useEffect, useState } from "react";
import {
  BarChart3,
  Film,
  Tv,
  Eye,
  TrendingUp,
  TrendingDown,
  Loader2,
} from "lucide-react";

interface Stats {
  totalMovies: number;
  totalUsers: number;
  totalLinks: number;
  totalViews: number;
  actualMoviesCount?: number;
  actualTvShowsCount?: number;
}

interface Movie {
  id: number;
  title: string;
  views: number | null;
  contentType: string;
  year: number | null;
}

export default function AnalyticsPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [popularMovies, setPopularMovies] = useState<Movie[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  async function fetchStats() {
    try {
      const res = await fetch("/api/stats");
      if (res.ok) {
        const data = await res.json();
        setStats(data.stats);
        setPopularMovies(data.popularMovies);
      }
    } catch (error) {
      console.error("Failed to fetch stats:", error);
    } finally {
      setIsLoading(false);
    }
  }

  const movieCount = stats?.actualMoviesCount || 0;
  const tvCount = stats?.actualTvShowsCount || 0;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="animate-spin text-primary" size={32} />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">Analytics</h1>
        <p className="text-text-secondary mt-1">
          Insights into your platform performance
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-surface border border-border rounded-xl p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-text-muted text-sm">Total Content</p>
              <p className="text-2xl font-bold text-text-primary mt-1">
                {stats?.totalMovies || 0}
              </p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
              <Film size={22} className="text-primary-light" />
            </div>
          </div>
          <div className="flex items-center gap-2 mt-3 text-xs">
            <span className="text-success flex items-center gap-1">
              <TrendingUp size={12} /> Active
            </span>
          </div>
        </div>

        <div className="bg-surface border border-border rounded-xl p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-text-muted text-sm">Total Views</p>
              <p className="text-2xl font-bold text-text-primary mt-1">
                {(stats?.totalViews || 0).toLocaleString()}
              </p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-info/10 flex items-center justify-center">
              <Eye size={22} className="text-info" />
            </div>
          </div>
          <div className="flex items-center gap-2 mt-3 text-xs">
            <span className="text-success flex items-center gap-1">
              <TrendingUp size={12} /> Growing
            </span>
          </div>
        </div>

        <div className="bg-surface border border-border rounded-xl p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-text-muted text-sm">Download Links</p>
              <p className="text-2xl font-bold text-text-primary mt-1">
                {stats?.totalLinks || 0}
              </p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center">
              <BarChart3 size={22} className="text-accent" />
            </div>
          </div>
          <div className="flex items-center gap-2 mt-3 text-xs">
            <span className="text-success flex items-center gap-1">
              <TrendingUp size={12} /> Available
            </span>
          </div>
        </div>

        <div className="bg-surface border border-border rounded-xl p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-text-muted text-sm">Registered Users</p>
              <p className="text-2xl font-bold text-text-primary mt-1">
                {stats?.totalUsers || 0}
              </p>
            </div>
            <div className="w-12 h-12 rounded-xl bg-success/10 flex items-center justify-center">
              <TrendingUp size={22} className="text-success" />
            </div>
          </div>
          <div className="flex items-center gap-2 mt-3 text-xs">
            <span className="text-success flex items-center gap-1">
              <TrendingUp size={12} /> Active
            </span>
          </div>
        </div>
      </div>

      {/* Content Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-surface border border-border rounded-xl p-6">
          <h2 className="text-lg font-semibold text-text-primary mb-4">
            Content Distribution
          </h2>
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between text-sm mb-1.5">
                <span className="text-text-secondary flex items-center gap-2">
                  <Film size={14} className="text-primary-light" /> Movies
                </span>
                <span className="text-text-primary font-medium">
                  {movieCount}
                </span>
              </div>
              <div className="h-2 bg-surface-elevated rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full transition-all"
                  style={{
                    width: `${(movieCount + tvCount) > 0 ? Math.round((movieCount / (movieCount + tvCount)) * 100) : 0}%`,
                  }}
                />
              </div>
              <p className="text-xs text-text-muted mt-1">
                {(movieCount + tvCount) > 0 ? Math.round((movieCount / (movieCount + tvCount)) * 100) : 0}% of total
              </p>
            </div>
            <div>
              <div className="flex items-center justify-between text-sm mb-1.5">
                <span className="text-text-secondary flex items-center gap-2">
                  <Tv size={14} className="text-accent" /> Series
                </span>
                <span className="text-text-primary font-medium">
                  {tvCount}
                </span>
              </div>
              <div className="h-2 bg-surface-elevated rounded-full overflow-hidden">
                <div
                  className="h-full bg-accent rounded-full transition-all"
                  style={{
                    width: `${(movieCount + tvCount) > 0 ? Math.round((tvCount / (movieCount + tvCount)) * 100) : 0}%`,
                  }}
                />
              </div>
              <p className="text-xs text-text-muted mt-1">
                {(movieCount + tvCount) > 0 ? Math.round((tvCount / (movieCount + tvCount)) * 100) : 0}% of total
              </p>
            </div>
          </div>
        </div>

        <div className="bg-surface border border-border rounded-xl p-6">
          <h2 className="text-lg font-semibold text-text-primary mb-4">
            Top Performing Content
          </h2>
          <div className="space-y-3">
            {popularMovies.slice(0, 5).map((movie, index) => (
              <div
                key={movie.id}
                className="flex items-center gap-3 p-3 bg-surface-elevated rounded-lg"
              >
                <span className="w-6 h-6 rounded-full bg-primary/10 text-primary-light text-xs font-bold flex items-center justify-center flex-shrink-0">
                  {index + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-text-primary truncate">
                    {movie.title}
                  </p>
                  <p className="text-xs text-text-muted">
                    {movie.contentType === "tv_show" ? "Series" : "Movie"} ·{" "}
                    {movie.year}
                  </p>
                </div>
                <span className="text-sm font-medium text-text-secondary flex items-center gap-1">
                  <Eye size={14} />
                  {(movie.views || 0).toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
