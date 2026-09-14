import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function optimizeImageUrl(url: string | null, size: 'w342' | 'w500' | 'w780' | 'w1280' = 'w500'): string {
  if (!url || typeof url !== 'string') return '';
  // Jika ini dari TMDB dan ukurannya original, ubah ke ukuran yang lebih kecil agar lebih cepat diload
  if (url.includes('image.tmdb.org') && url.includes('/original/')) {
    return url.replace('/original/', `/${size}/`);
  }
  return url;
}
