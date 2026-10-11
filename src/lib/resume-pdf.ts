import { existsSync } from "node:fs";
import path from "node:path";
import PDFDocument from "pdfkit";
import { onceDeedy } from "./resume-pdf-deedy";
import { linkOf } from "./pdf-util";
import { TEMPLATES, type ResumeModel, type RItem } from "./resume";

// Layout modelled on the widely used "Jake's Resume" template: US Letter, 0.5in margins, centred small-caps name, one-line contact row,
// small-caps section headings over a thin rule, two-line bold/italic entry headers with right-aligned dates, compact bullets,
// and unbulleted "Category: items" skill lines. Computer Modern (CMU Serif) like the LaTeX original, falling back to Times.
// Output is real, selectable, ATS-readable text (no images).
const LEFT = 36, W = 612 - 72, TOP = 36, BOTTOM = 792 - 36, ASC = 0.75;
type F = "r" | "b" | "i";
type Run = { t: string; size: number; f: F };

function fontFiles() {
  const dir = path.join(process.cwd(), "node_modules", "computer-modern", "fonts");
  const f = { r: path.join(dir, "cmu-serif-500-roman.ttf"), b: path.join(dir, "cmu-serif-700-roman.ttf"), i: path.join(dir, "cmu-serif-500-italic.ttf") };
  return Object.values(f).every(existsSync) ? f : null;
}
function once(m: ResumeModel, k: number): Promise<{ buffer: Buffer; pages: number }> {
  return new Promise((resolve, reject) => {
    const title = m.fullName || m.name;
    const doc = new PDFDocument({ size: "LETTER", margin: 36, bufferPages: true, info: { Title: `${title} - Resume`, Subject: "Resume", ...(m.fullName ? { Author: m.fullName } : {}) } }); // PDFKit crashes on undefined info values
    const chunks: Buffer[] = [];
    let pages = 1;
    doc.on("data", (c: Buffer) => chunks.push(c)); doc.on("error", reject); doc.on("end", () => resolve({ buffer: Buffer.concat(chunks), pages }));
    const files = fontFiles();
    const font = files ? { r: "R", b: "B", i: "I" } : { r: "Times-Roman", b: "Times-Bold", i: "Times-Italic" };
    if (files) { doc.registerFont("R", files.r); doc.registerFont("B", files.b); doc.registerFont("I", files.i); }
    const sz = { name: 25 * k, head: 12.5 * k, body: 10.5 * k, small: 9.5 * k };
    let y = TOP;
    const width = (runs: Run[]) => runs.reduce((a, r) => a + doc.font(font[r.f]).fontSize(r.size).widthOfString(r.t), 0);
    const draw = (runs: Run[], x: number, yy: number) => {   // runs share a baseline even when sizes differ (small caps)
      const max = Math.max(...runs.map((r) => r.size));
      for (const r of runs) { doc.font(font[r.f]).fontSize(r.size).fillColor("#000").text(r.t, x, yy + (max - r.size) * ASC, { lineBreak: false }); x += doc.widthOfString(r.t); }
    };
    const smallCaps = (s: string, size: number, f: F): Run[] => {
      const out: Run[] = [];
      for (const ch of s) { const low = ch !== ch.toUpperCase(), sc = low ? size * 0.8 : size, t = low ? ch.toUpperCase() : ch, last = out[out.length - 1]; if (last && last.size === sc) last.t += t; else out.push({ t, size: sc, f }); }
      return out;
    };
    const R = (t: string | undefined, f: F, size: number): Run[] => (t ? [{ t, size, f }] : []);
    const ensure = (h: number) => { if (y + h > BOTTOM) { doc.addPage(); y = TOP; } };
    const lr = (l: Run[], r: Run[], size: number) => { draw(l, LEFT, y); if (r.length) draw(r, LEFT + W - width(r), y); y += size * 1.2; };

    // header
    const nameRuns = smallCaps(title, sz.name, "b");
    draw(nameRuns, LEFT + (W - width(nameRuns)) / 2, y); y += sz.name * 1.2;
    const items = m.contact.split("|").map((s) => s.trim()).filter(Boolean);
    if (items.length) {
      doc.font(font.r).fontSize(sz.small);
      const sep = doc.widthOfString(" | "), ws = items.map((s) => doc.widthOfString(s)), total = ws.reduce((a, b) => a + b, 0) + sep * (items.length - 1);
      if (total <= W) {
        let x = LEFT + (W - total) / 2;
        items.forEach((s, n) => {
          const href = linkOf(s);
          doc.fillColor("#000").text(s, x, y, { lineBreak: false });
          if (href) { doc.lineWidth(0.5).strokeColor("#000").moveTo(x, y + sz.small * 1.02).lineTo(x + ws[n], y + sz.small * 1.02).stroke(); doc.link(x, y, ws[n], sz.small * 1.2, href); }
          x += ws[n];
          if (n < items.length - 1) { doc.text(" | ", x, y, { lineBreak: false }); x += sep; }
        });
        y += sz.small * 1.25;
      } else { doc.text(items.join(" | "), LEFT, y, { width: W, align: "center" }); y = doc.y; }
    }
    if (m.headline) { doc.font(font.i).fontSize(sz.small).text(m.headline, LEFT, y + 2 * k, { width: W, align: "center" }); y = doc.y; }

    const heading = (t: string) => {
      ensure(sz.head * 1.2 + 40 * k); y += 5 * k;
      draw(smallCaps(t, sz.head, "r"), LEFT, y); y += sz.head * 1.2;
      doc.lineWidth(0.5).strokeColor("#000").moveTo(LEFT, y).lineTo(LEFT + W, y).stroke(); y += 3.5 * k;
    };
    const bullets = (list: string[]) => {
      for (const b of list) {
        const tw = W - 30;
        doc.font(font.r).fontSize(sz.small);
        ensure(doc.heightOfString(b, { width: tw }));
        doc.fillColor("#000").text("•", LEFT + 14, y, { lineBreak: false }); doc.text(b, LEFT + 26, y, { width: tw }); y = doc.y + 1.3 * k;
      }
    };
    const entry = (key: string, it: RItem) => {
      doc.font(font.r).fontSize(sz.small);
      ensure(sz.body * 1.2 + sz.small * 1.2 + (it.bullets[0] ? doc.heightOfString(it.bullets[0], { width: W - 30 }) : 0));
      if (key === "projects") lr([...R(it.title, "b", sz.body), ...(it.meta ? [{ t: " | ", size: sz.body, f: "r" as F }, ...R(it.meta, "i", sz.small)] : [])], R(it.period, "r", sz.body), sz.body);
      else if (key === "education") { lr(R(it.title, "b", sz.body), R(it.location, "r", sz.body), sz.body); if (it.sub || it.period) lr(R(it.sub, "i", sz.small), R(it.period, "i", sz.small), sz.small); }
      else { lr(R(it.title, "b", sz.body), R(it.period, "r", sz.body), sz.body); if (it.sub || it.location) lr(R(it.sub, "i", sz.small), R(it.location, "i", sz.small), sz.small); }
      bullets(it.bullets); y += 3 * k;
    };
    for (const s of m.sections) {
      heading(s.title);
      if (s.key === "skills") for (const it of s.items) {
        ensure(sz.small * 1.4);
        doc.font(font.b).fontSize(sz.small).fillColor("#000").text(`${it.title}: `, LEFT + 10, y, { continued: true, width: W - 10 });
        doc.font(font.r).text(it.sub ?? "", { width: W - 10 }); y = doc.y + 1.5 * k;
      } else s.items.forEach((it) => entry(s.key, it));
    }
    pages = doc.bufferedPageRange().count;
    doc.end();
  });
}

// "One page" shrinks type and spacing in small steps until it fits; if it still spills at the smallest readable size, `fits` is false.
// `template` overrides the version's own template so the same resume can be downloaded in either format.
export async function renderResumePdf(m: ResumeModel, template?: string) {
  const t = (TEMPLATES as readonly string[]).includes(template ?? "") ? template : m.template;
  const draw = t === "deedy" ? onceDeedy : once;
  const scales = m.pages === "one" ? [1, 0.96, 0.92, 0.88, 0.84, 0.8] : [1];
  let last = { buffer: Buffer.alloc(0), pages: 0 }, scale = 1;
  for (scale of scales) { last = await draw(m, scale); if (last.pages === 1) break; }
  return { ...last, scale, fits: m.pages !== "one" || last.pages === 1, template: t };
}
