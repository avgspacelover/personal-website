import { createHash, randomUUID } from "node:crypto";
import { gzipSync, gunzipSync } from "node:zlib";
import { mkdir, readFile, readdir, rename, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { getTableColumns, sql } from "drizzle-orm";
import * as schema from "../db/schema";
import { getDb } from "../db";
import { KEY_RE, variantKeys } from "./storage";

export const BACKUP_FORMAT = "personal-archive-backup";
export const BACKUP_VERSION = 1;
const DATABASE_SCHEMA_VERSION = "0014_unknown_manta";
export const MAX_BACKUP_BYTES = 160 * 1024 * 1024;
const MAX_JSON_BYTES = 192 * 1024 * 1024;
const MAX_MEDIA_BYTES = 64 * 1024 * 1024;
const MAX_TABLE_BYTES = 88 * 1024 * 1024;

// Every persisted application table belongs here. Keep parent tables before dependent tables for restore.
const TABLES = [
  ["vocation", schema.vocation], ["media_asset", schema.mediaAsset], ["entry", schema.entry],
  ["vocation_entry", schema.vocationEntry], ["library_item", schema.libraryItem],
  ["skill", schema.skill], ["education", schema.education], ["redirect_rule", schema.redirectRule],
  ["resume", schema.resume], ["resume_item", schema.resumeItem], ["agent_run", schema.agentRun],
  ["audit_log", schema.auditLog], ["site_settings", schema.siteSettings], ["revision", schema.revision],
  ["accomplishment", schema.accomplishment], ["accomplishment_vocation", schema.accomplishmentVocation],
  ["stat", schema.stat],
] as const;
type TableName = typeof TABLES[number][0];
type JsonObject = Record<string, unknown>;
export class BackupError extends Error {}

const sha256 = (bytes: Buffer) => createHash("sha256").update(bytes).digest("hex");
const ownKeysAre = (value: JsonObject, expected: string[]) => {
  const got = Object.keys(value).sort(), want = [...expected].sort();
  return got.length === want.length && got.every((key, i) => key === want[i]);
};

export async function buildBackup(): Promise<Buffer> {
  if ((process.env.STORAGE_DRIVER ?? "local") !== "local") throw new BackupError("Portable backups currently support local MEDIA_DIR storage only.");
  const db = await getDb();
  const tables = await db.transaction(async (tx) => {
    const snapshot: Record<string, unknown[]> = {};
    for (const [name, table] of TABLES) snapshot[name] = await tx.select().from(table as never) as unknown[];
    return snapshot;
  }, { isolationLevel: "repeatable read", accessMode: "read only" });

  const mediaRoot = path.resolve(/*turbopackIgnore: true*/ process.env.MEDIA_DIR ?? ".data/media");
  const presentFiles: string[] = [];
  let mediaBytes = 0;
  try {
    for (const name of await readdir(/*turbopackIgnore: true*/ mediaRoot)) {
      const full = path.join(/*turbopackIgnore: true*/ mediaRoot, name), info = await stat(/*turbopackIgnore: true*/ full);
      if (info.isFile() && KEY_RE.test(name)) {
        mediaBytes += info.size;
        if (mediaBytes > MAX_MEDIA_BYTES) throw new BackupError("Local media exceeds the portable backup limit (64 MiB). Use the infrastructure backup procedure instead.");
        presentFiles.push(name);
      }
      else if (info.isDirectory()) throw new BackupError(`Unexpected directory in MEDIA_DIR: ${name}`);
    }
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }
  const required = new Set<string>();
  for (const row of tables.media_asset as Array<{ key: string; variants: number[] }>) {
    if (!KEY_RE.test(row.key)) throw new BackupError(`Invalid media key in database: ${row.key}`);
    required.add(row.key);
    for (const key of variantKeys(row.key, row.variants)) required.add(key);
  }
  const absent = [...required].filter((key) => !presentFiles.includes(key));
  if (absent.length) throw new BackupError(`MEDIA_DIR is missing ${absent.length} file(s) referenced by media metadata.`);

  let tableBytes = 0;
  for (const rows of Object.values(tables)) for (const row of rows) {
    tableBytes += Buffer.byteLength(JSON.stringify(row));
    if (tableBytes > MAX_TABLE_BYTES) throw new BackupError("Database rows exceed the portable backup limit (88 MiB). Use the infrastructure backup procedure instead.");
  }

  const media: Record<string, string> = {};
  const fileManifest: Array<{ key: string; bytes: number; sha256: string }> = [];
  for (const key of presentFiles.sort()) {
    const data = await readFile(/*turbopackIgnore: true*/ path.join(/*turbopackIgnore: true*/ mediaRoot, key));
    media[key] = data.toString("base64");
    fileManifest.push({ key, bytes: data.length, sha256: sha256(data) });
  }
  const manifest = {
    format: BACKUP_FORMAT, version: BACKUP_VERSION, databaseSchemaVersion: DATABASE_SCHEMA_VERSION, exportedAt: new Date().toISOString(),
    sensitiveHistoryIncluded: true,
    tables: Object.fromEntries(TABLES.map(([name]) => [name, tables[name].length])),
    files: fileManifest,
  };
  const json = Buffer.from(JSON.stringify({ manifest, tables, media }));
  if (json.length > MAX_JSON_BYTES) throw new BackupError("Backup exceeds the supported expanded size (192 MiB).");
  const compressed = gzipSync(json, { level: 6 });
  if (compressed.length > MAX_BACKUP_BYTES) throw new BackupError("Backup exceeds the supported compressed size (160 MiB).");
  return compressed;
}

type BackupManifest = { format: string; version: number; databaseSchemaVersion: string; exportedAt: string; sensitiveHistoryIncluded: boolean; tables: Record<TableName, number>; files: Array<{ key: string; bytes: number; sha256: string }> };
type ParsedBackup = { manifest: BackupManifest; tables: Record<TableName, JsonObject[]>; media: Map<string, Buffer> };
const DATE_COLUMNS: Partial<Record<TableName, string[]>> = {
  vocation: ["updatedAt"], entry: ["updatedAt"], library_item: ["updatedAt"], media_asset: ["createdAt"],
  redirect_rule: ["createdAt"], resume: ["updatedAt"], agent_run: ["createdAt"], audit_log: ["at"],
  site_settings: ["updatedAt"], revision: ["at"], accomplishment: ["updatedAt"], stat: ["updatedAt"],
};

function parseBackup(compressed: Buffer): ParsedBackup {
  if (!compressed.length || compressed.length > MAX_BACKUP_BYTES) throw new BackupError("Backup file is empty or exceeds 160 MiB.");
  let raw: Buffer;
  try { raw = gunzipSync(compressed, { maxOutputLength: MAX_JSON_BYTES }); }
  catch { throw new BackupError("File is not a supported, intact gzip backup, or exceeds the 192 MiB expanded limit."); }
  let archive: unknown;
  try { archive = JSON.parse(raw.toString("utf8")); }
  catch { throw new BackupError("Backup data is not valid JSON."); }
  if (!archive || typeof archive !== "object" || Array.isArray(archive)) throw new BackupError("Backup root must be an object.");
  const root = archive as JsonObject;
  if (!ownKeysAre(root, ["manifest", "tables", "media"])) throw new BackupError("Backup has missing or unsupported top-level fields.");
  if (!root.manifest || typeof root.manifest !== "object" || Array.isArray(root.manifest)) throw new BackupError("Backup manifest is missing.");
  const manifest = root.manifest as JsonObject;
  if (!ownKeysAre(manifest, ["format", "version", "databaseSchemaVersion", "exportedAt", "sensitiveHistoryIncluded", "tables", "files"]) || manifest.format !== BACKUP_FORMAT || manifest.version !== BACKUP_VERSION || manifest.databaseSchemaVersion !== DATABASE_SCHEMA_VERSION)
    throw new BackupError(`Unsupported backup format or database schema (expected ${BACKUP_FORMAT} v${BACKUP_VERSION}, schema ${DATABASE_SCHEMA_VERSION}).`);
  if (typeof manifest.exportedAt !== "string" || Number.isNaN(Date.parse(manifest.exportedAt))) throw new BackupError("Backup export timestamp is invalid.");
  if (manifest.sensitiveHistoryIncluded !== true) throw new BackupError("This restore requires agent and audit history; the archive declares that sensitive history is missing.");
  if (!manifest.tables || typeof manifest.tables !== "object" || Array.isArray(manifest.tables) || !ownKeysAre(manifest.tables as JsonObject, TABLES.map(([name]) => name)))
    throw new BackupError("Backup does not declare the complete supported table set.");
  if (!root.tables || typeof root.tables !== "object" || Array.isArray(root.tables) || !ownKeysAre(root.tables as JsonObject, TABLES.map(([name]) => name)))
    throw new BackupError("Backup data does not contain the complete supported table set.");
  if (!root.media || typeof root.media !== "object" || Array.isArray(root.media)) throw new BackupError("Backup media section is invalid.");
  if (!Array.isArray(manifest.files)) throw new BackupError("Backup file manifest is invalid.");

  const tables = root.tables as Record<TableName, JsonObject[]>;
  for (const [name, table] of TABLES) {
    if (!Array.isArray(tables[name]) || (manifest.tables as JsonObject)[name] !== tables[name].length) throw new BackupError(`Table count mismatch for ${name}.`);
    const columnMap = getTableColumns(table as never) as Record<string, { dataType: string; notNull: boolean; enumValues?: string[]; baseColumn?: { dataType: string; enumValues?: string[] }; columnType?: string }>;
    const columns = Object.keys(columnMap);
    for (const row of tables[name]) {
      if (!row || typeof row !== "object" || Array.isArray(row) || !ownKeysAre(row, columns)) throw new BackupError(`A row in ${name} has missing or unsupported fields.`);
      for (const [key, column] of Object.entries(columnMap)) {
        const value = row[key];
        if (value === null) { if (column.notNull) throw new BackupError(`Null value in required field ${name}.${key}.`); else continue; }
        if (column.dataType === "date") {
          if (typeof value !== "string" || Number.isNaN(Date.parse(value))) throw new BackupError(`Invalid timestamp in ${name}.${key}.`);
        } else if (column.dataType === "array") {
          if (!Array.isArray(value)) throw new BackupError(`Invalid array in ${name}.${key}.`);
          const base = column.baseColumn;
          if (base?.dataType === "string" && value.some((item) => typeof item !== "string" || (base.enumValues?.length && !base.enumValues.includes(item)))) throw new BackupError(`Invalid array item in ${name}.${key}.`);
          if (base?.dataType === "number" && value.some((item) => typeof item !== "number" || !Number.isSafeInteger(item))) throw new BackupError(`Invalid array item in ${name}.${key}.`);
        } else if (column.dataType === "string") {
          if (typeof value !== "string" || (column.enumValues?.length && !column.enumValues.includes(value))) throw new BackupError(`Invalid value in ${name}.${key}.`);
          if (column.columnType === "PgUUID" && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)) throw new BackupError(`Invalid identifier in ${name}.${key}.`);
        } else if (column.dataType === "number") {
          if (typeof value !== "number" || !Number.isSafeInteger(value)) throw new BackupError(`Invalid number in ${name}.${key}.`);
        } else if (column.dataType === "boolean" && typeof value !== "boolean") throw new BackupError(`Invalid flag in ${name}.${key}.`);
      }
    }
  }

  const media = new Map<string, Buffer>();
  const sourceMedia = root.media as JsonObject;
  if (manifest.files.length !== Object.keys(sourceMedia).length) throw new BackupError("Media file count does not match the manifest.");
  let totalMediaBytes = 0;
  for (const item of manifest.files) {
    if (!item || typeof item !== "object" || Array.isArray(item) || !ownKeysAre(item as JsonObject, ["key", "bytes", "sha256"])) throw new BackupError("Invalid media file manifest entry.");
    const { key, bytes, sha256: digest } = item as { key: unknown; bytes: unknown; sha256: unknown };
    if (typeof key !== "string" || !KEY_RE.test(key) || media.has(key) || typeof bytes !== "number" || !Number.isSafeInteger(bytes) || bytes < 0 || typeof digest !== "string" || !/^[a-f0-9]{64}$/.test(digest)) throw new BackupError("Invalid media file manifest entry.");
    const encoded = sourceMedia[key];
    if (typeof encoded !== "string" || !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(encoded)) throw new BackupError(`Invalid encoded media data for ${key}.`);
    const data = Buffer.from(encoded, "base64");
    if (data.length !== bytes || sha256(data) !== digest) throw new BackupError(`Checksum or size validation failed for ${key}.`);
    totalMediaBytes += data.length;
    if (totalMediaBytes > MAX_MEDIA_BYTES) throw new BackupError("Archive media exceeds the 64 MiB restore limit.");
    media.set(key, data);
  }
  validateReferences(tables, media);
  return { manifest: manifest as BackupManifest, tables, media };
}

