import "dotenv/config";
import { db } from "@/db";
import { users, categories, movies, downloadLinks } from "@/db/schema";
import { hashPassword } from "./auth";
import { eq } from "drizzle-orm";

const demoMovies = [
  {
    title: "Dune: Part Two",
    slug: "dune-part-two-2024",
    description:
      "Paul Atreides unites with Chani and the Fremen while on a warpath of revenge against the conspirators who destroyed his family. Facing a choice between the love of his life and the fate of the known universe, he endeavors to prevent a terrible future only he can foresee.",
    contentType: "movie" as const,
    year: 2024,
    rating: "8.5",
    duration: "2h 46m",
    posterUrl: "https://images.unsplash.com/photo-1534447677768-be436bb09401?w=500&h=750&fit=crop",
    backdropUrl: "https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?w=1200&h=600&fit=crop",
    imdbId: "tt15239678",
    genres: ["Sci-Fi", "Adventure", "Drama"],
    language: "English",
    status: "published",
    views: 15420,
  },
  {
    title: "Oppenheimer",
    slug: "oppenheimer-2023",
    description:
      "The story of American scientist J. Robert Oppenheimer and his role in the development of the atomic bomb during World War II.",
    contentType: "movie" as const,
    year: 2023,
    rating: "8.6",
    duration: "3h 0m",
    posterUrl: "https://images.unsplash.com/photo-1485846234645-a62644f84728?w=500&h=750&fit=crop",
    backdropUrl: "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=1200&h=600&fit=crop",
    imdbId: "tt15398776",
    genres: ["Biography", "Drama", "History"],
    language: "English",
    status: "published",
    views: 23100,
  },
  {
    title: "The Batman",
    slug: "the-batman-2022",
    description:
      "When a sadistic serial killer begins murdering key political figures in Gotham, Batman is forced to investigate the city's hidden corruption and question his family's involvement.",
    contentType: "movie" as const,
    year: 2022,
    rating: "7.8",
    duration: "2h 56m",
    posterUrl: "https://images.unsplash.com/photo-1509347528160-9a9e33742cdb?w=500&h=750&fit=crop",
    backdropUrl: "https://images.unsplash.com/photo-1478720568477-152d9b164e26?w=1200&h=600&fit=crop",
    imdbId: "tt1877830",
    genres: ["Action", "Crime", "Drama"],
    language: "English",
    status: "published",
    views: 18900,
  },
  {
    title: "Spider-Man: Across the Spider-Verse",
    slug: "spider-man-across-the-spider-verse-2023",
    description:
      "Miles Morales catapults across the Multiverse, where he encounters a team of Spider-People charged with protecting its very existence. When the heroes clash on how to handle a new threat, Miles must redefine what it means to be a hero.",
    contentType: "movie" as const,
    year: 2023,
    rating: "8.7",
    duration: "2h 20m",
    posterUrl: "https://images.unsplash.com/photo-1635805737707-575885ab0820?w=500&h=750&fit=crop",
    backdropUrl: "https://images.unsplash.com/photo-1535016120720-40c646be5580?w=1200&h=600&fit=crop",
    imdbId: "tt9362722",
    genres: ["Animation", "Action", "Adventure"],
    language: "English",
    status: "published",
    views: 19800,
  },
  {
    title: "The Last of Us",
    slug: "the-last-of-us-2023",
    description:
      "After a global pandemic destroys civilization, a hardened survivor takes charge of a 14-year-old girl who may be humanity's last hope.",
    contentType: "tv_show" as const,
    year: 2023,
    rating: "8.7",
    duration: "9 Episodes",
    posterUrl: "https://images.unsplash.com/photo-1518676590629-3dcbd9c5a5c9?w=500&h=750&fit=crop",
    backdropUrl: "https://images.unsplash.com/photo-1517604931442-710e8ed05e3c?w=1200&h=600&fit=crop",
    imdbId: "tt3581920",
    genres: ["Drama", "Horror", "Action"],
    language: "English",
    status: "published",
    views: 25600,
  },
  {
    title: "Breaking Bad",
    slug: "breaking-bad-2008",
    description:
      "A high school chemistry teacher turned methamphetamine manufacturing drug dealer navigates the criminal underworld with a former student.",
    contentType: "tv_show" as const,
    year: 2008,
    rating: "9.5",
    duration: "62 Episodes",
    posterUrl: "https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=500&h=750&fit=crop",
    backdropUrl: "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=1200&h=600&fit=crop",
    imdbId: "tt0903747",
    genres: ["Crime", "Drama", "Thriller"],
    language: "English",
    status: "published",
    views: 45200,
  },
  {
    title: "Interstellar",
    slug: "interstellar-2014",
    description:
      "A team of explorers travel through a wormhole in space in an attempt to ensure humanity's survival as Earth becomes uninhabitable.",
    contentType: "movie" as const,
    year: 2014,
    rating: "8.7",
    duration: "2h 49m",
    posterUrl: "https://images.unsplash.com/photo-1419242902214-272b3f66ee7a?w=500&h=750&fit=crop",
    backdropUrl: "https://images.unsplash.com/photo-1462331940025-496dfbfc7564?w=1200&h=600&fit=crop",
    imdbId: "tt0816692",
    genres: ["Sci-Fi", "Adventure", "Drama"],
    language: "English",
    status: "published",
    views: 32100,
  },
  {
    title: "Stranger Things",
    slug: "stranger-things-2016",
    description:
      "When a young boy disappears, his mother, a police chief and his friends must confront terrifying supernatural forces in order to get him back.",
    contentType: "tv_show" as const,
    year: 2016,
    rating: "8.7",
    duration: "34 Episodes",
    posterUrl: "https://images.unsplash.com/photo-1626814026160-2237a95fc5a0?w=500&h=750&fit=crop",
    backdropUrl: "https://images.unsplash.com/photo-1515634928627-2a4e0dae3ddf?w=1200&h=600&fit=crop",
    imdbId: "tt4574334",
    genres: ["Drama", "Fantasy", "Horror"],
    language: "English",
    status: "published",
    views: 28900,
  },
  {
    title: "The Dark Knight",
    slug: "the-dark-knight-2008",
    description:
      "When the menace known as the Joker wreaks havoc and chaos on the people of Gotham, Batman must accept one of the greatest psychological and physical tests of his ability to fight injustice.",
    contentType: "movie" as const,
    year: 2008,
    rating: "9.0",
    duration: "2h 32m",
    posterUrl: "https://images.unsplash.com/photo-1478720568477-152d9b164e26?w=500&h=750&fit=crop",
    backdropUrl: "https://images.unsplash.com/photo-1509347528160-9a9e33742cdb?w=1200&h=600&fit=crop",
    imdbId: "tt0468569",
    genres: ["Action", "Crime", "Drama"],
    language: "English",
    status: "published",
    views: 38700,
  },
  {
    title: "Inception",
    slug: "inception-2010",
    description:
      "A thief who steals corporate secrets through the use of dream-sharing technology is given the inverse task of planting an idea into the mind of a C.E.O.",
    contentType: "movie" as const,
    year: 2010,
    rating: "8.8",
    duration: "2h 28m",
    posterUrl: "https://images.unsplash.com/photo-1480796927426-f609979314bd?w=500&h=750&fit=crop",
    backdropUrl: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=1200&h=600&fit=crop",
    imdbId: "tt1375666",
    genres: ["Sci-Fi", "Action", "Thriller"],
    language: "English",
    status: "published",
    views: 34500,
  },
  {
    title: "The Mandalorian",
    slug: "the-mandalorian-2019",
    description:
      "The travels of a lone bounty hunter in the outer reaches of the galaxy, far from the authority of the New Republic.",
    contentType: "tv_show" as const,
    year: 2019,
    rating: "8.7",
    duration: "24 Episodes",
    posterUrl: "https://images.unsplash.com/photo-1444703686981-a3abbc4d4fe3?w=500&h=750&fit=crop",
    backdropUrl: "https://images.unsplash.com/photo-1464802686167-b939a6910659?w=1200&h=600&fit=crop",
    imdbId: "tt8111088",
    genres: ["Action", "Adventure", "Fantasy"],
    language: "English",
    status: "published",
    views: 21300,
  },
  {
    title: "Everything Everywhere All at Once",
    slug: "everything-everywhere-all-at-once-2022",
    description:
      "A middle-aged Chinese immigrant is swept up into an insane adventure in which she alone can save the existence by exploring other universes and connecting with the lives she could have led.",
    contentType: "movie" as const,
    year: 2022,
    rating: "7.8",
    duration: "2h 19m",
    posterUrl: "https://images.unsplash.com/photo-1518676590629-3dcbd9c5a5c9?w=500&h=750&fit=crop",
    backdropUrl: "https://images.unsplash.com/photo-1517604931442-710e8ed05e3c?w=1200&h=600&fit=crop",
    imdbId: "tt6710474",
    genres: ["Action", "Adventure", "Comedy"],
    language: "English",
    status: "published",
    views: 16700,
  },
];

