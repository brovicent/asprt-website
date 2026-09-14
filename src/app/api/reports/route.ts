import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { reports } from "@/db/schema";
import { requireAdmin, handleApiError } from "@/lib/auth";
import { rateLimit, getClientIp } from "@/lib/rate-limit";
import { validateTextLength } from "@/lib/validation";
import { desc } from "drizzle-orm";

// Max 5 requests per IP per hour
const REPORT_LIMIT = 5;
const REPORT_WINDOW_MS = 60 * 60 * 1000;

export async function GET(request: NextRequest) {
  try {
    await requireAdmin();

    const allReports = await db
      .select()
      .from(reports)
      .orderBy(desc(reports.createdAt));

    return NextResponse.json({ reports: allReports });
  } catch (error) {
    console.error("Get reports error:", error);
    const { error: errMsg, status } = handleApiError(error);
    return NextResponse.json({ error: errMsg }, { status });
  }
}

export async function POST(request: NextRequest) {
  // ── Rate Limiting ──────────────────────────────────────────────────────────
  const ip = getClientIp(request);
  const rl = rateLimit(`reports:${ip}`, REPORT_LIMIT, REPORT_WINDOW_MS);

  if (!rl.success) {
    return NextResponse.json(
      { error: `Too many reports. Please try again in ${rl.retryAfter} seconds.` },
      {
        status: 429,
        headers: { "Retry-After": String(rl.retryAfter) },
      }
    );
  }

  try {
    const body = await request.json();
    const { title, linkUrl, reason } = body;

    // ── Input Validation ────────────────────────────────────────────────────
    const titleError = validateTextLength(title, "Title", 200);
    if (titleError) {
      return NextResponse.json({ error: titleError }, { status: 400 });
    }

    if (linkUrl) {
      const linkUrlError = validateTextLength(linkUrl, "Link URL", 1000);
      if (linkUrlError) {
        return NextResponse.json({ error: linkUrlError }, { status: 400 });
      }
    }

    const reasonError = validateTextLength(reason, "Reason", 2000);
    if (reasonError) {
      return NextResponse.json({ error: reasonError }, { status: 400 });
    }


    const [result] = await db
      .insert(reports)
      .values({
        title: String(title).trim(),
        linkUrl: linkUrl ? String(linkUrl).trim() : null,
        reason: String(reason).trim(),
        status: "pending",
      });

    return NextResponse.json({ success: true, insertId: result.insertId }, { status: 201 });
  } catch (error) {
    console.error("Create report error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
