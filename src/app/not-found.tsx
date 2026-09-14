"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Navbar } from "@/components/navbar";

export default function NotFound() {
  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-black flex flex-col items-center justify-center p-6 relative overflow-hidden">
        {/* Premium subtle background glow */}
        <div className="absolute top-1/2 left-1/2 w-[800px] h-[800px] bg-[#ff0033]/5 rounded-full blur-[150px] pointer-events-none -translate-x-1/2 -translate-y-1/2" />

        <div className="relative z-10 flex flex-col items-center text-center max-w-lg animate-in fade-in slide-in-from-bottom-4 duration-1000">
          <h1 className="text-[120px] leading-none font-black tracking-tighter mb-2 text-white drop-shadow-2xl">
            404
          </h1>
          
          <h2 className="text-3xl font-semibold text-white mb-6 tracking-tight">
            Lost your way?
          </h2>
          
          <p className="text-white/50 mb-12 text-lg leading-relaxed max-w-md mx-auto font-light">
            Sorry, we can't find that page. You'll find lots to explore on the ASPRT home page.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto justify-center">
            <Link
              href="/"
              className="inline-flex items-center justify-center px-10 py-4 bg-[#ff0033] hover:bg-[#ff0033]/90 text-white rounded-lg font-semibold tracking-wide transition-all hover:scale-105"
            >
              ASPRT Home
            </Link>
            <button
              onClick={() => window.history.back()}
              className="inline-flex items-center justify-center gap-2 px-10 py-4 bg-transparent hover:bg-white/5 text-white border border-white/20 hover:border-white/40 rounded-lg font-semibold tracking-wide transition-all"
            >
              <ArrowLeft size={18} strokeWidth={2.5} />
              Go Back
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