function validateReferences(t: Record<TableName, JsonObject[]>, files: Map<string, Buffer>) {
  const ids = (table: TableName, field: string) => new Set(t[table].map((r) => r[field]).filter((x): x is string => typeof x === "string"));
  const vocations = ids("vocation", "id"), entries = ids("entry", "id"), media = ids("media_asset", "key");
  const skills = ids("skill", "id"), education = ids("education", "id"), resumes = ids("resume", "id"), accomplishments = ids("accomplishment", "id");
  const requireRef = (table: TableName, field: string, target: Set<string>, nullable = false) => {
    for (const row of t[table]) if (row[field] == null ? !nullable : typeof row[field] !== "string" || !target.has(row[field] as string)) throw new BackupError(`Invalid reference ${table}.${field}.`);
  };
  requireRef("entry", "seoImage", media, true); requireRef("library_item", "image", media, true);
  requireRef("vocation_entry", "vocationId", vocations); requireRef("vocation_entry", "entryId", entries);
  requireRef("resume_item", "resumeId", resumes); requireRef("resume_item", "entryId", entries, true);
  requireRef("resume_item", "skillId", skills, true); requireRef("resume_item", "educationId", education, true);
  requireRef("agent_run", "resumeId", resumes, true); requireRef("revision", "entryId", entries);
  requireRef("accomplishment_vocation", "accomplishmentId", accomplishments); requireRef("accomplishment_vocation", "vocationId", vocations);
  const needed = new Set<string>();
  for (const row of t.media_asset as Array<{ key: string; variants: number[]; bytes: number }>) {
    const asset = row as typeof row & { mime?: string; width?: number; height?: number };
    const ext = row.key.split(".").at(-1);
    const expectedMime = ext === "jpg" ? "image/jpeg" : ext ? `image/${ext}` : "";
    if (!KEY_RE.test(row.key) || asset.mime !== expectedMime || !Number.isInteger(row.bytes) || row.bytes <= 0 || !Number.isInteger(asset.width) || asset.width! <= 0 || !Number.isInteger(asset.height) || asset.height! <= 0 || !Array.isArray(row.variants) || new Set(row.variants).size !== row.variants.length || row.variants.some((w) => ![480, 800, 1200, 1600].includes(w))) throw new BackupError("Invalid media metadata.");
    needed.add(row.key);
    for (const key of variantKeys(row.key, row.variants)) needed.add(key);
    const original = files.get(row.key);
    if (!original || original.length !== row.bytes) throw new BackupError(`Media metadata has no matching original file for ${row.key}.`);
  }
  for (const key of needed) if (!files.has(key)) throw new BackupError(`Media metadata references missing file ${key}.`);
}