const demoCategories = [
  { name: "Action", slug: "action", description: "High-octane action movies and shows" },
  { name: "Adventure", slug: "adventure", description: "Thrilling adventure content" },
  { name: "Sci-Fi", slug: "sci-fi", description: "Science fiction masterpieces" },
  { name: "Drama", slug: "drama", description: "Emotional and dramatic stories" },
  { name: "Crime", slug: "crime", description: "Crime thrillers and mysteries" },
  { name: "Horror", slug: "horror", description: "Horror and supernatural content" },
  { name: "Comedy", slug: "comedy", description: "Comedy movies and shows" },
  { name: "Animation", slug: "animation", description: "Animated features and series" },
];

const trailerKeys: Record<string, string> = {
  "dune-part-two-2024": "Way9Dexny3w",
  "oppenheimer-2023": "uYPbbksJxIg",
  "the-batman-2022": "mqqft2x_Aa4",
  "spider-man-across-the-spider-verse-2023": "shW9i6k8cB0",
  "the-last-of-us-2023": "uLtkt8BonwM",
  "breaking-bad-2008": "HhesaQXLuRY",
  "interstellar-2014": "zSWdZVtXT7E",
  "stranger-things-2016": "yQEondeGvKo",
  "the-dark-knight-2008": "EXeTwQWrcwY",
  "inception-2010": "YoHD9XEInc0",
  "the-mandalorian-2019": "aOC8E8z_ifw",
  "everything-everywhere-all-at-once-2022": "wxN1T1uxQ2g",
};

