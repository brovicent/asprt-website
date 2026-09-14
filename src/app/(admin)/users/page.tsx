"use client";

import { useEffect, useState } from "react";
import { Users, Shield, User, Loader2, Calendar, Plus, X, Save } from "lucide-react";

interface UserData {
  id: number;
  username: string;
  email: string;
  role: string;
  createdAt: string;
}

export default function UsersPage() {
  const [users, setUsers] = useState<UserData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [showAddForm, setShowAddForm] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [addForm, setAddForm] = useState({
    username: "",
    email: "",
    password: "",
    role: "user"
  });
  const [addMessage, setAddMessage] = useState({ type: "", text: "" });

  useEffect(() => {
    fetchUsers();
  }, []);

  async function fetchUsers() {
    try {
      const res = await fetch("/api/users");
      if (res.ok) {
        const data = await res.json();
        setUsers(data.users);
      }
    } catch (error) {
      console.error("Failed to fetch users:", error);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleAddUser(e: React.FormEvent) {
    e.preventDefault();
    setIsAdding(true);
    setAddMessage({ type: "", text: "" });

    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(addForm),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to create user");
      }

      setUsers([data.user, ...users]);
      setShowAddForm(false);
      setAddForm({ username: "", email: "", password: "", role: "user" });
    } catch (error: unknown) {
      setAddMessage({ type: "error", text: error instanceof Error ? error.message : "Failed to create user" });
    } finally {
      setIsAdding(false);
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="animate-spin text-primary" size={32} />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Users</h1>
          <p className="text-text-secondary mt-1">
            Manage platform users and roles
          </p>
        </div>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="inline-flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary-hover text-white rounded-lg font-medium transition-colors"
        >
          {showAddForm ? <X size={18} /> : <Plus size={18} />}
          {showAddForm ? "Cancel" : "Add User"}
        </button>
      </div>

      {showAddForm && (
        <div className="bg-surface border border-border rounded-xl p-6 animate-fade-in">
          <h2 className="text-lg font-semibold text-text-primary mb-4">Add New User</h2>
          
          {addMessage.text && (
            <div className={`mb-4 px-4 py-3 rounded-lg text-sm ${addMessage.type === 'error' ? 'bg-danger/10 border border-danger/20 text-danger' : 'bg-success/10 border border-success/20 text-success'}`}>
              {addMessage.text}
            </div>
          )}

          <form onSubmit={handleAddUser} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1.5">Username</label>
                <input
                  type="text"
                  required
                  value={addForm.username}
                  onChange={(e) => setAddForm({ ...addForm, username: e.target.value })}
                  suppressHydrationWarning
                  className="w-full px-4 py-2.5 bg-surface-elevated border border-border rounded-lg text-text-primary focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all"
                  placeholder="Enter username"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1.5">Email</label>
                <input
                  type="email"
                  required
                  value={addForm.email}
                  onChange={(e) => setAddForm({ ...addForm, email: e.target.value })}
                  suppressHydrationWarning
                  className="w-full px-4 py-2.5 bg-surface-elevated border border-border rounded-lg text-text-primary focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all"
                  placeholder="Enter email address"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1.5">Password</label>
                <input
                  type="password"
                  required
                  minLength={8}
                  value={addForm.password}
                  onChange={(e) => setAddForm({ ...addForm, password: e.target.value })}
                  suppressHydrationWarning
                  className="w-full px-4 py-2.5 bg-surface-elevated border border-border rounded-lg text-text-primary focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all"
                  placeholder="Min 8 chars, letters + numbers"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-text-secondary mb-1.5">Role</label>
                <select
                  required
                  value={addForm.role}
                  onChange={(e) => setAddForm({ ...addForm, role: e.target.value })}
                  suppressHydrationWarning
                  className="w-full px-4 py-2.5 bg-surface-elevated border border-border rounded-lg text-text-primary focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/20 transition-all"
                >
                  <option value="user">User</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={isAdding}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary hover:bg-primary-hover text-white rounded-lg font-medium transition-colors disabled:opacity-50"
              >
                {isAdding ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                Create User
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-surface border border-border rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-border-subtle flex items-center gap-2">
          <Users size={18} className="text-primary-light" />
          <h2 className="font-semibold text-text-primary">
            All Users ({users.length})
          </h2>
        </div>
        <div className="divide-y divide-border-subtle">
          {users.length === 0 ? (
            <div className="px-5 py-8 text-center text-text-muted">
              No users found
            </div>
          ) : (
            users.map((user) => (
              <div
                key={user.id}
                className="flex items-center gap-4 px-5 py-4 hover:bg-surface-hover transition-colors"
              >
                <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                  <span className="text-sm font-bold text-primary-light">
                    {user.username[0].toUpperCase()}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-text-primary">
                    {user.username}
                  </p>
                  <p className="text-sm text-text-muted truncate">
                    {user.email}
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <span
                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium ${
                      user.role === "admin"
                        ? "bg-accent/10 text-accent border border-accent/20"
                        : "bg-surface-elevated text-text-secondary border border-border"
                    }`}
                  >
                    {user.role === "admin" ? (
                      <Shield size={12} />
                    ) : (
                      <User size={12} />
                    )}
                    {user.role}
                  </span>
                  <span className="text-xs text-text-muted hidden sm:flex items-center gap-1">
                    <Calendar size={12} />
                    {new Date(user.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
