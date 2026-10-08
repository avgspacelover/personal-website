// Only these Google accounts may use the admin. Comma-separated in ADMIN_EMAILS.
export function allowed(email?: string | null) {
  const list = (process.env.ADMIN_EMAILS ?? "").split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
  return !!email && list.includes(email.trim().toLowerCase());
}
