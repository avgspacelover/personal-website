"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
type Item = { label: string; href?: string; group?: string };
export function Radial({ groups }: { groups: Record<string, Item[]> }) {
  const [open, setOpen] = useState(false);
  const [g, setG] = useState("root");
  const close = () => { setOpen(false); setG("root"); };
  useEffect(() => { const k = (e: KeyboardEvent) => { if (e.key === "Escape") { setOpen(false); setG("root"); } }; addEventListener("keydown", k); return () => removeEventListener("keydown", k); }, []);
  const items = groups[g]; const n = items.length;
  const R = 96 + Math.max(0, n - 4) * 14;
  return (
    <div className={open ? "radial open" : "radial"}>
      <button className="core" aria-expanded={open} aria-label="Navigation menu" onClick={() => (open ? close() : setOpen(true))}>{open ? "CLOSE" : "MENU"}</button>
      {items.map((it, i) => {
        const a = (Math.PI / 2) * (n === 1 ? 0.5 : i / (n - 1));
        const style = { "--x": `${-Math.cos(a) * R}px`, "--y": `${-Math.sin(a) * R}px` } as React.CSSProperties;
        const t = open ? 0 : -1;
        return it.href
          ? <Link key={g + it.label} className="node" style={style} href={it.href} onClick={close} tabIndex={t}>{it.label}</Link>
          : <button key={g + it.label} className="node" style={style} onClick={() => setG(it.group!)} tabIndex={t}>{it.label}</button>;
      })}
    </div>
  );
}
