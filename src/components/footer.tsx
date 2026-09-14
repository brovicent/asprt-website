import Link from "next/link";
import { Download } from "lucide-react";

export function Footer() {
  return (
    <footer className="mt-auto py-8 lg:py-12 border-t border-white/10 bg-background/50 text-center">
      <div className="max-w-[1400px] mx-auto px-4 flex flex-col items-center justify-center gap-6">
        <div className="flex items-center gap-2 opacity-50">
          <Download size={24} />
          <span className="font-bold text-lg tracking-widest uppercase">ASPRT</span>
        </div>
        
        <p className="text-white/40 text-xs max-w-lg leading-relaxed">
          ASPRT does not host, store, or distribute any media files. All content is sourced from third-party providers.
        </p>
        
        <div className="flex items-center gap-6 text-xs text-white/50">
          <a href="mailto:contact@asprt.to" className="hover:text-white transition-colors">contact@asprt.to</a>
        </div>
      </div>
    </footer>
  );
}
