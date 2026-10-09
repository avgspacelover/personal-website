"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { arcLayout } from "@/lib/radial";
type Item = { label: string; href?: string; group?: string };

export function Radial({ groups }: { groups: Record<string, Item[]> }) {
  const [open, setOpen] = useState(false);
  const [g, setG] = useState("root");
  const close = () => { setOpen(false); setG("root"); };
  useEffect(() => { const k = (e: KeyboardEvent) => { if (e.key === "Escape") close(); }; addEventListener("keydown", k); return () => removeEventListener("keydown", k); }, []);
  const items = groups[g];
  const pts = arcLayout(items.map((i) => i.label));
  const t = open ? 0 : -1;
  const sub = g !== "root";
  return (
    <div className={`radial${open ? " open" : ""}${pts ? "" : " stack"}`}>
      <button className="core" aria-expanded={open} aria-label={open ? (sub ? "Back to main menu" : "Close menu") : "Open navigation menu"} onClick={() => (!open ? setOpen(true) : sub ? setG("root") : close())}>{!open ? "MENU" : sub ? "BACK" : "CLOSE"}</button>
      <div className="list">
        {items.map((it, i) => {
          const style = pts ? ({ "--x": `${pts[i].x}px`, "--y": `${pts[i].y}px` } as React.CSSProperties) : undefined;
          return it.href
            ? <Link key={g + it.label} className="node" style={style} href={it.href} onClick={close} tabIndex={t}>{it.label}</Link>
            : <button key={g + it.label} className="node" style={style} onClick={() => setG(it.group!)} tabIndex={t}>{it.label}</button>;
        })}
      </div>
    </div>
  );
}
