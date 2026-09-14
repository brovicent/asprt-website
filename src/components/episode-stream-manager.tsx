"use client";

import { useState, useEffect } from "react";
import { Plus, Save, Trash2, Loader2, Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface EpisodeStream {
  id: number;
  movieId: number;
  seasonNumber: number;
  episodeNumber: number;
  streamUrl: string;
}

export function EpisodeStreamManager({ movieId }: { movieId: number }) {
  const [streams, setStreams] = useState<EpisodeStream[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  
  const [season, setSeason] = useState(1);
  const [episode, setEpisode] = useState(1);
  const [streamUrl, setStreamUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    fetchStreams();
  }, [movieId]);

  async function fetchStreams() {
    setLoading(true);
    try {
      const res = await fetch(`/api/movies/${movieId}/episodes`);
      if (res.ok) {
        const data = await res.json();
        setStreams(data.episodeStreams || []);
      }
    } catch (err) {
      console.error(err);
      setError("Failed to fetch episode streams");
    } finally {
      setLoading(false);
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!season || !episode || !streamUrl) return;

    setSaving(true);
    setSuccess(false);
    try {
      const res = await fetch(`/api/movies/${movieId}/episodes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ seasonNumber: season, episodeNumber: episode, streamUrl }),
      });
      
      if (res.ok) {
        setSuccess(true);
        setStreamUrl(""); // Clear after save
        setEpisode(prev => prev + 1); // Auto increment episode
        fetchStreams(); // Refresh list
        setTimeout(() => setSuccess(false), 3000);
      } else {
        const data = await res.json();
        alert(data.error || "Failed to save episode stream");
      }
    } catch (err) {
      console.error(err);
      alert("Error saving episode stream");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <div className="p-6 text-center text-text-muted"><Loader2 className="animate-spin mx-auto" /></div>;
  }

  return (
    <div className="bg-surface border border-border rounded-xl p-6 space-y-6 animate-fade-in">
      <div>
        <h2 className="text-lg font-semibold text-text-primary">Episode Streams</h2>
        <p className="text-xs text-text-muted mt-1">Manage streaming configuration for individual episodes.</p>
      </div>

      {/* Add/Edit Form */}
      <form onSubmit={handleSave} className="p-4 bg-surface-elevated border border-border rounded-xl space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1.5">Season</label>
            <input
              type="number"
              min="1"
              value={season}
              onChange={(e) => setSeason(parseInt(e.target.value) || 1)}
              className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-text-primary text-sm focus:outline-none focus:border-primary/50"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1.5">Episode</label>
            <input
              type="number"
              min="1"
              value={episode}
              onChange={(e) => setEpisode(parseInt(e.target.value) || 1)}
              className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-text-primary text-sm focus:outline-none focus:border-primary/50"
            />
          </div>
        </div>
        
        <div>
          <label className="block text-xs font-medium text-text-secondary mb-1.5">
            Stream / Media Configuration (JSON)
          </label>
          <textarea
            value={streamUrl}
            onChange={(e) => setStreamUrl(e.target.value)}
            rows={3}
            className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-text-primary text-sm font-mono focus:outline-none focus:border-primary/50 resize-y"
            placeholder={`{\n  "url": "https://.../manifest.mpd"\n}`}
            required
          />
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving || !streamUrl}
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-hover disabled:opacity-50 transition-colors"
          >
            {saving ? <Loader2 size={16} className="animate-spin" /> : (success ? <Check size={16} /> : <Save size={16} />)}
            {success ? "Saved!" : "Save Episode Stream"}
          </button>
        </div>
      </form>

      {/* List of existing streams */}
      <div className="space-y-2">
        <h3 className="text-sm font-medium text-text-secondary mb-3">Configured Episodes ({streams.length})</h3>
        {streams.length === 0 ? (
          <div className="text-sm text-text-muted italic">No episodes configured yet.</div>
        ) : (
          <div className="max-h-[300px] overflow-y-auto space-y-2 pr-2 custom-scrollbar">
            {streams.sort((a,b) => a.seasonNumber === b.seasonNumber ? a.episodeNumber - b.episodeNumber : a.seasonNumber - b.seasonNumber).map(stream => (
              <div key={stream.id} className="flex items-center justify-between p-3 bg-surface-elevated border border-border rounded-lg group">
                <div>
                  <span className="font-bold text-sm text-text-primary">S{stream.seasonNumber.toString().padStart(2, '0')} E{stream.episodeNumber.toString().padStart(2, '0')}</span>
                  <div className="text-xs text-text-muted mt-1 truncate max-w-[200px] md:max-w-[400px] font-mono">
                    {stream.streamUrl}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setSeason(stream.seasonNumber);
                    setEpisode(stream.episodeNumber);
                    setStreamUrl(stream.streamUrl);
                  }}
                  className="text-xs font-medium text-primary hover:text-primary-light transition-colors px-3 py-1 rounded bg-primary/10 opacity-0 group-hover:opacity-100"
                >
                  Edit
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
