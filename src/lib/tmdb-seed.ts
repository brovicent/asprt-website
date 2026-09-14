import "dotenv/config";
import { sql } from "drizzle-orm";

// We will use dynamic imports for db and schema inside the function
// to ensure dotenv is fully loaded before db/index.ts is evaluated.

// TMDB Image Base URL
const TMDB_IMAGE_BASE = "https://image.tmdb.org/t/p/original";

async function fetchFromTMDB(endpoint: string, apiKey: string, page = 1) {
  const url = `https://api.themoviedb.org/3${endpoint}?api_key=${apiKey}&page=${page}&language=en-US`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`TMDB API Error: ${response.status} ${response.statusText}`);
  }
  return response.json();
}

async function getGenres(apiKey: string) {
  const [movieGenresRes, tvGenresRes] = await Promise.all([
    fetchFromTMDB("/genre/movie/list", apiKey),
    fetchFromTMDB("/genre/tv/list", apiKey),
  ]);
  
  const genreMap = new Map<number, string>();
  
  movieGenresRes.genres.forEach((g: any) => genreMap.set(g.id, g.name));
  tvGenresRes.genres.forEach((g: any) => genreMap.set(g.id, g.name));
  
  return genreMap;
}

export async function seedTMDB() {
  const { db } = await import("@/db/index");
  const { users, categories, movies, downloadLinks } = await import("@/db/schema");
  const { eq } = await import("drizzle-orm");
  const { hashPassword } = await import("./auth");

  const apiKey = process.env.TMDB_API_KEY;
  
  if (!apiKey) {
    console.error("Error: TMDB_API_KEY is not defined in .env file.");
    process.exit(1);
  }

  console.log("Fetching genres from TMDB...");
  const genreMap = await getGenres(apiKey);

  console.log("Preparing database...");
  // Ensure we have an admin user
  let admin = await db.select().from(users).where(eq(users.username, "admin")).limit(1).then(res => res[0]);
  if (!admin) {
    const passwordHash = await hashPassword("admin123");
    const [result] = await db.insert(users).values({
      username: "admin",
      email: "admin@dyos.com",
      passwordHash,
      role: "admin",
    });
    admin = await db.select().from(users).where(eq(users.id, result.insertId)).limit(1).then(res => res[0]);
  }

  // Insert categories based on fetched genres
  console.log("Inserting categories...");
  const uniqueGenres = Array.from(new Set(genreMap.values()));
  const existingCategories = await db.select().from(categories);
  const existingCategoryNames = new Set(existingCategories.map(c => c.name));
  
  const newCategories = uniqueGenres
    .filter(name => !existingCategoryNames.has(name))
    .map(name => ({
      name,
      slug: name.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
      description: `${name} movies and seriess`,
    }));
    
  if (newCategories.length > 0) {
    await db.insert(categories).values(newCategories);
  }

  console.log("Fetching popular movies and seriess from TMDB...");
  const tmdbMovies: any[] = [];
  const tmdbTvShows: any[] = [];

  // Fetch 5 pages of popular movies (100 items)
  for (let page = 1; page <= 5; page++) {
    const data = await fetchFromTMDB("/movie/popular", apiKey, page);
    tmdbMovies.push(...data.results);
  }

  // Fetch 5 pages of popular seriess (100 items)
  for (let page = 1; page <= 5; page++) {
    const data = await fetchFromTMDB("/tv/popular", apiKey, page);
    tmdbTvShows.push(...data.results);
  }

  console.log(`Processing ${tmdbMovies.length} movies and ${tmdbTvShows.length} seriess...`);

  const movieInserts = tmdbMovies.map((m) => {
    const mGenres = m.genre_ids.map((id: number) => genreMap.get(id)).filter(Boolean);
    return {
      title: m.title,
      slug: `${m.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${m.id}`,
      description: m.overview || "No description available.",
      contentType: "movie" as const,
      year: m.release_date ? parseInt(m.release_date.substring(0, 4)) : null,
      rating: m.vote_average ? m.vote_average.toFixed(1).toString() : "0.0",
      duration: "2h 0m", // TMDB popular endpoint doesn't give runtime, hardcoding for dump
      posterUrl: m.poster_path ? `${TMDB_IMAGE_BASE}${m.poster_path}` : "",
      backdropUrl: m.backdrop_path ? `${TMDB_IMAGE_BASE}${m.backdrop_path}` : "",
      imdbId: `tmdb-${m.id}`,
      genres: mGenres,
      language: m.original_language === 'en' ? 'English' : m.original_language,
      status: "published" as const,
      views: Math.floor(Math.random() * 50000) + 1000,
      createdBy: admin.id,
    };
  });

  const tvInserts = tmdbTvShows.map((tv) => {
    const tvGenres = tv.genre_ids.map((id: number) => genreMap.get(id)).filter(Boolean);
    return {
      title: tv.name,
      slug: `${tv.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${tv.id}`,
      description: tv.overview || "No description available.",
      contentType: "tv_show" as const,
      year: tv.first_air_date ? parseInt(tv.first_air_date.substring(0, 4)) : null,
      rating: tv.vote_average ? tv.vote_average.toFixed(1).toString() : "0.0",
      duration: "1 Season", // Hardcoded for dump
      posterUrl: tv.poster_path ? `${TMDB_IMAGE_BASE}${tv.poster_path}` : "",
      backdropUrl: tv.backdrop_path ? `${TMDB_IMAGE_BASE}${tv.backdrop_path}` : "",
      imdbId: `tmdb-${tv.id}`,
      genres: tvGenres,
      language: tv.original_language === 'en' ? 'English' : tv.original_language,
      status: "published" as const,
      views: Math.floor(Math.random() * 50000) + 1000,
      createdBy: admin.id,
    };
  });

  const allMedia = [...movieInserts, ...tvInserts];
  
  // Insert in batches to avoid MySQL placeholder limits
  console.log("Inserting media into database...");
  const BATCH_SIZE = 50;
  for (let i = 0; i < allMedia.length; i += BATCH_SIZE) {
    const batch = allMedia.slice(i, i + BATCH_SIZE);
    
    // Ignore duplicates if re-running
    try {
      await db.insert(movies).values(batch).onDuplicateKeyUpdate({
        set: { updatedAt: sql`NOW()` }
      });
    } catch (e: any) {
      if (e.code === 'ER_DUP_ENTRY') {
        // Skip
      } else {
        throw e;
      }
    }
  }

  console.log("Inserting sample download links...");
  const insertedMedia = await db.select().from(movies);
  const downloadLinkData = [
    { quality: "720p" as const, size: "1.2 GB", host: "Mega.nz" },
    { quality: "1080p" as const, size: "2.8 GB", host: "Google Drive" },
  ];

  const linksToInsert = [];
  for (const media of insertedMedia) {
    for (const link of downloadLinkData) {
      linksToInsert.push({
        movieId: media.id,
        quality: link.quality,
        size: link.size,
        host: link.host,
        url: `https://example.com/download/${media.slug}/${link.quality}`,
        isActive: true,
      });
    }
  }

  for (let i = 0; i < linksToInsert.length; i += BATCH_SIZE) {
    const batch = linksToInsert.slice(i, i + BATCH_SIZE);
    try {
        await db.insert(downloadLinks).values(batch);
    } catch(e) {}
  }

  console.log("TMDB Seeding completed successfully!");
}

seedTMDB().catch(console.error).finally(() => process.exit(0));
