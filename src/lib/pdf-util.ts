// Shared by the PDF templates.
export const linkOf = (s: string) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s) ? `mailto:${s}` : /^(https?:\/\/)?[\w-]+(\.[\w-]+)+(\/\S*)?$/.test(s) ? (s.startsWith("http") ? s : `https://${s}`) : null;
