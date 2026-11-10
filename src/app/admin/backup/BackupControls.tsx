"use client";

import { useState } from "react";

export function BackupControls() {
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  async function restore(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const file = (new FormData(form).get("archive")) as File;
    if (!file || !form.reportValidity()) return;
    setBusy(true); setMessage("Validating archive and restoring...");
    try {
      const response = await fetch("/api/admin/backup", { method: "POST", headers: { "Content-Type": "application/gzip" }, body: file });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Restore failed.");
      setMessage("Restore complete. Sign out and back in, then check the site, media, and resumes.");
      form.reset();
    } catch (error) { setMessage(error instanceof Error ? error.message : "Restore failed."); }
    finally { setBusy(false); }
  }
  return <>
    <p><a className="tbtn big" href="/api/admin/backup">Download full backup</a></p>
    <p className="lede">Includes all 17 application tables, uploaded originals and image variants. It also includes agent prompts and proposals, audit history, and revisions. The archive is not encrypted: store it privately. It does not contain .env, OAuth credentials, signing keys, or database passwords. Current limits are 160 MiB compressed, 192 MiB expanded, 64 MiB media files, and 88 MiB of database rows.</p>
    <h2>Restore an archive</h2>
    <p>Restore works only on an empty installation. It replaces the target's sign-in audit entries with the archive history. It refuses populated databases or non-empty media folders.</p>
    <p><strong>Make a separate copy of the target database and media folder first.</strong> A restore cannot be undone from this screen.</p>
    <form onSubmit={restore} className="login edit" style={{ maxWidth: "42rem" }}>
      <label className="mono" htmlFor="archive">BACKUP FILE (.PABACKUP)</label>
      <input id="archive" name="archive" type="file" accept=".pabackup,application/gzip" required />
      <label><input type="checkbox" required /> I understand that restore is allowed only into an empty installation.</label>
      <button className="tbtn big" disabled={busy}>{busy ? "RESTORING..." : "VALIDATE AND RESTORE"}</button>
      <p role="status" aria-live="polite">{message}</p>
    </form>
  </>;
}
