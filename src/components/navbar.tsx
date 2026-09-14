"use client";

import { Suspense, useState, useEffect } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Search, Home, Film, Tv, PlaySquare, Grid, Tags, Users, Globe, Calendar, Radio } from "lucide-react";

function NavbarContent({ activeType }: { activeType?: "movie" | "tv_show" } = {}) {
  const [isScrolled, setIsScrolled] = useState(false);
  const searchParams = useSearchParams();
  
  const type = searchParams.get("type");
  const search = searchParams.get("search");
  const genre = searchParams.get("genre");
  const isFiltered = Boolean(type || search || genre);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const activeTab = activeType || (type === "movie" ? "movie" : type === "tv_show" ? "tv_show" : (!type && !search && !genre) ? "home" : "");

  const navItems = [
    { id: "home", label: "Home", href: "/", icon: Home },
    { id: "movie", label: "Movies", href: "/?type=movie", icon: Film },
    { id: "tv_show", label: "TV Series", href: "/?type=tv_show", icon: Tv },
    { id: "genres", label: "Genres", href: "/#", icon: Tags },
  ];

  return (
    <header 
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
        isScrolled 
          ? "bg-black/95 backdrop-blur-sm shadow-xl" 
          : "bg-gradient-to-b from-black/80 via-black/30 to-transparent"
      }`}
    >
      <div className="max-w-[1600px] mx-auto flex items-center justify-between px-4 sm:px-8 lg:px-12 xl:px-16 py-4 sm:py-5">
        {/* Left Side: Logo & Navigation */}
        <div className="flex items-center gap-8 lg:gap-12">
          <Link href="/" className="flex items-center">
            <span className="font-black text-2xl tracking-tighter text-[#ff0033] uppercase">
              ASPRT
            </span>
          </Link>

          <nav className="hidden lg:flex items-center gap-1 xl:gap-2">
            {navItems.map((item) => {
              const isActive = activeTab === item.id;
              const Icon = item.icon;
              
              if (item.id === "genres") {
                const genresList = [
                  "Action", "Adventure", "Animation", "Comedy", "Crime",
                  "Documentary", "Drama", "Family", "Fantasy", "History",
                  "Horror", "Kids", "Music", "Mystery", "Reality",
                  "Romance", "Science Fiction", "Soap", "Talk", "Thriller",
                  "TV Movie", "War", "Western"
                ];
                
                return (
                  <div key={item.id} className="group/genre relative h-full flex items-center">
                    <button
                      className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[14px] font-semibold tracking-wide whitespace-nowrap transition-all duration-300 ${
                        isActive || genre 
                          ? "bg-[#ff0033]/10 text-[#ff0033]" 
                          : "text-white/80 hover:text-white hover:bg-white/5"
                      }`}
                    >
                      <Icon size={16} strokeWidth={isActive || genre ? 2.5 : 2} className={isActive || genre ? "text-[#ff0033]" : "text-white/60"} />
                      {item.label}
                    </button>
                    
                    {/* Mega Menu Dropdown */}
                    <div className="absolute top-[100%] right-0 lg:right-auto lg:left-0 pt-4 opacity-0 invisible group-hover/genre:opacity-100 group-hover/genre:visible transition-all duration-300 translate-y-2 group-hover/genre:translate-y-0 z-50">
                      <div className="bg-black/90 backdrop-blur-xl border border-white/10 rounded-2xl p-8 w-[700px] shadow-[0_30px_60px_rgba(0,0,0,0.8)] overflow-hidden relative">
                        {/* Decorative gradient orb */}
                        <div className="absolute -top-20 -right-20 w-64 h-64 bg-[#ff0033]/10 rounded-full blur-[80px] pointer-events-none" />
                        
                        <div className="flex items-center gap-3 mb-8 pb-4 border-b border-white/10 relative z-10">
                          <Tags className="text-[#ff0033]" size={22} strokeWidth={2.5} />
                          <h3 className="text-xl font-bold text-white tracking-wide">Explore Genres</h3>
                        </div>
                        
                        <div className="grid grid-cols-4 gap-y-6 gap-x-4 relative z-10">
                          {genresList.map(g => (
                            <Link
                              key={g}
                              href={`/?genre=${encodeURIComponent(g)}`}
                              className="group/link flex items-center text-[15px] font-medium text-white/60 hover:text-white transition-all w-fit"
                            >
                              <div className="relative">
                                <span>{g}</span>
                                <span className="absolute -bottom-1 left-0 w-0 h-[2px] bg-[#ff0033] transition-all duration-300 group-hover/link:w-full rounded-full" />
                              </div>
                            </Link>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              }
              
              return (
                <Link
                  key={item.id}
                  href={item.href}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[14px] font-semibold tracking-wide whitespace-nowrap transition-all duration-300 ${
                    isActive 
                      ? "bg-[#ff0033]/10 text-[#ff0033]" 
                      : "text-white/80 hover:text-white hover:bg-white/5"
                  }`}
                >
                  <Icon size={16} strokeWidth={isActive ? 2.5 : 2} className={isActive ? "text-[#ff0033]" : "text-white/60"} />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Right Side: Search */}
        <div className="flex items-center gap-4">
          <form action="/" className="relative hidden md:block">
            <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40 z-10 pointer-events-none" />
            <input
              type="text"
              name="search"
              defaultValue={search || ""}
              placeholder="Search..."
              className={`w-48 xl:w-60 px-10 py-2 rounded-xl text-sm font-medium text-center text-white placeholder:text-white/40 focus:outline-none focus:ring-1 focus:ring-[#ff0033] transition-all relative z-0 bg-transparent border ${
                isScrolled ? "border-white/10" : "border-white/20"
              }`}
              suppressHydrationWarning
            />
          </form>
        </div>
      </div>
    </header>
  );
}

export function Navbar({ activeType }: { activeType?: "movie" | "tv_show" } = {}) {
  return (
    <Suspense fallback={<header className="fixed w-full z-50 h-[60px] md:h-[70px] bg-background border-b border-white/10" />}>
      <NavbarContent activeType={activeType} />
    </Suspense>
  );
}
