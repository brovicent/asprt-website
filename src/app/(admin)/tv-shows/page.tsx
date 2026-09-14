"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  Search,
  Plus,
  Tv,
  Star,
  Eye,
  Clock,
  Loader2,
  Trash2,
  Edit3,
  X,
} from "lucide-react";

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
  views: number | null;
  status: string;
  createdAt: string;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export default function TvShowsPage() {
  const router = useRouter();
  const [shows, setShows] = useState<Movie[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [deleteError, setDeleteError] = useState("");

  const fetchShows = useCallback(
    async (page = 1) => {
      setIsLoading(true);
      try {
        const params = new URLSearchParams();
        params.set("page", page.toString());
        params.set("limit", "12");
        params.set("type", "tv_show");
        if (search) params.set("search", search);

        const res = await fetch(`/api/movies?${params}`);
        if (res.ok) {
          const data = await res.json();
          setShows(data.movies);
          setPagination(data.pagination);
        }
      } catch (error) {
        console.error("Failed to fetch shows:", error);
      } finally {
        setIsLoading(false);
      }
    },
    [search]
  );

  useEffect(() => {
    fetchShows(1);
  }, [fetchShows]);

  async function handleDelete(id: number) {
    if (!confirm("Are you sure you want to delete this item?")) return;
    setDeletingId(id);
    setDeleteError("");
    try {
      const res = await fetch(`/api/movies/${id}`, { method: "DELETE" });
      if (res.ok) {
        setShows((prev) => prev.filter((s) => s.id !== id));
      } else {
        const data = await res.json().catch(() => null);
        setDeleteError(data?.error || "Failed to delete. Please try again.");
      }
    } catch {
      setDeleteError("Network error. Failed to delete.");
    } finally {
      setDeletingId(null);
    }
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    fetchShows(1);
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Series</h1>
          <p className="text-text-secondary mt-1">
            Manage your series collection
            {pagination && <span className="ml-2 text-text-muted">({pagination.total} total)</span>}
          </p>
        </div>
        <Link
          href="/tv-shows/new"
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-primary hover:bg-primary-hover text-white rounded-lg font-medium text-sm transition-colors"
        >
          <Plus size={18} />
          Add New
        </Link>
      </div>

      {/* Delete error */}
      {deleteError && (
        <div className="flex items-center gap-3 px-4 py-3 bg-danger/10 border border-danger/20 rounded-lg text-danger text-sm">
          <span className="flex-1">{deleteError}</span>
          <button onClick={() => setDeleteError("")} className="text-danger/70 hover:text-danger transition-colors">×</button>
        </div>
      )}

      <form onSubmit={handleSearch} className="relative">
        <Search
          size={18}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted"
        />
        <input
          type="text"
          placeholder="Search seriess..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 bg-surface border border-border rounded-lg text-text-primary placeholder:text-text-muted focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all"
        />
        {search && (
          <button
            type="button"
            onClick={() => {
              setSearch("");
              fetchShows(1);
            }}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary"
          >
            <X size={16} />
          </button>
        )}
      </form>

      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="animate-spin text-primary" size={32} />
        </div>
      ) : shows.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 text-center">
          <div className="w-16 h-16 rounded-full bg-surface-elevated flex items-center justify-center mb-4">
            <Tv size={28} className="text-text-muted" />
          </div>
          <h3 className="text-lg font-medium text-text-primary">
            No seriess found
          </h3>
          <p className="text-text-secondary mt-1 max-w-sm">
            {search
              ? "Try adjusting your search terms"
              : "Start by adding your first series"}
          </p>
          {!search && (
            <Link
              href="/tv-shows/new"
              className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary-hover text-white rounded-lg font-medium text-sm transition-colors"
            >
              <Plus size={16} />
              Add Series
            </Link>
          )}
        </div>
      ) : (
        <div className="bg-surface border border-border rounded-xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left whitespace-nowrap">
              <thead className="bg-surface-elevated text-xs uppercase text-text-muted border-b border-border">
                <tr>
                  <th className="px-6 py-4 font-semibold tracking-wider">Title</th>
                  <th className="px-6 py-4 font-semibold tracking-wider text-center">Type</th>
                  <th className="px-6 py-4 font-semibold tracking-wider text-center">Year</th>
                  <th className="px-6 py-4 font-semibold tracking-wider text-center">Rating</th>
                  <th className="px-6 py-4 font-semibold tracking-wider text-center">Views</th>
                  <th className="px-6 py-4 font-semibold tracking-wider text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {shows.map((show) => (
                  <tr key={show.id} className="hover:bg-surface-hover/50 transition-colors group">
                    <td className="px-6 py-3">
                      <div className="flex items-center gap-4">
                        <div className="relative w-12 h-16 shrink-0 bg-surface-elevated rounded border border-border overflow-hidden">
                          {show.posterUrl ? (
                            <Image src={show.posterUrl.replace('/original/', '/w185/')} alt={show.title} fill sizes="48px" className="object-cover" unoptimized />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Tv className="w-5 h-5 text-text-muted" />
                            </div>
                          )}
                        </div>
                        <div className="min-w-0 max-w-[300px]">
                          <Link href={`/tv-shows/${show.id}`} className="font-semibold text-text-primary hover:text-primary-light transition-colors truncate block">
                            {show.title}
                          </Link>
                          <div className="text-xs text-text-muted mt-1.5 flex items-center gap-2">
                            {show.duration ? (
                              <span className="flex items-center gap-1"><Clock size={11} /> {show.duration}</span>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-3 text-center">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wider bg-accent/15 text-accent border border-accent/20">
                        <Tv size={12} strokeWidth={2.5} />
                        Series
                      </span>
                    </td>
                    <td className="px-6 py-3 text-center text-text-secondary font-medium">{show.year || "-"}</td>
                    <td className="px-6 py-3 text-center">
                      {show.rating ? (
                        <span className="inline-flex items-center justify-center gap-1 font-bold text-accent">
                          <Star size={13} fill="currentColor" /> {show.rating}
                        </span>
                      ) : <span className="text-text-muted">-</span>}
                    </td>
                    <td className="px-6 py-3 text-center text-text-secondary font-medium">
                      {(show.views || 0).toLocaleString()}
                    </td>
                    <td className="px-6 py-3 text-right">
                      <div className="flex items-center justify-end gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => router.push(`/tv-shows/${show.id}/edit`)} className="p-2 text-text-muted hover:text-primary-light hover:bg-primary/10 rounded-lg transition-colors" title="Edit">
                          <Edit3 size={16} />
                        </button>
                        <button onClick={() => handleDelete(show.id)} disabled={deletingId === show.id} className="p-2 text-text-muted hover:text-danger hover:bg-danger/10 rounded-lg transition-colors disabled:opacity-50" title="Delete">
                          {deletingId === show.id ? <Loader2 size={16} className="animate-spin" /> : <Trash2 size={16} />}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-4">
          <button
            onClick={() => fetchShows(pagination.page - 1)}
            disabled={pagination.page === 1}
            className="px-3 py-2 rounded-lg border border-border bg-surface text-text-secondary hover:text-text-primary disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            Previous
          </button>
          <span className="text-sm text-text-secondary px-3">
            Page {pagination.page} of {pagination.totalPages}
          </span>
          <button
            onClick={() => fetchShows(pagination.page + 1)}
            disabled={pagination.page === pagination.totalPages}
            className="px-3 py-2 rounded-lg border border-border bg-surface text-text-secondary hover:text-text-primary disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
