"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Link2Off, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface ReportData {
  title: string;
  linkUrl: string;
  reason: string;
}

export default function ReportPage() {
  const [formData, setFormData] = useState<ReportData>({
    title: "",
    linkUrl: "",
    reason: "",
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setIsSubmitting(true);
    setError("");

    try {
      const res = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        if (res.status === 429) {
          throw new Error("You are submitting too fast. Please try again later.");
        }
        throw new Error(data?.error || "Failed to submit report.");
      }

      setIsSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit report. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isSuccess) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8 bg-surface border border-border p-8 rounded-2xl shadow-xl text-center animate-fade-in">
          <div className="mx-auto w-16 h-16 bg-success/10 text-success rounded-full flex items-center justify-center">
            <svg
              className="w-8 h-8"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
          <div>
            <h2 className="mt-4 text-2xl font-bold text-text-primary">
              Report Submitted!
            </h2>
            <p className="mt-2 text-text-secondary">
              Thank you for reporting this dead link. We'll fix it as soon as possible.
            </p>
          </div>
          <div className="pt-4">
            <button
              onClick={() => {
                setFormData({ title: "", linkUrl: "", reason: "" });
                setIsSuccess(false);
              }}
              className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary-hover focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-colors"
            >
              Submit Another Report
            </button>
            <div className="mt-4">
              <Link
                href="/"
                className="text-sm font-medium text-primary-light hover:underline transition-colors"
              >
                Return to Home
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[80vh] py-12 px-4 sm:px-6 lg:px-8 flex flex-col items-center animate-fade-in">
      <div className="max-w-2xl w-full">
        <div className="mb-8">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-text-secondary hover:text-text-primary transition-colors mb-6"
          >
            <ArrowLeft size={16} /> Back to Home
          </Link>
          <div className="flex items-center gap-3">
            <div className="p-3 bg-primary/10 text-primary-light rounded-xl">
              <Link2Off size={24} />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-text-primary">
                Report Dead Link
              </h1>
              <p className="text-text-secondary mt-1">
                Found a broken download link? Let us know so we can fix it!
              </p>
            </div>
          </div>
        </div>

        <div className="bg-surface border border-border rounded-2xl shadow-xl overflow-hidden">
          <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-6">
            {error && (
              <div className="p-4 bg-danger/10 border border-danger/20 rounded-lg text-danger text-sm">
                {error}
              </div>
            )}

            <div className="space-y-1.5">
              <label htmlFor="title" className="block text-sm font-medium text-text-primary">
                Movie or Series Title <span className="text-danger">*</span>
              </label>
              <input
                id="title"
                type="text"
                required
                maxLength={200}
                value={formData.title}
                onChange={(e) =>
                  setFormData({ ...formData, title: e.target.value })
                }
                placeholder="E.g., Inception (2010)"
                className="w-full px-4 py-2.5 bg-surface-elevated border border-border rounded-lg text-text-primary placeholder:text-text-muted focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="linkUrl" className="block text-sm font-medium text-text-primary">
                Dead Link URL <span className="text-text-muted font-normal">(Optional)</span>
              </label>
              <input
                id="linkUrl"
                type="url"
                maxLength={1000}
                value={formData.linkUrl}
                onChange={(e) =>
                  setFormData({ ...formData, linkUrl: e.target.value })
                }
                placeholder="https://... (The broken link)"
                className="w-full px-4 py-2.5 bg-surface-elevated border border-border rounded-lg text-text-primary placeholder:text-text-muted focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="reason" className="block text-sm font-medium text-text-primary">
                Additional Details <span className="text-danger">*</span>
              </label>
              <textarea
                id="reason"
                required
                maxLength={2000}
                rows={4}
                value={formData.reason}
                onChange={(e) =>
                  setFormData({ ...formData, reason: e.target.value })
                }
                placeholder="E.g., The 1080p Google Drive link is showing file not found..."
                className="w-full px-4 py-2.5 bg-surface-elevated border border-border rounded-lg text-text-primary placeholder:text-text-muted focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all resize-y"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full flex justify-center items-center gap-2 py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary-hover focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <Link2Off size={18} />
                  Submit Report
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
