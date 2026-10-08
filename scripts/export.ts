import { writeFileSync } from "node:fs";
import { buildExport } from "../src/lib/export";
// npm run export -- backups/archive.json   (prints to stdout without a path)
buildExport().then((d) => { const j = JSON.stringify(d, null, 2); const out = process.argv[2]; if (out) { writeFileSync(out, j); console.error(`wrote ${out}`); } else console.log(j); process.exit(0); });
