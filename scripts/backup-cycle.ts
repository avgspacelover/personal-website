import { spawnSync } from "node:child_process";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { gzipSync, gunzipSync } from "node:zlib";

async function main() {
const mode = process.argv[2];
if (mode === "worker") {
  const task = process.argv[3];
  const { getMigratedDb, vocation, mediaAsset, entry, vocationEntry, libraryItem, skill, education, redirectRule, resume, resumeItem, agentRun, auditLog, siteSettings, revision, accomplishment, accomplishmentVocation, stat } = await import("../src/db");
  const { buildBackup, restoreBackup } = await import("../src/lib/backup");
  const { getStorage } = await import("../src/lib/storage");
  const sharp = (await import("sharp")).default;
  const id = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
  const mediaKey = `${id(2)}.png`;
  const variantKey = `${id(2)}-480.webp`;
  const png = await sharp({ create: { width: 800, height: 600, channels: 4, background: { r: 20, g: 80, b: 180, alpha: 1 } } }).png().toBuffer();
  const variant = await sharp(png).resize({ width: 480 }).webp().toBuffer();
  const db = await getMigratedDb();
  (globalThis as unknown as { __db?: Promise<unknown> }).__db = Promise.resolve(db);
  const mediaRoot = path.resolve(process.env.MEDIA_DIR!);

  if (task === "seed") {
    await mkdir(mediaRoot, { recursive: true });
    await writeFile(path.join(mediaRoot, mediaKey), png);
    await writeFile(path.join(mediaRoot, variantKey), variant);
    await db.insert(vocation).values({ id: id(1), slug: "software", name: "Software", intro: "Published vocation", status: "published" });
    await db.insert(mediaAsset).values({ id: id(2), key: mediaKey, name: "sample.png", mime: "image/png", bytes: png.length, width: 800, height: 600, alt: "Sample image", variants: [480] });
    await db.insert(entry).values({ id: id(3), kind: "projects", slug: "sample", title: "Round-trip sample", organization: "Archive", seoImage: mediaKey, summary: "Public summary", period: "2026", tech: ["TypeScript"], body: [{ type: "paragraph", content: [{ type: "text", text: "Round-trip body" }] }], status: "published" });
    await db.insert(vocationEntry).values({ vocationId: id(1), entryId: id(3), isPrimary: true, position: 0 });
    await db.insert(libraryItem).values({ id: id(4), collection: "books", title: "Sample book", creator: "Writer", image: mediaKey, status: "published" });
    await db.insert(skill).values({ id: id(5), category: "Languages", items: ["TypeScript"] });
    await db.insert(education).values({ id: id(6), institution: "Sample University", program: "CS", period: "2020" });
    await db.insert(redirectRule).values({ id: id(7), fromPath: "/old-path", toPath: "/software/projects/sample" });
    await db.insert(resume).values({ id: id(8), name: "Sample resume", fullName: "Test Owner", contact: "test@example.com", headline: "Backup test", sections: ["experience", "skills", "education", "projects"], isPublic: true, status: "published" });
    await db.insert(resumeItem).values({ id: id(9), resumeId: id(8), section: "projects", entryId: id(3), bullets: ["A restored bullet"] });
    await db.insert(agentRun).values({ id: id(10), mode: "test", target: "sensitive target text", provider: "offline", resumeId: id(8), proposal: { private: "proposal" }, log: [{ private: "tool log" }] });
    await db.insert(auditLog).values({ id: id(11), actor: "test@example.com", action: "test.event", detail: "sensitive audit detail" });
    await db.insert(siteSettings).values({ id: "main", siteName: "Round-trip Site", tagline: "A restored tag" });
    await db.insert(revision).values({ id: id(12), entryId: id(3), actor: "test@example.com", note: "before test", snapshot: { title: "Earlier title" } });
    await db.insert(accomplishment).values({ id: id(13), title: "Sample milestone", year: "2026", status: "published" });
    await db.insert(accomplishmentVocation).values({ accomplishmentId: id(13), vocationId: id(1), position: 0 });
    await db.insert(stat).values({ id: id(14), label: "Sample count", value: "1", status: "published" });
    await writeFile(process.env.BACKUP_FILE!, await buildBackup());
    console.log("seeded source and wrote backup");
    process.exit(0);
  }

  if (task === "restore") {
    const compressed = await readFile(process.env.BACKUP_FILE!);
    const parsed = JSON.parse(gunzipSync(compressed).toString("utf8"));
    const assertTargetEmpty = async () => {
      const tables = [vocation, mediaAsset, entry, vocationEntry, libraryItem, skill, education, redirectRule, resume, resumeItem, agentRun, auditLog, siteSettings, revision, accomplishment, accomplishmentVocation, stat];
      for (const table of tables) if ((await db.select().from(table as never)).length) throw new Error("A rejected restore left database rows behind.");
      if (await import("node:fs/promises").then(({ access }) => access(mediaRoot).then(() => true).catch(() => false))) throw new Error("A rejected restore left a media directory behind.");
    };
    parsed.media[mediaKey] = "AAAA";
    let rejected = false;
    try { await restoreBackup(gzipSync(Buffer.from(JSON.stringify(parsed)))); } catch { rejected = true; }
    if (!rejected) throw new Error("Damaged media was accepted.");
    await assertTargetEmpty();

    const unsupported = JSON.parse(gunzipSync(compressed).toString("utf8"));
    unsupported.manifest.version = 2;
    let versionRejected = false;
    try { await restoreBackup(gzipSync(Buffer.from(JSON.stringify(unsupported)))); } catch { versionRejected = true; }
    if (!versionRejected) throw new Error("Unsupported archive version was accepted.");
    await assertTargetEmpty();

    const invalidReference = JSON.parse(gunzipSync(compressed).toString("utf8"));
    invalidReference.tables.vocation_entry[0].entryId = id(99);
    let referenceRejected = false;
    try { await restoreBackup(gzipSync(Buffer.from(JSON.stringify(invalidReference)))); } catch { referenceRejected = true; }
    if (!referenceRejected) throw new Error("Dangling reference was accepted.");
    await assertTargetEmpty();

    const invalidDatabase = JSON.parse(gunzipSync(compressed).toString("utf8"));
    invalidDatabase.tables.vocation.push({ ...invalidDatabase.tables.vocation[0], id: id(99) });
    invalidDatabase.manifest.tables.vocation = 2;
    let transactionRejected = false;
    try { await restoreBackup(gzipSync(Buffer.from(JSON.stringify(invalidDatabase)))); } catch { transactionRejected = true; }
    if (!transactionRejected) throw new Error("Invalid database values were accepted.");
    await assertTargetEmpty();

    const restored = await restoreBackup(compressed);
    const counts = {
      vocation: (await db.select().from(vocation)).length, media_asset: (await db.select().from(mediaAsset)).length,
      entry: (await db.select().from(entry)).length, vocation_entry: (await db.select().from(vocationEntry)).length,
      library_item: (await db.select().from(libraryItem)).length, skill: (await db.select().from(skill)).length,
      education: (await db.select().from(education)).length, redirect_rule: (await db.select().from(redirectRule)).length,
      resume: (await db.select().from(resume)).length, resume_item: (await db.select().from(resumeItem)).length,
      agent_run: (await db.select().from(agentRun)).length, audit_log: (await db.select().from(auditLog)).length,
      site_settings: (await db.select().from(siteSettings)).length, revision: (await db.select().from(revision)).length,
      accomplishment: (await db.select().from(accomplishment)).length, accomplishment_vocation: (await db.select().from(accomplishmentVocation)).length,
      stat: (await db.select().from(stat)).length,
    };
    for (const [name, count] of Object.entries(restored.tables)) if (counts[name as keyof typeof counts] !== count) throw new Error(`Restored row count mismatch for ${name}: archive=${count}, target=${counts[name as keyof typeof counts]}.`);
    const mediaBytes = await getStorage().get(mediaKey);
    if (!mediaBytes?.equals(png)) throw new Error("Media bytes do not match the source.");
    const restoredVariant = await getStorage().get(variantKey);
    if (!restoredVariant?.equals(variant)) throw new Error("Resized media variant did not restore.");
    const [restoredAgent] = await db.select().from(agentRun);
    const [restoredAudit] = await db.select().from(auditLog);
    const [restoredRevision] = await db.select().from(revision);
    const restoredLog = restoredAgent.log as Array<Record<string, unknown>>;
    const restoredSnapshot = restoredRevision.snapshot as Record<string, unknown>;
    if (restoredAgent.target !== "sensitive target text" || restoredLog[0].private !== "tool log" || restoredAudit.detail !== "sensitive audit detail" || restoredSnapshot.title !== "Earlier title") throw new Error("Sensitive agent, audit, or revision history did not round-trip.");
    const { getEntries, getLibrary, getSettings } = await import("../src/lib/queries");
    if (!(await getEntries()).some((e) => e.slug === "sample")) throw new Error("Published record is not visible through public queries.");
    if (!(await getLibrary("books")).some((b) => b.title === "Sample book")) throw new Error("Published library item is not visible through public queries.");
    if ((await getSettings()).siteName !== "Round-trip Site") throw new Error("Site settings were not restored.");
    const { buildResume } = await import("../src/lib/resume");
    const model = await buildResume(id(8));
    if (!model) throw new Error("Resume version did not restore.");
    const { renderResumePdf } = await import("../src/lib/resume-pdf");
    const pdf = await renderResumePdf(model);
    if (!pdf.buffer.subarray(0, 5).equals(Buffer.from("%PDF-"))) throw new Error("Restored resume did not render to PDF.");
    process.env.ADMIN_EMAILS = "test@example.com";
    const { allowed } = await import("../src/lib/allowlist");
    if (!allowed("test@example.com")) throw new Error("Configured admin email allowlist did not accept its owner.");
    let secondRestoreRejected = false;
    try { await restoreBackup(compressed); } catch { secondRestoreRejected = true; }
    if (!secondRestoreRejected || !(await getStorage().get(mediaKey))?.equals(png)) throw new Error("Populated target accepted another restore or lost its media.");
    console.log(JSON.stringify({ counts, mediaBytes: mediaBytes.length, variantBytes: restoredVariant.length, resumePdfBytes: pdf.buffer.length, checks: ["checksum rejection", "unsupported version rejection", "dangling reference rejection", "invalid database values roll back staged media and DB rows", "all table counts", "agent/audit/revision contents", "media originals and variants", "published content queries", "site settings", "resume PDF", "admin allowlist", "non-empty restore refusal"] }, null, 2));
    process.exit(0);
  }
  throw new Error(`Unknown worker task: ${task}`);
}

await mkdir(path.join(process.cwd(), ".data"), { recursive: true });
const temp = await mkdtemp(path.join(process.cwd(), ".data", "backup-check-"));
const source = path.join(temp, "source"), target = path.join(temp, "target"), archive = path.join(temp, "roundtrip.pabackup");
await mkdir(source, { recursive: true }); await mkdir(target, { recursive: true });
function run(task: string, root: string) {
  const pgliteDir = path.relative(process.cwd(), path.join(root, "db"));
  const worker = spawnSync(process.execPath, [path.join(process.cwd(), "node_modules/tsx/dist/cli.mjs"), process.argv[1], "worker", task], {
    cwd: process.cwd(), encoding: "utf8", stdio: "inherit",
    env: { ...process.env, DATABASE_URL: "", MIGRATE_DATABASE_URL: "", PGLITE_DIR: pgliteDir, MEDIA_DIR: path.join(root, "media"), BACKUP_FILE: archive },
  });
  if (worker.error) throw worker.error;
  if (worker.status !== 0) throw new Error(`Backup check worker '${task}' failed with exit ${worker.status}.`);
}
try {
  run("seed", source);
  run("restore", target);
  console.log("Full-fidelity backup round-trip passed.");
} finally {
  await rm(temp, { recursive: true, force: true });
}
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
