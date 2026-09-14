"use client";

import Image from "next/image";
import { useRef, useState } from "react";

interface CastMember {
  id: number;
  name: string;
  character: string;
  profile_path: string | null;
}

export function MovieCast({ cast }: { cast: CastMember[] }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isMoved, setIsMoved] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setIsMoved(false);
    if (scrollRef.current) {
      setStartX(e.pageX - scrollRef.current.offsetLeft);
      setScrollLeft(scrollRef.current.scrollLeft);
    }
  };

  const handleMouseLeave = () => setIsDragging(false);
  const handleMouseUp = () => setIsDragging(false);

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !scrollRef.current) return;
    e.preventDefault();
    const x = e.pageX - scrollRef.current.offsetLeft;
    const walk = (x - startX);
    if (Math.abs(walk) > 5) {
      setIsMoved(true);
    }
    scrollRef.current.scrollLeft = scrollLeft - walk;
  };

  const handleClick = (e: React.MouseEvent) => {
    if (isMoved) {
      e.stopPropagation();
      e.preventDefault();
    }
  };

  if (!cast || cast.length === 0) return null;

  return (
    <div className="mb-12">
      <h3 className="text-xl font-bold text-white mb-6">Cast</h3>
      <div 
        ref={scrollRef}
        onMouseDown={handleMouseDown}
        onMouseLeave={handleMouseLeave}
        onMouseUp={handleMouseUp}
        onMouseMove={handleMouseMove}
        onClickCapture={handleClick}
        className={`flex overflow-x-auto gap-4 sm:gap-6 pb-6 scrollbar-hide ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {cast.slice(0, 20).map((actor) => (
          <div key={actor.id} className="flex flex-col items-center flex-shrink-0 w-24 sm:w-28 text-center group">
            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full overflow-hidden mb-3 bg-white/10 border border-white/10 shadow-lg group-hover:border-white transition-colors duration-300">
              {actor.profile_path ? (
                <img
                  src={`https://image.tmdb.org/t/p/w200${actor.profile_path}`}
                  alt={actor.name}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                  draggable={false}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-white/5 text-white/20">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                </div>
              )}
            </div>
            <p className="text-[13px] font-semibold text-white leading-tight mb-1">{actor.name}</p>
            <p className="text-[11px] text-white/50 leading-tight">{actor.character}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
