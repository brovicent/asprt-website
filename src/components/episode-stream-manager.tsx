"use client";

import { useState, useEffect } from "react";
import { Plus, Save, Trash2, Loader2, Check, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import StreamConfigBuilder from "./stream-config-builder";

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

  const [batchInput, setBatchInput] = useState("");
  const [batchSaving, setBatchSaving] = useState(false);
  const [batchError, setBatchError] = useState("");
  const [batchSuccess, setBatchSuccess] = useState("");

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

  async function handleBatchImport() {
    if (!batchInput.trim()) return;
    setBatchSaving(true);
    setBatchError("");
    setBatchSuccess("");
    
    try {
      const parsed = JSON.parse(batchInput);
      if (!Array.isArray(parsed)) {
        throw new Error("JSON must be an array of episodes.");
      }

      let successCount = 0;
      for (const ep of parsed) {
        if (!ep.season || !ep.episode) continue;
        
        // Convert the object back to a string for streamUrl
        const epStreamUrl = JSON.stringify({
          source: ep.source,
          resolutions: ep.resolutions,
          subtitles: ep.subtitles
        });

        const res = await fetch(`/api/movies/${movieId}/episodes`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ 
            seasonNumber: ep.season, 
            episodeNumber: ep.episode, 
            streamUrl: epStreamUrl 
          }),
        });
        
        if (res.ok) successCount++;
      }

      setBatchSuccess(`Successfully imported ${successCount} episodes!`);
      setBatchInput("");
      fetchStreams();
      setTimeout(() => setBatchSuccess(""), 4000);
    } catch (err: any) {
      setBatchError(err.message || "Invalid JSON array");
    } finally {
      setBatchSaving(false);
    }
  }

  async function handleDelete(streamId: number) {
    if (!confirm("Are you sure you want to delete this episode stream?")) return;
    try {
      const res = await fetch(`/api/movies/${movieId}/episodes`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ streamId }),
      });
      if (res.ok) {
        if (streamUrl === streams.find(s => s.id === streamId)?.streamUrl) {
           setStreamUrl(""); // clear form if deleting currently edited item
        }
        fetchStreams();
      } else {
        alert("Failed to delete episode");
      }
    } catch (err) {
      console.error(err);
      alert("Error deleting episode");
    }
  }

  if (loading) {
    return <div className="p-6 text-center text-text-muted"><Loader2 className="animate-spin mx-auto" /></div>;
  }

  // Group streams by season
  const groupedStreams = streams.reduce((acc, stream) => {
    if (!acc[stream.seasonNumber]) acc[stream.seasonNumber] = [];
    acc[stream.seasonNumber].push(stream);
    return acc;
  }, {} as Record<number, EpisodeStream[]>);

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
        
        <div className="pt-2">
          <StreamConfigBuilder
            value={streamUrl}
            onChange={(val) => setStreamUrl(val)}
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

      {/* Batch Import */}
      <div className="p-4 bg-surface-elevated border border-border rounded-xl space-y-4">
        <div>
          <h3 className="text-sm font-semibold text-text-primary">Batch Import Episodes (JSON Array)</h3>
          <p className="text-xs text-text-muted mt-1">Paste an array of episodes generated from Colab to import them all at once.</p>
        </div>
        <div>
          {batchError && <p className="text-danger text-xs mb-2 font-medium">{batchError}</p>}
          {batchSuccess && <p className="text-success text-xs mb-2 font-medium">{batchSuccess}</p>}
          <textarea
            value={batchInput}
            onChange={(e) => setBatchInput(e.target.value)}
            rows={4}
            className={`w-full px-4 py-3 bg-[#0a0a0a] border rounded-lg text-gray-300 placeholder:text-text-muted focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all font-mono text-[13px] resize-y ${batchError ? 'border-danger/50' : 'border-[#222]'}`}
            placeholder={`[\n  { "season": 1, "episode": 1, "source": {...} },\n  { "season": 1, "episode": 2, "source": {...} }\n]`}
          />
        </div>
        <div className="flex justify-end">
          <button
            type="button"
            onClick={handleBatchImport}
            disabled={batchSaving || !batchInput}
            className="inline-flex items-center gap-2 px-4 py-2 bg-surface border border-border text-text-primary rounded-lg text-sm font-medium hover:bg-surface-elevated disabled:opacity-50 transition-colors"
          >
            {batchSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            Process Batch
          </button>
        </div>
      </div>

      {/* List of existing streams */}
      <div className="space-y-2">
        <h3 className="text-sm font-medium text-text-secondary mb-3">Configured Episodes ({streams.length})</h3>
        {streams.length === 0 ? (
          <div className="text-sm text-text-muted italic">No episodes configured yet.</div>
        ) : (
          <div className="max-h-[400px] overflow-y-auto space-y-3 pr-2 custom-scrollbar">
            {Object.keys(groupedStreams).sort((a,b) => parseInt(a) - parseInt(b)).map(seasonStr => {
              const season = parseInt(seasonStr);
              const seasonStreams = groupedStreams[season].sort((a,b) => a.episodeNumber - b.episodeNumber);
              return (
                <details key={season} className="bg-surface-elevated border border-border rounded-lg group" open>
                  <summary className="font-bold text-sm text-text-primary p-3 cursor-pointer select-none outline-none list-none [&::-webkit-details-marker]:hidden flex items-center justify-between hover:bg-surface transition-colors rounded-lg group-open:rounded-b-none group-open:border-b group-open:border-border">
                    <div className="flex items-center gap-2">
                      <ChevronRight size={16} className="text-text-muted transition-transform group-open:rotate-90" />
                      Season {season}
                    </div>
                    <span className="text-xs font-normal text-text-muted">{seasonStreams.length} Episodes</span>
                  </summary>
                  <div className="p-3 bg-surface/30 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                    {seasonStreams.map(stream => {
                      let serverName = "Unknown Server";
                      try {
                        const parsed = JSON.parse(stream.streamUrl);
                        let url = parsed.url || parsed.file || parsed.src || "";
                        if (!url && parsed.source && parsed.source.url) url = parsed.source.url;
                        if (url) serverName = new URL(url).hostname.replace('www.', '');
                      } catch (e) {}

                      return (
                      <div key={stream.id} className="flex flex-col p-3 rounded-lg bg-surface border border-border hover:border-primary/50 transition-all group/ep">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-bold text-xs text-text-primary">Eps {stream.episodeNumber.toString().padStart(2, '0')}</span>
                          <div className="flex items-center gap-1.5 opacity-0 group-hover/ep:opacity-100 transition-opacity">
                            <button
                              type="button"
                              onClick={() => {
                                setSeason(stream.seasonNumber);
                                setEpisode(stream.episodeNumber);
                                setStreamUrl(stream.streamUrl);
                                window.scrollTo({ top: 0, behavior: 'smooth' });
                              }}
                              className="text-[10px] font-medium text-primary hover:text-primary-light transition-colors px-1.5 py-0.5 rounded bg-primary/10"
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDelete(stream.id)}
                              className="text-danger hover:text-danger-light transition-colors p-1 rounded bg-danger/10"
                              title="Delete Episode"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        </div>
                        <div className="text-[11px] font-medium text-text-muted mt-auto flex items-center gap-1.5 opacity-70 group-hover/ep:opacity-100 transition-opacity" title="Stream Server">
                          <div className="w-1.5 h-1.5 rounded-full bg-success"></div>
                          <span className="truncate">{serverName}</span>
                        </div>
                      </div>
                    );
                    })}
                  </div>
                </details>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
