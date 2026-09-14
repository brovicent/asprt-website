import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { categories } from "@/db/schema";
import { requireAdmin, handleApiError } from "@/lib/auth";
import { eq } from "drizzle-orm";

export async function GET() {
  try {
    const allCategories = await db.select().from(categories).orderBy(categories.name);
    return NextResponse.json({ categories: allCategories });
  } catch (error) {
    console.error("Get categories error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    await requireAdmin();
    const body = await request.json();
    const { name, slug, description } = body;

    if (!name || !slug) {
      return NextResponse.json(
        { error: "Name and slug are required" },
        { status: 400 }
      );
    }

    // Validate name length
    if (typeof name !== "string" || name.trim().length === 0 || name.length > 100) {
      return NextResponse.json(
        { error: "Name must be between 1 and 100 characters" },
        { status: 400 }
      );
    }

    // Validate slug: only lowercase letters, numbers, and hyphens
    const normalizedSlug = String(slug).toLowerCase().trim().replace(/\s+/g, "-");
    if (!/^[a-z0-9-]+$/.test(normalizedSlug) || normalizedSlug.length > 100) {
      return NextResponse.json(
        { error: "Slug must only contain lowercase letters, numbers, and hyphens" },
        { status: 400 }
      );
    }

    const [result] = await db
      .insert(categories)
      .values({ name: name.trim(), slug: normalizedSlug, description });

    const [newCategory] = await db
      .select()
      .from(categories)
      .where(eq(categories.id, result.insertId));

    return NextResponse.json({ category: newCategory }, { status: 201 });
  } catch (error) {
    console.error("Create category error:", error);
    const { error: errMsg, status } = handleApiError(error);
    return NextResponse.json({ error: errMsg }, { status });
  }
}


