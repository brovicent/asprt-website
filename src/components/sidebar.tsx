"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import {
  LayoutDashboard,
  Film,
  Tv,
  Settings,
  LogOut,
  Menu,
  X,
  Download,
  Users,
  BarChart3,
  ChevronLeft,
  ChevronRight,
  PlusSquare,
  MessageSquare,
  Link2Off,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useSidebarState } from "./admin-shell";

const navItems = [
  { icon: LayoutDashboard, label: "Dashboard", href: "/dashboard" },
  { icon: PlusSquare, label: "Add New", href: "/movies/new" },
  { icon: Film, label: "Movies", href: "/movies" },
  { icon: Tv, label: "Series", href: "/tv-shows" },
  { icon: Link2Off, label: "Link Reports", href: "/reports" },
  { icon: BarChart3, label: "Analytics", href: "/analytics" },
  { icon: Users, label: "Users", href: "/users" },
  { icon: Settings, label: "Settings", href: "/settings" },
];

export function Sidebar() {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const { isCollapsed, setIsCollapsed } = useSidebarState();
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  if (!user) return null;

  return (
    <>
      {/* Mobile overlay */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-40 lg:hidden"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Mobile toggle */}
      <button
        onClick={() => setIsMobileOpen(!isMobileOpen)}
        className="fixed top-4 left-4 z-50 lg:hidden p-2 rounded-lg bg-surface-elevated border border-border text-text-primary hover:bg-surface-hover transition-colors"
      >
        {isMobileOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed top-0 left-0 h-full bg-surface border-r border-border z-40 flex flex-col transition-all duration-300",
          isCollapsed ? "w-20" : "w-64",
          isMobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 px-4 h-16 border-b border-border-subtle">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center flex-shrink-0">
            <Download size={18} className="text-white" />
          </div>
          {!isCollapsed && (
            <span className="font-bold text-lg text-text-primary tracking-tight">
              ASPRT
            </span>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = item.href === "/dashboard"
              ? pathname === "/dashboard"
              : item.href === "/movies/new" 
                ? pathname === "/movies/new"
                : pathname.startsWith(item.href) && pathname !== "/movies/new";
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setIsMobileOpen(false)}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200",
                  isActive
                    ? "bg-primary/10 text-primary-light border border-primary/20"
                    : "text-text-secondary hover:text-text-primary hover:bg-surface-hover",
                  isCollapsed && "justify-center"
                )}
                title={isCollapsed ? item.label : undefined}
              >
                <item.icon size={20} className="flex-shrink-0" />
                {!isCollapsed && <span>{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        {/* Bottom section */}
        <div className="border-t border-border-subtle p-3 space-y-2">
          {/* Collapse toggle - desktop only */}
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="hidden lg:flex w-full items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-text-secondary hover:text-text-primary hover:bg-surface-hover transition-all"
          >
            {isCollapsed ? (
              <ChevronRight size={20} />
            ) : (
              <>
                <ChevronLeft size={20} />
                <span>Collapse</span>
              </>
            )}
          </button>

          {/* User info */}
          <div
            className={cn(
              "flex items-center gap-3 px-3 py-2 rounded-lg bg-surface-elevated",
              isCollapsed && "justify-center"
            )}
          >
            <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
              <span className="text-xs font-bold text-primary-light">
                {user.username[0].toUpperCase()}
              </span>
            </div>
            {!isCollapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-text-primary truncate">
                  {user.username}
                </p>
                <p className="text-xs text-text-muted capitalize">
                  {user.role}
                </p>
              </div>
            )}
          </div>

          {/* Logout */}
          <button
            onClick={logout}
            className={cn(
              "flex w-full items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-danger hover:bg-danger/10 transition-all",
              isCollapsed && "justify-center"
            )}
          >
            <LogOut size={20} />
            {!isCollapsed && <span>Logout</span>}
          </button>
        </div>
      </aside>
    </>
  );
}
