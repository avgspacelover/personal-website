import { readFile } from "node:fs/promises";
import { restoreBackup } from "../src/lib/backup";

async function main() {
  const input = process.argv[2];
  if (!input) throw new Error("Usage: npm run restore -- <file.pabackup>");
  const result = await restoreBackup(await readFile(input));
  console.log(`Restored ${Object.values(result.tables).reduce((a, b) => a + b, 0)} rows across ${Object.keys(result.tables).length} tables and ${result.files} media files.`);
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
