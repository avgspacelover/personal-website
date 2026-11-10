import { writeFile } from "node:fs/promises";
import { buildBackup } from "../src/lib/backup";

async function main() {
  const output = process.argv[2];
  if (!output) throw new Error("Usage: npm run backup -- <file.pabackup>");
  const data = await buildBackup();
  await writeFile(output, data, { flag: "wx" });
  console.log(`Wrote ${output} (${data.length} bytes). Keep this file private: it includes agent and audit history.`);
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
