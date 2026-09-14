"use client";

import { useState, createContext, useContext } from "react";
import { Sidebar } from "./sidebar";

const SidebarContext = createContext<{
  isCollapsed: boolean;
  setIsCollapsed: (v: boolean) => void;
}>({ isCollapsed: false, setIsCollapsed: () => {} });

export function useSidebarState() {
  return useContext(SidebarContext);
}

export function AdminShell({ children }: { children: React.ReactNode }) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <SidebarContext.Provider value={{ isCollapsed, setIsCollapsed }}>
      <div className="min-h-screen bg-background">
        <Sidebar />
        <main
          className={`min-h-screen transition-all duration-300 ${
            isCollapsed ? "lg:ml-20" : "lg:ml-64"
          }`}
        >
          <div className="p-4 lg:p-8">{children}</div>
        </main>
      </div>
    </SidebarContext.Provider>
  );
}
