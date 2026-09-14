"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Search,
  Loader2,
  Trash2,
  CheckCircle,
  XCircle,
  Clock,
  AlertCircle,
  RotateCcw,
  Link2Off,
  ExternalLink,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Report {
  id: number;
  title: string;
  linkUrl: string | null;
  reason: string;
  status: "pending" | "resolved" | "rejected";
  createdAt: string;
}

type StatusFilter = "all" | "pending" | "resolved" | "rejected";

const STATUS_FILTERS: { key: StatusFilter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "pending", label: "Pending" },
  { key: "resolved", label: "Resolved" },
  { key: "rejected", label: "Rejected" },
];

export default function AdminReportsPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [error, setError] = useState("");
  const [actionError, setActionError] = useState("");
  const [updatingId, setUpdatingId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  useEffect(() => {
    fetchReports();
  }, []);

  async function fetchReports() {
    setIsLoading(true);
    setError("");
    try {
      const res = await fetch("/api/reports");
      if (!res.ok) throw new Error("Failed to fetch reports");
      const data = await res.json();
      setReports(data.reports);
    } catch {
      setError("Failed to load reports. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleUpdateStatus(id: number, status: "pending" | "resolved" | "rejected") {
    setUpdatingId(id);
    setActionError("");
    try {
      const res = await fetch(`/api/reports/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || "Failed to update status");
      }
      setReports((prev) =>
        prev.map((r) => (r.id === id ? { ...r, status } : r))
      );
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Failed to update status");
    } finally {
      setUpdatingId(null);
    }
  }

  async function handleDelete(id: number) {
    if (!confirm("Are you sure you want to delete this report?")) return;
    setDeletingId(id);
    setActionError("");
    try {
      const res = await fetch(`/api/reports/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || "Failed to delete report");
      }
      setReports((prev) => prev.filter((r) => r.id !== id));
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Failed to delete report");
    } finally {
      setDeletingId(null);
    }
  }

  // Counts per status for badge display
  const counts = {
    all: reports.length,
    pending: reports.filter((r) => r.status === "pending").length,
    resolved: reports.filter((r) => r.status === "resolved").length,
    rejected: reports.filter((r) => r.status === "rejected").length,
  };

  const filteredReports = reports.filter((r) => {
    const matchSearch = r.title.toLowerCase().includes(search.toLowerCase()) ||
      r.reason.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || r.status === statusFilter;
    return matchSearch && matchStatus;
  });

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Dead Link Reports</h1>
          <p className="text-sm text-text-secondary mt-1">
            Manage broken links reported by users
          </p>
        </div>
        <button
          onClick={fetchReports}
          disabled={isLoading}
          className="inline-flex items-center gap-2 px-3 py-2 bg-surface border border-border rounded-lg text-sm text-text-secondary hover:text-text-primary transition-colors disabled:opacity-50"
        >
          <RotateCcw size={15} className={isLoading ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>

      {/* Action error */}
      {actionError && (
        <div className="flex items-center gap-3 px-4 py-3 bg-danger/10 border border-danger/20 rounded-lg text-danger text-sm">
          <AlertCircle size={16} className="flex-shrink-0" />
          {actionError}
          <button
            onClick={() => setActionError("")}
            className="ml-auto text-danger/70 hover:text-danger transition-colors"
          >
            ×
          </button>
        </div>
      )}

      <div className="bg-surface border border-border rounded-xl shadow-sm overflow-hidden flex flex-col">
        {/* Toolbar */}
        <div className="p-4 border-b border-border flex flex-col gap-3 bg-surface-elevated">
          {/* Search */}
          <div className="relative w-full sm:max-w-xs">
            <Search
              size={18}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted"
            />
            <input
              type="text"
              placeholder="Search by title or reason..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-surface border border-border rounded-lg text-sm focus:outline-none focus:border-primary/50 transition-colors text-text-primary placeholder:text-text-muted"
            />
          </div>

          {/* Status filter tabs */}
          <div className="flex flex-wrap gap-2">
            {STATUS_FILTERS.map((filter) => (
              <button
                key={filter.key}
                onClick={() => setStatusFilter(filter.key)}
                className={cn(
                  "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all border",
                  statusFilter === filter.key
                    ? filter.key === "pending"
                      ? "bg-warning/15 text-warning border-warning/30"
                      : filter.key === "resolved"
                      ? "bg-success/15 text-success border-success/30"
                      : filter.key === "rejected"
                      ? "bg-danger/15 text-danger border-danger/30"
                      : "bg-primary/15 text-primary-light border-primary/30"
                    : "bg-surface text-text-secondary border-border hover:border-border-hover"
                )}
              >
                {filter.label}
                <span className={cn(
                  "px-1.5 py-0.5 rounded-full text-[10px] font-bold",
                  statusFilter === filter.key ? "bg-current/20" : "bg-surface-elevated"
                )}>
                  {counts[filter.key]}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="p-12 flex flex-col items-center justify-center text-text-muted">
            <Loader2 size={32} className="animate-spin mb-4 text-primary" />
            <p>Loading reports...</p>
          </div>
        ) : error ? (
          <div className="p-12 flex flex-col items-center justify-center gap-3">
            <AlertCircle size={32} className="text-danger" />
            <p className="text-danger font-medium">{error}</p>
            <button
              onClick={fetchReports}
              className="px-4 py-2 bg-surface border border-border rounded-lg text-sm text-text-secondary hover:text-text-primary transition-colors"
            >
              Try Again
            </button>
          </div>
        ) : filteredReports.length === 0 ? (
          <div className="p-12 flex flex-col items-center justify-center text-text-muted">
            <Link2Off size={48} className="mb-4 opacity-20" />
            <p className="text-lg font-medium text-text-primary">
              No reports found
            </p>
            <p className="text-sm mt-1">
              {search || statusFilter !== "all"
                ? "Try adjusting your search or filter."
                : "There are no dead link reports yet."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-surface-elevated border-b border-border text-text-secondary">
                <tr>
                  <th className="px-6 py-4 font-medium">Title & Link</th>
                  <th className="px-6 py-4 font-medium">Details</th>
                  <th className="px-6 py-4 font-medium">Status</th>
                  <th className="px-6 py-4 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredReports.map((report) => (
                  <tr
                    key={report.id}
                    className="hover:bg-surface-hover/50 transition-colors"
                  >
                    <td className="px-6 py-4">
                      <p className="font-medium text-text-primary max-w-[200px] truncate" title={report.title}>
                        {report.title}
                      </p>
                      {report.linkUrl ? (
                        <a href={report.linkUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-primary-light hover:underline flex items-center gap-1 mt-0.5 max-w-[200px] truncate">
                          {report.linkUrl} <ExternalLink size={10} />
                        </a>
                      ) : (
                        <p className="text-xs text-text-muted mt-0.5">No URL provided</p>
                      )}
                      <p className="text-[10px] text-text-muted mt-1 uppercase font-semibold">
                        {new Date(report.createdAt).toLocaleDateString()}
                      </p>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-text-secondary whitespace-normal break-words max-w-xs text-[13px] leading-relaxed line-clamp-2" title={report.reason}>
                        {report.reason}
                      </p>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1.5">
                        {report.status === "pending" && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-warning/10 text-warning border border-warning/20">
                            <Clock size={14} /> Pending
                          </span>
                        )}
                        {report.status === "resolved" && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-success/10 text-success border border-success/20">
                            <CheckCircle size={14} /> Resolved
                          </span>
                        )}
                        {report.status === "rejected" && (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-danger/10 text-danger border border-danger/20">
                            <XCircle size={14} /> Rejected
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        {updatingId === report.id ? (
                          <Loader2 size={18} className="animate-spin text-text-muted" />
                        ) : report.status === "pending" ? (
                          <>
                            <button
                              onClick={() => handleUpdateStatus(report.id, "resolved")}
                              className="p-2 text-text-muted hover:text-success hover:bg-success/10 rounded-lg transition-colors"
                              title="Mark as Resolved"
                            >
                              <CheckCircle size={18} />
                            </button>
                            <button
                              onClick={() => handleUpdateStatus(report.id, "rejected")}
                              className="p-2 text-text-muted hover:text-danger hover:bg-danger/10 rounded-lg transition-colors"
                              title="Mark as Rejected"
                            >
                              <XCircle size={18} />
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() => handleUpdateStatus(report.id, "pending")}
                            className="p-2 text-text-muted hover:text-warning hover:bg-warning/10 rounded-lg transition-colors"
                            title="Reset to Pending"
                          >
                            <RotateCcw size={18} />
                          </button>
                        )}
                        <button
                          onClick={() => handleDelete(report.id)}
                          disabled={deletingId === report.id}
                          className="p-2 text-text-muted hover:text-danger hover:bg-danger/10 rounded-lg transition-colors ml-2 disabled:opacity-50"
                          title="Delete Report"
                        >
                          {deletingId === report.id
                            ? <Loader2 size={18} className="animate-spin" />
                            : <Trash2 size={18} />}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
