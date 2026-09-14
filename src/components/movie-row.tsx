"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { PosterCard } from "./poster-card";

export function MovieRow({ title, movies, viewAllLink }: { title: string, movies: any[], viewAllLink?: string }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isMoved, setIsMoved] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);

  const scroll = (direction: "left" | "right") => {
    if (scrollRef.current) {
      const scrollAmount = scrollRef.current.clientWidth * 0.8;
      scrollRef.current.scrollBy({
        left: direction === "left" ? -scrollAmount : scrollAmount,
        behavior: "smooth"
      });
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!scrollRef.current) return;
    setIsDragging(true);
    setIsMoved(false);
    setStartX(e.pageX - scrollRef.current.offsetLeft);
    setScrollLeft(scrollRef.current.scrollLeft);
  };

  const handleMouseLeave = () => {
    setIsDragging(false);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !scrollRef.current) return;
    e.preventDefault();
    const x = e.pageX - scrollRef.current.offsetLeft;
    const walk = (x - startX); 
    if (Math.abs(walk) > 5) {
      setIsMoved(true);
    }
    // 1:1 movement for smoother, natural feel
    scrollRef.current.scrollLeft = scrollLeft - walk; 
  };

  const handleClick = (e: React.MouseEvent) => {
    if (isMoved) {
      e.stopPropagation();
      e.preventDefault();
    }
  };

  if (!movies || movies.length === 0) return null;

  return (
    <section className="mb-6 sm:mb-8 relative group">
      <div className="flex items-end justify-between px-4 lg:px-12 xl:px-16 mb-2 sm:mb-3">
        <h2 className="text-xl sm:text-2xl font-semibold text-text-primary">
          {title}
        </h2>
        {viewAllLink && (
          <Link
            href={viewAllLink}
            className="text-sm font-medium text-text-secondary hover:text-white transition-colors"
          >
            View All <span aria-hidden="true">&rarr;</span>
          </Link>
        )}
      </div>

      <div className="relative">
        {/* Navigation Buttons */}
        <button
          onClick={() => scroll("left")}
          className="absolute left-0 top-0 bottom-0 z-20 w-12 bg-gradient-to-r from-background to-transparent hidden md:flex opacity-0 group-hover:opacity-100 items-center justify-start pl-2 text-white transition-opacity focus:outline-none disabled:opacity-0"
          aria-label="Scroll left"
        >
          <ChevronLeft size={32} className="drop-shadow-lg" />
        </button>
        <button
          onClick={() => scroll("right")}
          className="absolute right-0 top-0 bottom-0 z-20 w-12 bg-gradient-to-l from-background to-transparent hidden md:flex opacity-0 group-hover:opacity-100 items-center justify-end pr-2 text-white transition-opacity focus:outline-none"
          aria-label="Scroll right"
        >
          <ChevronRight size={32} className="drop-shadow-lg" />
        </button>

        {/* Scroll Container */}
        <div
          ref={scrollRef}
          onMouseDown={handleMouseDown}
          onMouseLeave={handleMouseLeave}
          onMouseUp={handleMouseUp}
          onMouseMove={handleMouseMove}
          onClickCapture={handleClick}
          className={`flex overflow-x-auto gap-3 sm:gap-4 px-4 lg:px-12 xl:px-16 py-6 ${isDragging ? "cursor-grabbing" : "cursor-grab"} scrollbar-hide`}
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {movies.map((item) => (
            <div key={item.id} className="shrink-0 w-32 sm:w-40 md:w-48 lg:w-52 select-none">
              <PosterCard movie={item} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
