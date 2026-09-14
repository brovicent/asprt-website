import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { reports } from "@/db/schema";
import { requireAdmin, handleApiError } from "@/lib/auth";
import { eq } from "drizzle-orm";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id } = await params;
    const reportId = parseInt(id);

    if (isNaN(reportId) || reportId <= 0) {
      return NextResponse.json(
        { error: "Invalid report ID" },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { status } = body;

    if (!["pending", "resolved", "rejected"].includes(status)) {
      return NextResponse.json(
        { error: "Invalid status" },
        { status: 400 }
      );
    }

    await db
      .update(reports)
      .set({ status })
      .where(eq(reports.id, reportId));

    const [updatedReport] = await db
      .select()
      .from(reports)
      .where(eq(reports.id, reportId));

    if (!updatedReport) {
      return NextResponse.json(
        { error: "Report not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ report: updatedReport });
  } catch (error) {
    console.error("Update report error:", error);
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
    const reportId = parseInt(id);

    if (isNaN(reportId) || reportId <= 0) {
      return NextResponse.json(
        { error: "Invalid report ID" },
        { status: 400 }
      );
    }

    // Verify the report exists before deleting
    const [existing] = await db
      .select({ id: reports.id })
      .from(reports)
      .where(eq(reports.id, reportId))
      .limit(1);

    if (!existing) {
      return NextResponse.json(
        { error: "Report not found" },
        { status: 404 }
      );
    }

    await db.delete(reports).where(eq(reports.id, reportId));

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error("Delete report error:", error);
    const { error: errMsg, status } = handleApiError(error);
    return NextResponse.json({ error: errMsg }, { status });
  }
}
