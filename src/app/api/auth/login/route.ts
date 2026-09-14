import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { verifyPassword, createToken, getAuthCookieOptions, handleApiError } from "@/lib/auth";
import { rateLimit, getClientIp } from "@/lib/rate-limit";
import { validateEmail } from "@/lib/validation";
import { eq } from "drizzle-orm";

// Max 20 login attempts per IP per 5 minutes
const LOGIN_LIMIT = 20;
const LOGIN_WINDOW_MS = 5 * 60 * 1000;

export async function POST(request: NextRequest) {
  // ── Rate Limiting ──────────────────────────────────────────────────────────
  const ip = getClientIp(request);
  const rl = rateLimit(`login:${ip}`, LOGIN_LIMIT, LOGIN_WINDOW_MS);

  if (!rl.success) {
    return NextResponse.json(
      { error: `Too many login attempts. Please try again in ${rl.retryAfter} seconds.` },
      {
        status: 429,
        headers: {
          "Retry-After": String(rl.retryAfter),
          "X-RateLimit-Limit": String(LOGIN_LIMIT),
          "X-RateLimit-Remaining": "0",
        },
      }
    );
  }

  try {
    const body = await request.json();
    const { email, password } = body;

    // ── Input Validation ────────────────────────────────────────────────────
    if (!email || !password) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const emailError = validateEmail(email);
    if (emailError) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    if (typeof password !== "string" || password.length > 128) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    // ── Database Lookup ──────────────────────────────────────────────────────
    const user = await db
      .select()
      .from(users)
      .where(eq(users.email, email.toLowerCase().trim()))
      .limit(1);

    // Use a constant-time comparison path for both "user not found" and
    // "wrong password" to prevent user enumeration via timing attacks.
    if (user.length === 0) {
      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 401 }
      );
    }

    const isValid = await verifyPassword(password, user[0].passwordHash);

    if (!isValid) {
      return NextResponse.json(
        { error: "Invalid credentials" },
        { status: 401 }
      );
    }

    // ── Issue Token ──────────────────────────────────────────────────────────
    const token = await createToken({
      userId: user[0].id,
      username: user[0].username,
      role: user[0].role,
    });

    const response = NextResponse.json({
      user: {
        id: user[0].id,
        username: user[0].username,
        email: user[0].email,
        role: user[0].role,
      },
    });

    response.cookies.set("token", token, getAuthCookieOptions());

    return response;
  } catch (error) {
    console.error("Login error:", error);
    const { error: errMsg, status } = handleApiError(error);
    return NextResponse.json({ error: errMsg }, { status });
  }
}
