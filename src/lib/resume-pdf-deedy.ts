import { existsSync } from "node:fs";
import path from "node:path";
import PDFDocument from "pdfkit";
import { linkOf } from "./pdf-util";
import type { ResumeModel, RItem } from "./resume";

// Two-column layout modelled on the popular "Deedy CV": US Letter, 0.4in margins, a large light centred name over a grey contact line and a
// full-width rule, then an asymmetric two-column body (33% sidebar: Education, Skills; 66% main: Experience, Projects). Section headings are
// light grey uppercase; entries are bold uppercase with an italic role/tech, a grey date | place line, and compact bullets.
// Fonts: Lato (body, light) with Raleway Medium for the contact line (as in the original), falling back to Helvetica. Text is real and selectable.
const M = 28.8, PW = 612, PH = 792, TW = PW - 2 * M, TOP = M, BOTTOM = PH - M;
const COL = { L: { x: M, w: TW * 0.33 - 6 }, R: { x: M + TW * 0.34, w: TW * 0.66 } } as const;
const C = { primary: "#2b2b2b", heading: "#6A6A6A", sub: "#333333" };
type Col = "L" | "R";

function fontFiles() {
  const f = (pkg: string, file: string) => path.join(process.cwd(), "node_modules", "@fontsource", pkg, "files", file);
  const set = { light: f("lato", "lato-latin-300-normal.woff"), bold: f("lato", "lato-latin-700-normal.woff"), ital: f("lato", "lato-latin-300-italic.woff"), contact: f("raleway", "raleway-latin-500-normal.woff") };
  return Object.values(set).every(existsSync) ? set : null;
}

