import { count } from "drizzle-orm";
import { getDb, entry, vocation, libraryItem } from "../db";
export async function getCounts() {
  const db = await getDb();
  const [e, v, l] = await Promise.all([
    db.select({ kind: entry.kind, status: entry.status, n: count() }).from(entry).groupBy(entry.kind, entry.status),
    db.select({ status: vocation.status, n: count() }).from(vocation).groupBy(vocation.status),
    db.select({ collection: libraryItem.collection, status: libraryItem.status, n: count() }).from(libraryItem).groupBy(libraryItem.collection, libraryItem.status),
  ]);
  return { e, v, l };
}
