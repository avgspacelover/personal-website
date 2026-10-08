"use client";
import { useEffect, useState } from "react";
const order = ["system", "light", "dark"] as const;
type M = (typeof order)[number];
export function ThemeToggle() {
  const [m, setM] = useState<M>("system");
  useEffect(() => { try { const s = localStorage.getItem("theme"); if (s === "light" || s === "dark") setM(s); } catch {} }, []);
  function next() {
    const n = order[(order.indexOf(m) + 1) % 3]; setM(n);
    const r = document.documentElement;
    try { if (n === "system") { localStorage.removeItem("theme"); r.removeAttribute("data-theme"); } else { localStorage.setItem("theme", n); r.setAttribute("data-theme", n); } } catch {}
  }
  return <button className="tbtn" onClick={next} aria-label={`Theme: ${m}. Activate to change.`}>THEME / {m.toUpperCase()}</button>;
}
