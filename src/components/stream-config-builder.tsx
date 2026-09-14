"use client";

import { useState, useEffect } from "react";
import { Plus, X, Video, FileText } from "lucide-react";

interface Subtitle {
  lang: string;
  url: string;
}

interface StreamConfigProps {
  value: string;
  onChange: (val: string) => void;
}

export default function StreamConfigBuilder({ value, onChange }: StreamConfigProps) {
  const [importText, setImportText] = useState("");
  const [isImportSuccess, setIsImportSuccess] = useState(false);
  const [manifestUrl, setManifestUrl] = useState("");
  const [subtitles, setSubtitles] = useState<Subtitle[]>([]);
  const [jsonError, setJsonError] = useState("");

  // Parse JSON -> State (on mount to populate if editing)
  useEffect(() => {
    try {
      if (!value) {
        setManifestUrl("");
        setSubtitles([]);
        return;
      }
      
      const parsed = JSON.parse(value);
      
      let extractedUrl = parsed.url || parsed.file || parsed.src || "";
      if (!extractedUrl && parsed.source && parsed.source.url) {
        extractedUrl = parsed.source.url;
      }
      
      let extractedSubs: Subtitle[] = [];
      if (parsed.subtitles && Array.isArray(parsed.subtitles)) {
        extractedSubs = parsed.subtitles.map((s: any) => ({
          lang: s.lang || "",
          url: s.url || ""
        }));
      }

      setManifestUrl(extractedUrl);
      setSubtitles(extractedSubs);
    } catch (e) {
      // ignore silently on mount
    }
  }, [value]);

  // Handle Visual Builder Changes
  const updateFromVisual = (newUrl: string, newSubs: Subtitle[]) => {
    try {
      const currentParsed = value ? JSON.parse(value) : {};
      
      // Update URL
      if (currentParsed.source && currentParsed.source.url) {
        currentParsed.source.url = newUrl;
      } else {
        currentParsed.url = newUrl;
      }

      // Update Subtitles
      if (newSubs.length > 0) {
        currentParsed.subtitles = newSubs;
      } else {
        delete currentParsed.subtitles;
      }

      const newJson = JSON.stringify(currentParsed, null, 2);
      onChange(newJson);
    } catch (e) {
      // If current JSON is invalid, build a fresh one
      const newJsonObj = {
        title: "Movie Title",
        source: { type: "dash", url: newUrl },
        subtitles: newSubs.length > 0 ? newSubs : undefined
      };
      onChange(JSON.stringify(newJsonObj, null, 2));
    }
  };

  const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newUrl = e.target.value;
    updateFromVisual(newUrl, subtitles);
  };

  const handleSubChange = (index: number, field: keyof Subtitle, val: string) => {
    const newSubs = [...subtitles];
    newSubs[index][field] = val;
    updateFromVisual(manifestUrl, newSubs);
  };

  const addSubtitle = () => {
    updateFromVisual(manifestUrl, [...subtitles, { lang: "", url: "" }]);
  };

  const removeSubtitle = (index: number) => {
    const newSubs = subtitles.filter((_, i) => i !== index);
    updateFromVisual(manifestUrl, newSubs);
  };

  // Import from JSON box
  const handleImportText = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setImportText(val);
    
    if (!val.trim()) {
      setJsonError("");
      setIsImportSuccess(false);
      return;
    }

    try {
      const parsed = JSON.parse(val);

      if (Array.isArray(parsed)) {
        setJsonError("Arrays not supported here. Use Batch Import for multiple items.");
        setIsImportSuccess(false);
        return;
      }
      
      let extractedUrl = parsed.url || parsed.file || parsed.src || "";
      if (!extractedUrl && parsed.source && parsed.source.url) {
        extractedUrl = parsed.source.url;
      }
      
      let extractedSubs: Subtitle[] = [];
      if (parsed.subtitles && Array.isArray(parsed.subtitles)) {
        extractedSubs = parsed.subtitles.map((s: any) => ({
          lang: s.lang || "",
          url: s.url || ""
        }));
      }

      setManifestUrl(extractedUrl);
      setSubtitles(extractedSubs);
      setJsonError("");
      setIsImportSuccess(true);
      
      onChange(val);

      setTimeout(() => {
        setImportText("");
        setIsImportSuccess(false);
      }, 1500);

    } catch (e) {
      setJsonError("Invalid JSON format");
      setIsImportSuccess(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Visual Builder */}
      <div className="space-y-4">
        {/* Manifest URL */}
        <div>
          <label className="flex items-center gap-2 text-sm font-medium text-text-secondary mb-1.5">
            <Video size={16} className="text-primary" />
            Manifest URL (.mpd)
          </label>
          <input
            type="text"
            value={manifestUrl}
            onChange={handleUrlChange}
            placeholder="https://.../stream.mpd"
            className="w-full px-4 py-2.5 bg-surface-elevated border border-border rounded-lg text-text-primary focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all font-mono text-sm"
          />
        </div>

        {/* Subtitles */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="flex items-center gap-2 text-sm font-medium text-text-secondary">
              <FileText size={16} className="text-primary" />
              Subtitles
            </label>
            <button
              type="button"
              onClick={addSubtitle}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 hover:bg-primary/20 text-primary-light rounded-lg text-xs font-bold transition-colors"
            >
              <Plus size={14} strokeWidth={3} />
              Add Subtitle
            </button>
          </div>
          
          {subtitles.length === 0 ? (
            <div className="text-sm text-text-muted italic px-2 py-4 border border-dashed border-border rounded-lg text-center">
              No subtitles added yet. Click "Add Subtitle" to insert one.
            </div>
          ) : (
            <div className="space-y-3">
              {subtitles.map((sub, idx) => (
                <div key={idx} className="flex items-start gap-3 p-3 bg-surface border border-border rounded-lg">
                  <div className="w-1/3">
                    <input
                      type="text"
                      value={sub.lang}
                      onChange={(e) => handleSubChange(idx, "lang", e.target.value)}
                      placeholder="Language (e.g. Indonesia)"
                      className="w-full px-3 py-2 bg-surface-elevated border border-border rounded-md text-text-primary text-sm focus:outline-none focus:border-primary/50 font-medium"
                    />
                  </div>
                  <div className="flex-1">
                    <input
                      type="text"
                      value={sub.url}
                      onChange={(e) => handleSubChange(idx, "url", e.target.value)}
                      placeholder="Subtitle URL (.vtt)"
                      className="w-full px-3 py-2 bg-surface-elevated border border-border rounded-md text-text-primary text-sm focus:outline-none focus:border-primary/50 font-mono"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => removeSubtitle(idx)}
                    className="p-2.5 text-text-muted hover:text-danger hover:bg-danger/10 rounded-md transition-colors"
                    title="Remove Subtitle"
                  >
                    <X size={16} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="relative py-2">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-border/60"></div>
        </div>
        <div className="relative flex justify-center">
          <span className="bg-surface px-4 text-xs font-medium text-text-muted uppercase tracking-widest">OR</span>
        </div>
      </div>

      {/* Import JSON Box */}
      <div>
        <label className="flex items-center justify-between text-sm font-medium text-text-secondary mb-1.5">
          <span>Fast Import (Paste JSON)</span>
          {jsonError && <span className="text-danger text-xs font-bold bg-danger/10 px-2 py-0.5 rounded-full animate-pulse">{jsonError}</span>}
          {isImportSuccess && <span className="text-success text-xs font-bold bg-success/10 px-2 py-0.5 rounded-full animate-in fade-in">✓ Imported Successfully!</span>}
        </label>
        <textarea
          value={importText}
          onChange={handleImportText}
          rows={3}
          className={`w-full px-4 py-3 bg-[#0a0a0a] border rounded-lg text-gray-300 placeholder:text-text-muted focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all font-mono text-[13px] resize-y ${jsonError ? 'border-danger/50' : isImportSuccess ? 'border-success/50 bg-success/5' : 'border-[#222]'}`}
          placeholder={`Paste your JSON here to autofill the form...\n{\n  "url": "https://...",\n  "subtitles": [...]\n}`}
        />
      </div>
    </div>
  );
}
