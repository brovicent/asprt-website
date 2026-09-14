import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { downloadLinks } from "@/db/schema";
import { requireAdmin, handleApiError } from "@/lib/auth";
import { eq } from "drizzle-orm";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id } = await params;
    const linkId = parseInt(id);

    if (isNaN(linkId) || linkId <= 0) {
      return NextResponse.json(
        { error: "Invalid link ID" },
        { status: 400 }
      );
    }

    const body = await request.json();

    // Only allow whitelisted fields to be updated
    const allowedFields = ["quality", "episode", "size", "host", "url", "isActive"] as const;
    const updateData: Record<string, unknown> = {};
    for (const field of allowedFields) {
      if (field in body) {
        updateData[field] = body[field];
      }
    }

    await db
      .update(downloadLinks)
      .set(updateData)
      .where(eq(downloadLinks.id, linkId));

    const [updatedLink] = await db
      .select()
      .from(downloadLinks)
      .where(eq(downloadLinks.id, linkId));

    if (!updatedLink) {
      return NextResponse.json(
        { error: "Link not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ downloadLink: updatedLink });
  } catch (error) {
    console.error("Update download link error:", error);
    const { error: errMsg, status } = handleApiError(error);
    return NextResponse.json({ error: errMsg }, { status });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id } = await params;
    const linkId = parseInt(id);

    if (isNaN(linkId) || linkId <= 0) {
      return NextResponse.json(
        { error: "Invalid link ID" },
        { status: 400 }
      );
    }


    await db.delete(downloadLinks).where(eq(downloadLinks.id, linkId));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete download link error:", error);
    const { error: errMsg, status } = handleApiError(error);
    return NextResponse.json({ error: errMsg }, { status });
  }
}