export function onceDeedy(m: ResumeModel, k: number): Promise<{ buffer: Buffer; pages: number }> {
  return new Promise((resolve, reject) => {
    const title = m.fullName || m.name;
    const doc = new PDFDocument({ size: "LETTER", margin: M, bufferPages: true, info: { Title: `${title} - Resume`, Subject: "Resume", ...(m.fullName ? { Author: m.fullName } : {}) } });
    const chunks: Buffer[] = [];
    let pages = 1;
    doc.on("data", (c: Buffer) => chunks.push(c)); doc.on("error", reject); doc.on("end", () => resolve({ buffer: Buffer.concat(chunks), pages }));
    const files = fontFiles();
    const F = files ? { light: "L", bold: "B", ital: "I", contact: "C" } : { light: "Helvetica", bold: "Helvetica-Bold", ital: "Helvetica-Oblique", contact: "Helvetica" };
    if (files) { doc.registerFont("L", files.light); doc.registerFont("B", files.bold); doc.registerFont("I", files.ital); doc.registerFont("C", files.contact); }
    const sz = { name: 38 * k, contact: 10.5 * k, head: 15 * k, sub: 10.5 * k, body: 9.5 * k, small: 8.8 * k };

    // ---- header (page 1, full width)
    let nameSize = sz.name;
    doc.font(F.light);
    while (nameSize > 18 && doc.fontSize(nameSize).widthOfString(title) > TW) nameSize -= 1;
    doc.fillColor(C.primary).fontSize(nameSize).text(title, M + (TW - doc.widthOfString(title)) / 2, TOP, { lineBreak: false });
    let hy = TOP + nameSize * 1.18;
    const items = m.contact.split("|").map((s) => s.trim()).filter(Boolean);
    if (items.length) {
      doc.font(F.contact).fontSize(sz.contact).fillColor(C.heading);
      const sep = doc.widthOfString("  |  "), ws = items.map((s) => doc.widthOfString(s)), total = ws.reduce((a, b) => a + b, 0) + sep * (items.length - 1);
      if (total <= TW) {
        let x = M + (TW - total) / 2;
        items.forEach((s, n) => {
          doc.text(s, x, hy, { lineBreak: false });
          const href = linkOf(s); if (href) doc.link(x, hy, ws[n], sz.contact * 1.2, href);
          x += ws[n];
          if (n < items.length - 1) { doc.text("  |  ", x, hy, { lineBreak: false }); x += sep; }
        });
        hy += sz.contact * 1.45;
      } else { doc.text(items.join("  |  "), M, hy, { width: TW, align: "center" }); hy = doc.y + 2; }
    }
    if (m.headline) { doc.font(F.ital).fontSize(sz.small).fillColor(C.sub).text(m.headline, M, hy + 1, { width: TW, align: "center" }); hy = doc.y; }
    hy += 4 * k;
    doc.lineWidth(0.4).strokeColor(C.heading).moveTo(0, hy).lineTo(PW, hy).stroke(); // the original's rule runs edge to edge
    hy += 12 * k;

    // ---- columns: independent flow, shared pages
    const st = { L: { page: 0, y: hy }, R: { page: 0, y: hy } };
    const go = (c: Col) => doc.switchToPage(st[c].page);
    const ensure = (c: Col, h: number) => {
      if (st[c].y + h > BOTTOM) { st[c].page++; if (st[c].page >= doc.bufferedPageRange().count) doc.addPage(); st[c].y = TOP; }
      go(c);
    };
    const text = (c: Col, s: string, f: keyof typeof F, size: number, color: string, o: { indent?: number; gap?: number; upper?: boolean; need?: number } = {}) => {
      const x = COL[c].x + (o.indent ?? 0), w = COL[c].w - (o.indent ?? 0), t = o.upper ? s.toUpperCase() : s;
      go(c); doc.font(F[f]).fontSize(size);
      ensure(c, doc.heightOfString(t, { width: w }) + (o.need ?? 0));
      doc.font(F[f]).fontSize(size).fillColor(color).text(t, x, st[c].y, { width: w });
      st[c].y = doc.y + (o.gap ?? 0);
    };
    const heading = (c: Col, t: string) => text(c, t, "light", sz.head, C.heading, { upper: true, gap: 3 * k, need: 46 * k });
    const bullets = (c: Col, list: string[]) => {
      for (const b of list) {
        go(c); doc.font(F.light).fontSize(sz.body);
        const w = COL[c].w - 10;
        ensure(c, doc.heightOfString(b, { width: w }));
        doc.font(F.light).fontSize(sz.body).fillColor(C.primary).text("•", COL[c].x + 1, st[c].y, { lineBreak: false });
        doc.text(b, COL[c].x + 10, st[c].y, { width: w });
        st[c].y = doc.y + 1.6 * k;
      }
    };
    // "BOLD UPPERCASE | italic role" on one wrapping line (the original's \runsubsection + \descript)
    const runHead = (c: Col, strong: string, role: string | undefined, need: number) => {
      const w = COL[c].w, t1 = strong.toUpperCase();
      go(c); doc.font(F.bold).fontSize(sz.sub);
      ensure(c, doc.heightOfString(t1 + (role ? ` | ${role}` : ""), { width: w }) + need);
      doc.font(F.bold).fontSize(sz.sub).fillColor(C.sub).text(t1, COL[c].x, st[c].y, { width: w, continued: !!role });
      if (role) doc.font(F.ital).fontSize(sz.body).fillColor(C.sub).text(` | ${role}`, { width: w });
      st[c].y = doc.y + 0.5 * k;
    };
    const place = (c: Col, ...parts: (string | undefined)[]) => { const s = parts.filter(Boolean).join(" | "); if (s) text(c, s, "light", sz.small, C.heading, { gap: 2 * k }); };

    for (const s of m.sections) {
      const c: Col = s.key === "education" || s.key === "skills" ? "L" : "R";
      heading(c, s.title);
      for (const it of s.items as RItem[]) {
        if (s.key === "skills") {
          text(c, it.title, "bold", sz.sub, C.sub, { upper: true, need: sz.body * 1.3 });
          text(c, (it.sub ?? "").split(",").map((x) => x.trim()).filter(Boolean).join("  •  "), "light", sz.body, C.primary, { gap: 5 * k });
        } else if (s.key === "education") {
          runHead(c, it.title, undefined, sz.small * 1.4);
          if (it.sub) text(c, it.sub, "ital", sz.body, C.sub);
          place(c, it.period, it.location); st[c].y += 4 * k;
        } else if (s.key === "projects") {
          runHead(c, it.title, it.meta, sz.small * 1.4 + (it.bullets[0] ? sz.body * 1.4 : 0));
          place(c, it.period); bullets(c, it.bullets); st[c].y += 5 * k;
        } else {
          runHead(c, it.sub || it.title, it.sub ? it.title : undefined, sz.small * 1.4 + (it.bullets[0] ? sz.body * 1.4 : 0));
          place(c, it.period, it.location); bullets(c, it.bullets); st[c].y += 5 * k;
        }
      }
      st[c].y += 4 * k;
    }
    pages = doc.bufferedPageRange().count;
    doc.end();
  });
}
