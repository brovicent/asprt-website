"use client";

import { useAuth } from "@/lib/auth-context";
import {
  User,
  Mail,
  Shield,
  Save,
  Loader2,
} from "lucide-react";
import { useState, useEffect } from "react";

export default function SettingsPage() {
  const { user, updateUser } = useAuth();
  
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });

  useEffect(() => {
    if (user) {
      setUsername(user.username);
      setEmail(user.email);
    }
  }, [user]);

  async function handleSave() {
    setIsSaving(true);
    setMessage({ type: "", text: "" });
    
    try {
      // Update profile in database
      const res = await fetch("/api/settings/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, email })
      });

      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || "Failed to update profile");
      }

      updateUser(data.user);
      setMessage({ type: "success", text: "Profile updated successfully!" });
      
      setTimeout(() => setMessage({ type: "", text: "" }), 3000);
    } catch (err: unknown) {
      setMessage({ type: "error", text: err instanceof Error ? err.message : "Failed to update profile" });
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">Settings</h1>
        <p className="text-text-secondary mt-1">
          Manage your account profile
        </p>
      </div>
      
      {message.text && (
        <div className={`px-4 py-3 rounded-lg text-sm ${message.type === 'error' ? 'bg-danger/10 border border-danger/20 text-danger' : 'bg-success/10 border border-success/20 text-success'}`}>
          {message.text}
        </div>
      )}

      {/* Profile */}
      <div className="bg-surface border border-border rounded-xl p-6 space-y-5">
        <div className="flex items-center gap-2">
          <User size={18} className="text-primary-light" />
          <h2 className="text-lg font-semibold text-text-primary">
            Profile Information
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1.5">
              Username
            </label>
            <div className="relative">
              <User
                size={18}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted"
              />
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                suppressHydrationWarning
                className="w-full pl-10 pr-4 py-2.5 bg-surface-elevated border border-border rounded-lg text-text-primary focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1.5">
              Email
            </label>
            <div className="relative">
              <Mail
                size={18}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted"
              />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                suppressHydrationWarning
                className="w-full pl-10 pr-4 py-2.5 bg-surface-elevated border border-border rounded-lg text-text-primary focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-text-secondary mb-1.5">
              Role
            </label>
            <div className="relative">
              <Shield
                size={18}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted"
              />
              <input
                type="text"
                value={user?.role || ""}
                readOnly
                suppressHydrationWarning
                className="w-full pl-10 pr-4 py-2.5 bg-surface-elevated/50 border border-border rounded-lg text-text-muted capitalize focus:outline-none cursor-not-allowed"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <button 
          onClick={handleSave}
          disabled={isSaving}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary hover:bg-primary-hover text-white rounded-lg font-medium transition-colors disabled:opacity-50"
        >
          {isSaving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
          Save Profile
        </button>
      </div>
    </div>
  );
}
