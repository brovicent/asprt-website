"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  Film,
  Users,
  Download,
  Eye,
  TrendingUp,
  Clock,
  Star,
  ArrowRight,
  Loader2,
} from "lucide-react";

interface Stats {
  totalMovies: number;
  totalUsers: number;
  totalLinks: number;
  totalViews: number;
}

interface Movie {
  id: number;
  title: string;
  slug: string;
  posterUrl: string | null;
  contentType: string;
  year: number | null;
  rating: string | null;
  views: number | null;
  createdAt: string;
}

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [recentMovies, setRecentMovies] = useState<Movie[]>([]);
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
        setRecentMovies(data.recentMovies);
        setPopularMovies(data.popularMovies);
      }
    } catch (error) {
      console.error("Failed to fetch stats:", error);
    } finally {
      setIsLoading(false);
    }
  }

  const statCards = [
    {
      label: "Total Movies",
      value: stats?.totalMovies || 0,
      icon: Film,
      color: "text-primary-light",
      bgColor: "bg-primary/10",
    },
    {
      label: "Total Users",
      value: stats?.totalUsers || 0,
      icon: Users,
      color: "text-success",
      bgColor: "bg-success/10",
    },
    {
      label: "Download Links",
      value: stats?.totalLinks || 0,
      icon: Download,
      color: "text-accent",
      bgColor: "bg-accent/10",
    },
    {
      label: "Total Views",
      value: stats?.totalViews?.toLocaleString() || 0,
      icon: Eye,
      color: "text-info",
      bgColor: "bg-info/10",
    },
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="animate-spin text-primary" size={32} />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-text-primary">Dashboard</h1>
        <p className="text-text-secondary mt-1">
          Overview of your download platform
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat) => (
          <div
            key={stat.label}
            className="bg-surface border border-border rounded-xl p-5 hover:border-border-hover transition-colors"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-text-muted text-sm">{stat.label}</p>
                <p className="text-2xl font-bold text-text-primary mt-1">
                  {stat.value}
                </p>
              </div>
              <div
                className={`w-12 h-12 rounded-xl ${stat.bgColor} flex items-center justify-center`}
              >
                <stat.icon size={22} className={stat.color} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Movies Sections */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Recent Movies */}
        <div className="bg-surface border border-border rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-border-subtle">
            <div className="flex items-center gap-2">
              <Clock size={18} className="text-primary-light" />
              <h2 className="font-semibold text-text-primary">
                Recently Added
              </h2>
            </div>
            <Link
              href="/movies"
              className="text-sm text-primary-light hover:text-primary flex items-center gap-1 transition-colors"
            >
              View all <ArrowRight size={14} />
            </Link>
          </div>
          <div className="divide-y divide-border-subtle">
            {recentMovies.length === 0 ? (
              <div className="px-5 py-8 text-center text-text-muted">
                No movies added yet
              </div>
            ) : (
              recentMovies.map((movie) => (
                <Link
                  key={movie.id}
                  href={`/movies/${movie.id}`}
                  className="flex items-center gap-4 px-5 py-3 hover:bg-surface-hover transition-colors"
                >
                  <div className="relative w-12 h-16 rounded-lg bg-surface-elevated flex-shrink-0 overflow-hidden">
                    {movie.posterUrl ? (
                      <Image
                        src={movie.posterUrl.replace('/original/', '/w185/')}
                        alt={movie.title}
                        fill
                        sizes="48px"
                        className="object-cover"
                        unoptimized
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Film size={20} className="text-text-muted" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-text-primary truncate">
                      {movie.title}
                    </p>
                    <div className="flex items-center gap-3 mt-0.5">
                      <span className="text-xs text-text-muted">
                        {movie.contentType === "tv_show" ? "Series" : "Movie"}
                      </span>
                      {movie.year && (
                        <span className="text-xs text-text-muted">
                          {movie.year}
                        </span>
                      )}
                    </div>
                  </div>
                  {movie.rating && (
                    <div className="flex items-center gap-1 text-accent">
                      <Star size={14} fill="currentColor" />
                      <span className="text-sm font-medium">
                        {movie.rating}
                      </span>
                    </div>
                  )}
                </Link>
              ))
            )}
          </div>
        </div>

        {/* Popular Movies */}
        <div className="bg-surface border border-border rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-border-subtle">
            <div className="flex items-center gap-2">
              <TrendingUp size={18} className="text-accent" />
              <h2 className="font-semibold text-text-primary">
                Most Popular
              </h2>
            </div>
            <Link
              href="/movies"
              className="text-sm text-primary-light hover:text-primary flex items-center gap-1 transition-colors"
            >
              View all <ArrowRight size={14} />
            </Link>
          </div>
          <div className="divide-y divide-border-subtle">
            {popularMovies.length === 0 ? (
              <div className="px-5 py-8 text-center text-text-muted">
                No views yet
              </div>
            ) : (
              popularMovies.map((movie) => (
                <Link
                  key={movie.id}
                  href={`/movies/${movie.id}`}
                  className="flex items-center gap-4 px-5 py-3 hover:bg-surface-hover transition-colors"
                >
                  <div className="relative w-12 h-16 rounded-lg bg-surface-elevated flex-shrink-0 overflow-hidden">
                    {movie.posterUrl ? (
                      <Image
                        src={movie.posterUrl.replace('/original/', '/w185/')}
                        alt={movie.title}
                        fill
                        sizes="48px"
                        className="object-cover"
                        unoptimized
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Film size={20} className="text-text-muted" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-text-primary truncate">
                      {movie.title}
                    </p>
                    <div className="flex items-center gap-3 mt-0.5">
                      <span className="text-xs text-text-muted">
                        {movie.contentType === "tv_show" ? "Series" : "Movie"}
                      </span>
                      {movie.year && (
                        <span className="text-xs text-text-muted">
                          {movie.year}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 text-text-secondary">
                    <Eye size={14} />
                    <span className="text-sm">
                      {(movie.views || 0).toLocaleString()}
                    </span>
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
