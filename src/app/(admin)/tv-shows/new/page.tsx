"use client";

import dynamic from "next/dynamic";

const MovieForm = dynamic(() => import("@/components/movie-form"), {
  ssr: false,
});
export default function NewMoviePage() {
  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">Add New Content</h1>
        <p className="text-text-secondary mt-1">
          Create a new movie or series entry
        </p>
      </div>
      <MovieForm mode="create" />
    </div>
  );
}
