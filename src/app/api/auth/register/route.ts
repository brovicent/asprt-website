import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { hashPassword, createToken, getAuthCookieOptions, handleApiError } from "@/lib/auth";
import { rateLimit, getClientIp } from "@/lib/rate-limit";
import { validateEmail, validateUsername, validatePassword } from "@/lib/validation";
import { eq } from "drizzle-orm";

// Max 3 registrations per IP per hour
const REGISTER_LIMIT = 3;
const REGISTER_WINDOW_MS = 60 * 60 * 1000;

export async function POST(request: NextRequest) {
  // ── Rate Limiting ──────────────────────────────────────────────────────────
  const ip = getClientIp(request);
  const rl = rateLimit(`register:${ip}`, REGISTER_LIMIT, REGISTER_WINDOW_MS);

  if (!rl.success) {
    return NextResponse.json(
      { error: `Too many registrations. Please try again in ${rl.retryAfter} seconds.` },
      {
        status: 429,
        headers: {
          "Retry-After": String(rl.retryAfter),
          "X-RateLimit-Limit": String(REGISTER_LIMIT),
          "X-RateLimit-Remaining": "0",
        },
      }
    );
  }

  try {
    const body = await request.json();
    const { username, email, password } = body;

    // ── Input Validation ────────────────────────────────────────────────────
    if (!username || !email || !password) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const usernameError = validateUsername(username);
    if (usernameError) {
      return NextResponse.json({ error: usernameError }, { status: 400 });
    }

    const emailError = validateEmail(email);
    if (emailError) {
      return NextResponse.json({ error: emailError }, { status: 400 });
    }

    const passwordError = validatePassword(password);
    if (passwordError) {
      return NextResponse.json({ error: passwordError }, { status: 400 });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const normalizedUsername = username.trim();

    // ── Uniqueness Checks ───────────────────────────────────────────────────
    const existingUser = await db
      .select()
      .from(users)
      .where(eq(users.email, normalizedEmail))
      .limit(1);

    if (existingUser.length > 0) {
      return NextResponse.json(
        { error: "Email already registered" },
        { status: 409 }
      );
    }

    const existingUsername = await db
      .select()
      .from(users)
      .where(eq(users.username, normalizedUsername))
      .limit(1);

    if (existingUsername.length > 0) {
      return NextResponse.json(
        { error: "Username already taken" },
        { status: 409 }
      );
    }

    // ── Create User ──────────────────────────────────────────────────────────
    const passwordHash = await hashPassword(password);

    const [result] = await db
      .insert(users)
      .values({
        username: normalizedUsername,
        email: normalizedEmail,
        passwordHash,
      });

    const [newUser] = await db
      .select()
      .from(users)
      .where(eq(users.id, result.insertId));

    const token = await createToken({
      userId: newUser.id,
      username: newUser.username,
      role: newUser.role,
    });

    const response = NextResponse.json(
      {
        user: {
          id: newUser.id,
          username: newUser.username,
          email: newUser.email,
          role: newUser.role,
        },
      },
      { status: 201 }
    );

    response.cookies.set("token", token, getAuthCookieOptions());

    return response;
  } catch (error) {
    console.error("Registration error:", error);
    const { error: errMsg, status } = handleApiError(error);
    return NextResponse.json({ error: errMsg }, { status });
  }
}
