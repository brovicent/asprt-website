/**
 * Centralized input validation utilities.
 * All validation is done server-side; client-side checks are convenience only.
 */

// ─── Email ────────────────────────────────────────────────────────────────────

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateEmail(email: unknown): string | null {
  if (typeof email !== "string") return "Email must be a string";
  const trimmed = email.trim();
  if (trimmed.length === 0) return "Email is required";
  if (trimmed.length > 254) return "Email is too long";
  if (!EMAIL_REGEX.test(trimmed)) return "Invalid email format";
  return null; // valid
}

// ─── Username ─────────────────────────────────────────────────────────────────

/** Only letters, digits, underscores, hyphens. 3–30 chars. */
const USERNAME_REGEX = /^[a-zA-Z0-9_-]{3,30}$/;

export function validateUsername(username: unknown): string | null {
  if (typeof username !== "string") return "Username must be a string";
  const trimmed = username.trim();
  if (trimmed.length === 0) return "Username is required";
  if (!USERNAME_REGEX.test(trimmed))
    return "Username must be 3–30 characters and only contain letters, numbers, underscores, or hyphens";
  return null;
}

// ─── Password ─────────────────────────────────────────────────────────────────

export function validatePassword(password: unknown): string | null {
  if (typeof password !== "string") return "Password must be a string";
  if (password.length < 8) return "Password must be at least 8 characters";
  if (password.length > 128) return "Password is too long";
  if (!/[a-zA-Z]/.test(password)) return "Password must contain at least one letter";
  if (!/[0-9]/.test(password)) return "Password must contain at least one number";
  return null;
}

// ─── Search / Free-text ───────────────────────────────────────────────────────

/** Trim and clamp a search query to a safe max length. */
export function sanitizeSearch(query: unknown, maxLength = 100): string {
  if (typeof query !== "string") return "";
  return query.trim().slice(0, maxLength);
}

/** Clamp a pagination number to a safe range. */
export function clampInt(value: unknown, min: number, max: number, fallback: number): number {
  const n = parseInt(String(value), 10);
  if (isNaN(n)) return fallback;
  return Math.max(min, Math.min(max, n));
}

// ─── Enum / whitelist ─────────────────────────────────────────────────────────

export function validateEnum<T extends string>(
  value: unknown,
  allowed: readonly T[],
  fieldName: string
): string | null {
  if (typeof value !== "string") return `${fieldName} must be a string`;
  if (!(allowed as readonly string[]).includes(value))
    return `${fieldName} must be one of: ${allowed.join(", ")}`;
  return null;
}

// ─── Text length ──────────────────────────────────────────────────────────────

export function validateTextLength(
  value: unknown,
  fieldName: string,
  maxLength: number
): string | null {
  if (typeof value !== "string") return `${fieldName} must be a string`;
  if (value.trim().length === 0) return `${fieldName} is required`;
  if (value.length > maxLength)
    return `${fieldName} must be at most ${maxLength} characters`;
  return null;
}