export async function seedDatabase() {
  const existingUsers = await db.select().from(users).limit(1);
  if (existingUsers.length > 0) {
    console.log("Database already seeded, skipping...");
    return;
  }

  // Create admin user
  const adminPassword = await hashPassword("admin123");
  const [adminResult] = await db
    .insert(users)
    .values({
      username: "admin",
      email: "admin@example.com",
      passwordHash: adminPassword,
      role: "admin",
    });

  const [admin] = await db.select().from(users).where(eq(users.id, adminResult.insertId));

  // Create demo user
  const userPassword = await hashPassword("user123");
  const [userResult] = await db
    .insert(users)
    .values({
      username: "demo",
      email: "demo@example.com",
      passwordHash: userPassword,
      role: "user",
    });

  const [demoUser] = await db.select().from(users).where(eq(users.id, userResult.insertId));

  // Insert categories
  await db
    .insert(categories)
    .values(demoCategories);

  // Insert movies
  await db
    .insert(movies)
    .values(
      demoMovies.map((m) => ({
        ...m,
        trailerKey: trailerKeys[m.slug],
        mediaInfo: `Video: HEVC 10bit, ${m.year && m.year > 2015 ? '3840x2160 (4K)' : '1920x1080 (FHD)'}, 23.976 fps\nAudio: English, EAC3, 5.1 Channel\nSubtitles: Indonesian, English`,
        createdBy: admin.id,
      }))
    );
  const insertedMovies = await db.select().from(movies);

  // Insert download links for each movie
  const downloadLinkData = [
    { quality: "480p" as const, size: "450 MB", host: "Google Drive" },
    { quality: "720p" as const, size: "1.2 GB", host: "Mega.nz" },
    { quality: "1080p" as const, size: "2.8 GB", host: "1Fichier" },
    { quality: "2160p" as const, size: "8.5 GB", host: "Rapidgator" },
  ];

  for (const movie of insertedMovies) {
    for (const link of downloadLinkData) {
      await db.insert(downloadLinks).values({
        movieId: movie.id,
        quality: link.quality,
        size: link.size,
        host: link.host,
        url: `https://example.com/download/${movie.slug}/${link.quality}`,
        isActive: true,
      });
    }
  }

  console.log("Database seeded successfully!");
  console.log(`Admin: admin / admin123`);
  console.log(`Demo: demo / user123`);
}