async function assertEmpty(db: Awaited<ReturnType<typeof getDb>>) {
  for (const [name, table] of TABLES) {
    if (name === "audit_log") continue;
    const [row] = await db.select({ count: sql<number>`count(*)::int` }).from(table as never) as Array<{ count: number }>;
    if (Number(row.count) !== 0) throw new BackupError(`Restore refused: table ${name} is not empty.`);
  }
  // Signing in to reach the restore page writes these rows. Any other audit event means this is not a fresh target.
  const existingAudit = await db.select({ action: schema.auditLog.action }).from(schema.auditLog);
  if (existingAudit.some((r) => !r.action.startsWith("signin."))) throw new BackupError("Restore refused: the target already has non-sign-in audit history.");
}

export async function restoreBackup(compressed: Buffer) {
  const parsed = parseBackup(compressed);
  if ((process.env.STORAGE_DRIVER ?? "local") !== "local") throw new BackupError("Restore currently supports local MEDIA_DIR storage only.");
  const mediaRoot = path.resolve(/*turbopackIgnore: true*/ process.env.MEDIA_DIR ?? ".data/media");
  const parent = path.dirname(mediaRoot);
  await mkdir(/*turbopackIgnore: true*/ parent, { recursive: true });
  let hadEmptyDir = false;
  try {
    const names = await readdir(/*turbopackIgnore: true*/ mediaRoot);
    if (names.length) throw new BackupError("Restore refused: MEDIA_DIR is not empty.");
    hadEmptyDir = true;
  } catch (error) { if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error; }

  const stage = `${mediaRoot}.restore-${randomUUID()}`;
  let installedMedia = false;
  try {
    await mkdir(/*turbopackIgnore: true*/ stage, { recursive: false });
    for (const [key, data] of parsed.media) await writeFile(/*turbopackIgnore: true*/ path.join(/*turbopackIgnore: true*/ stage, key), data, { flag: "wx" });
    if (hadEmptyDir) await rm(/*turbopackIgnore: true*/ mediaRoot, { recursive: false });
    await rename(/*turbopackIgnore: true*/ stage, mediaRoot);
    installedMedia = true;

    const db = await getDb();
    await db.transaction(async (tx) => {
      await tx.execute(sql.raw(`LOCK TABLE ${TABLES.map(([name]) => `\"${name}\"`).join(", ")} IN ACCESS EXCLUSIVE MODE`));
      await assertEmpty(tx as never);
      await tx.delete(schema.auditLog);
      for (const [name, table] of TABLES) {
        const rows = parsed.tables[name].map((row) => {
          const restored = { ...row };
          for (const key of DATE_COLUMNS[name] ?? []) restored[key] = new Date(restored[key] as string);
          return restored;
        });
        if (rows.length) await tx.insert(table as never).values(rows as never);
      }
    });
    return { tables: parsed.manifest.tables, files: parsed.media.size };
  } catch (error) {
    if (installedMedia) await rm(/*turbopackIgnore: true*/ mediaRoot, { recursive: true, force: true }).catch(() => {});
    if (hadEmptyDir) await mkdir(/*turbopackIgnore: true*/ mediaRoot, { recursive: true }).catch(() => {});
    throw error;
  } finally { await rm(/*turbopackIgnore: true*/ stage, { recursive: true, force: true }).catch(() => {}); }
}

export async function readBounded(request: Request): Promise<Buffer> {
  const length = Number(request.headers.get("content-length") ?? 0);
  if (length > MAX_BACKUP_BYTES) throw new BackupError("Backup exceeds the 160 MiB upload limit.");
  if (!request.body) throw new BackupError("Upload is empty.");
  const reader = request.body.getReader(), chunks: Buffer[] = [];
  let total = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > MAX_BACKUP_BYTES) { await reader.cancel(); throw new BackupError("Backup exceeds the 160 MiB upload limit."); }
      chunks.push(Buffer.from(value));
    }
  } finally { reader.releaseLock(); }
  return Buffer.concat(chunks, total);
}
