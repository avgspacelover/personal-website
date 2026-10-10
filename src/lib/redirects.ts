import { eq, like, or } from "drizzle-orm";
import { getDb, redirectRule, type DB } from "../db";
import { entryHref } from "./content";
import { getEntry, getVocations } from "./queries";

// Record old -> new paths. Keeps the table free of chains and loops:
// the new live path stops redirecting, and anything that pointed at the old path now points at the new one.
export async function addRedirects(tx: DB, pairs: [from: string, to: string][]) {
  for (const [from, to] of pairs) {
    if (from === to) continue;
    await tx.delete(redirectRule).where(eq(redirectRule.fromPath, to));
    await tx.update(redirectRule).set({ toPath: to }).where(eq(redirectRule.toPath, from));
    await tx.insert(redirectRule).values({ fromPath: from, toPath: to }).onConflictDoUpdate({ target: redirectRule.fromPath, set: { toPath: to } });
  }
}
export async function redirectFor(path: string) {
  const r = await (await getDb()).select({ to: redirectRule.toPath }).from(redirectRule).where(eq(redirectRule.fromPath, path)).limit(1);
  const to = r[0]?.to;
  if (!to) return null;
  // Never reveal where a record moved if it is no longer public (a renamed-then-unpublished record would leak its new slug).
  const parts = to.split("/").filter(Boolean);
  if (parts.length === 1) return (await getVocations()).some((v) => v.slug === parts[0]) ? to : null;
  const e = parts.length === 3 ? await getEntry(parts[1], parts[2]) : undefined;
  return e && entryHref(e) === to ? to : null;
}

// Deleting a record or vocation: drop rules that would only lead to a 404.
export async function removeRedirectsTo(db: DB, path: string, prefix = false) {
  await db.delete(redirectRule).where(prefix ? or(eq(redirectRule.toPath, path), like(redirectRule.toPath, `${path}/%`)) : eq(redirectRule.toPath, path));
}
