import {
  mysqlTable,
  serial,
  varchar,
  text,
  timestamp,
  int,
  bigint,
  boolean,
  mysqlEnum,
  json,
} from "drizzle-orm/mysql-core";

export const users = mysqlTable("users", {
  id: serial("id").primaryKey(),
  username: varchar("username", { length: 50 }).notNull().unique(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  role: mysqlEnum("role", ["admin", "user"]).notNull().default("user"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const categories = mysqlTable("categories", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 100 }).notNull().unique(),
  slug: varchar("slug", { length: 100 }).notNull().unique(),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const movies = mysqlTable("movies", {
  id: serial("id").primaryKey(),
  title: varchar("title", { length: 255 }).notNull(),
  slug: varchar("slug", { length: 255 }).notNull().unique(),
  description: text("description"),
  contentType: mysqlEnum("content_type", ["movie", "tv_show"]).notNull().default("movie"),
  year: int("year"),
  rating: varchar("rating", { length: 10 }),
  duration: varchar("duration", { length: 50 }),
  posterUrl: text("poster_url"),
  backdropUrl: text("backdrop_url"),
  imdbId: varchar("imdb_id", { length: 20 }),
  streamUrl: text("stream_url"),
  mediaInfo: text("media_info"),
  trailerKey: varchar("trailer_key", { length: 20 }),
  genres: json("genres").$type<string[]>(),
  language: varchar("language", { length: 50 }),
  status: varchar("status", { length: 50 }).default("published"),
  views: int("views").default(0),
  createdBy: bigint("created_by", { mode: "number", unsigned: true }).references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const downloadLinks = mysqlTable("download_links", {
  id: serial("id").primaryKey(),
  movieId: bigint("movie_id", { mode: "number", unsigned: true })
    .notNull()
    .references(() => movies.id, { onDelete: "cascade" }),
  quality: varchar("quality", { length: 255 }).notNull(),
  episode: varchar("episode", { length: 50 }),
  size: varchar("size", { length: 50 }),
  host: varchar("host", { length: 100 }).notNull(),
  url: text("url").notNull(),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const requests = mysqlTable("requests", {
  id: serial("id").primaryKey(),
  title: varchar("title", { length: 255 }).notNull(),
  type: mysqlEnum("type", ["movie", "tv_show"]).notNull(),
  year: varchar("year", { length: 4 }),
  reason: text("reason"),
  status: mysqlEnum("status", ["pending", "fulfilled", "rejected"]).notNull().default("pending"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const reports = mysqlTable("reports", {
  id: serial("id").primaryKey(),
  title: varchar("title", { length: 255 }).notNull(),
  linkUrl: text("link_url"),
  reason: text("reason").notNull(),
  status: mysqlEnum("status", ["pending", "resolved", "rejected"]).notNull().default("pending"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const episodeStreams = mysqlTable("episode_streams", {
  id: serial("id").primaryKey(),
  movieId: bigint("movie_id", { mode: "number", unsigned: true })
    .notNull()
    .references(() => movies.id, { onDelete: "cascade" }),
  seasonNumber: int("season_number").notNull(),
  episodeNumber: int("episode_number").notNull(),
  streamUrl: text("stream_url").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Movie = typeof movies.$inferSelect;
export type NewMovie = typeof movies.$inferInsert;
export type Category = typeof categories.$inferSelect;
export type NewCategory = typeof categories.$inferInsert;
export type DownloadLink = typeof downloadLinks.$inferSelect;
export type NewDownloadLink = typeof downloadLinks.$inferInsert;
export type Request = typeof requests.$inferSelect;
export type NewRequest = typeof requests.$inferInsert;
export type Report = typeof reports.$inferSelect;
export type NewReport = typeof reports.$inferInsert;
export type EpisodeStream = typeof episodeStreams.$inferSelect;
export type NewEpisodeStream = typeof episodeStreams.$inferInsert;
