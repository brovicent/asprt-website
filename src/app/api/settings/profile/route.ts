import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { requireAuth, handleApiError, createToken, getAuthCookieOptions } from "@/lib/auth";
import { validateEmail, validateUsername } from "@/lib/validation";
import { eq, and, ne } from "drizzle-orm";

export async function PUT(request: NextRequest) {
  try {
    const user = await requireAuth();
    const body = await request.json();
    const { username, email } = body;

    if (!username || !email) {
      return NextResponse.json(
        { error: "Username and email are required" },
        { status: 400 }
      );
    }

    // ── Input Validation ────────────────────────────────────────────────────
    const usernameError = validateUsername(username);
    if (usernameError) {
      return NextResponse.json({ error: usernameError }, { status: 400 });
    }

    const emailError = validateEmail(email);
    if (emailError) {
      return NextResponse.json({ error: emailError }, { status: 400 });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const normalizedUsername = username.trim();

    // ── Uniqueness Checks ───────────────────────────────────────────────────
    const existingUsername = await db
      .select()
      .from(users)
      .where(and(eq(users.username, normalizedUsername), ne(users.id, user.id)))
      .limit(1);

    if (existingUsername.length > 0) {
      return NextResponse.json(
        { error: "Username is already taken" },
        { status: 400 }
      );
    }

    const existingEmail = await db
      .select()
      .from(users)
      .where(and(eq(users.email, normalizedEmail), ne(users.id, user.id)))
      .limit(1);

    if (existingEmail.length > 0) {
      return NextResponse.json(
        { error: "Email is already taken" },
        { status: 400 }
      );
    }

    // ── Update User ──────────────────────────────────────────────────────────
    await db
      .update(users)
      .set({ username: normalizedUsername, email: normalizedEmail })
      .where(eq(users.id, user.id));

    // Regenerate token because username is in the JWT payload
    const token = await createToken({
      userId: user.id,
      username: normalizedUsername,
      role: user.role,
    });

    const response = NextResponse.json({
      user: {
        id: user.id,
        username: normalizedUsername,
        email: normalizedEmail,
        role: user.role,
      },
    });

    response.cookies.set("token", token, getAuthCookieOptions());

    return response;
  } catch (error) {
    console.error("Profile update error:", error);
    const { error: errMsg, status } = handleApiError(error);
    return NextResponse.json({ error: errMsg }, { status });
  }
}
