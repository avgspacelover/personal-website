import { requireAdmin } from "@/lib/auth";
import { BackupControls } from "./BackupControls";

export const metadata = { title: "Backup and restore", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";
export default async function BackupPage() {
  await requireAdmin();
  return <><h1>Backup and restore</h1><BackupControls /></>;
}
