import { randomUUID } from "node:crypto";
import sharp from "sharp";
import { getDb, mediaAsset } from "../db";
import { getStorage } from "./storage";

export const MAX_BYTES = 5 * 1024 * 1024;
const WIDTHS = [480, 800, 1200, 1600];
const EXT: Record<string, string> = { jpeg: "jpg", png: "png", webp: "webp" };
export class MediaError extends Error { constructor(public status: number, message: string) { super(message); } }

export const variantKeys = (key: string, widths: number[]) => widths.map((w) => `${key.replace(/\.\w+$/, "")}-${w}.webp`);

// Validates by decoding (never trusts the client MIME), applies EXIF orientation, strips metadata (incl. GPS), stores original + WebP variants.
export async function ingestImage(input: Buffer, name: string, alt: string) {
  if (input.length > MAX_BYTES) throw new MediaError(413, "File exceeds 5 MB.");
  const opts = { limitInputPixels: 50_000_000 };
  let format: string | undefined;
  try { format = (await sharp(input, opts).metadata()).format; } catch { throw new MediaError(415, "Not a valid image."); }
  if (!format || !EXT[format]) throw new MediaError(415, "Only JPEG, PNG and WebP are accepted.");
  const { data, info } = await sharp(input, opts).rotate().toFormat(format as "jpeg" | "png" | "webp").toBuffer({ resolveWithObject: true });
  const id = randomUUID(), key = `${id}.${EXT[format]}`, storage = getStorage();
  const widths = WIDTHS.filter((w) => w < info.width);
  const written: string[] = [];
  try {
    await storage.put(key, data); written.push(key);
    for (const [i, w] of widths.entries()) {
      const v = await sharp(input, opts).rotate().resize({ width: w }).webp({ quality: 80 }).toBuffer();
      const vk = variantKeys(key, [w])[0]; await storage.put(vk, v); written.push(vk); void i;
    }
    const [row] = await (await getDb()).insert(mediaAsset).values({ key, name: name.slice(0, 200), mime: `image/${format}`, bytes: data.length, width: info.width, height: info.height, alt: alt.slice(0, 500), variants: widths }).returning();
    return row;
  } catch (e) { await storage.delete(written).catch(() => {}); throw e; }
}
