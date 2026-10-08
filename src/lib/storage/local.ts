import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import type { MediaStorage } from "./index";
import { KEY_RE } from "./index";

// Persist MEDIA_DIR on the VPS (back it up with the database).
const root = () => path.resolve(process.env.MEDIA_DIR ?? ".data/media");
const file = (key: string) => { if (!KEY_RE.test(key)) throw new Error("Invalid storage key"); return path.join(root(), key); };

export const localStorageDriver: MediaStorage = {
  async put(key, data) { await mkdir(root(), { recursive: true }); await writeFile(file(key), data, { flag: "wx" }); },
  async get(key) { try { return await readFile(file(key)); } catch (e) { if ((e as NodeJS.ErrnoException).code === "ENOENT") return null; throw e; } },
  async delete(keys) { await Promise.all(keys.map((k) => rm(file(k), { force: true }))); },
};
