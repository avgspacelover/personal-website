"use client";
import { useEffect, useRef, useState } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
type M = { url: string; thumb: string; alt: string };

export function RichEditor({ name, initial, media }: { name: string; initial: object; media: M[] }) {
  const field = useRef<HTMLInputElement>(null);
  const [dirty, setDirty] = useState(false);
  const [note, setNote] = useState("");
  async function upload(file: File) {
    const alt = window.prompt("Alt text (describe the image; leave blank if decorative)") ?? "";
    setNote("UPLOADING...");
    const fd = new FormData(); fd.append("file", file); fd.append("alt", alt);
    const r = await fetch("/api/admin/media", { method: "POST", body: fd, headers: { Accept: "application/json" } });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) return setNote(`UPLOAD FAILED: ${j.error ?? r.status}`);
    editor?.chain().focus().setImage({ src: j.url, alt: j.alt }).run(); setNote("");
  }
  const editor = useEditor({
    immediatelyRender: false,
    shouldRerenderOnTransaction: true,
    extensions: [StarterKit.configure({ heading: { levels: [2, 3] }, underline: false, link: { openOnClick: false, autolink: false } }), Image],
    content: initial,
    editorProps: {
      attributes: { class: "editor prose", role: "textbox", "aria-multiline": "true", "aria-label": "Body" },
      handleDrop: (_v, ev) => { const f = (ev as DragEvent).dataTransfer?.files?.[0]; if (f?.type.startsWith("image/")) { ev.preventDefault(); void upload(f); return true; } return false; },
    },
    onUpdate: ({ editor }) => { if (field.current) field.current.value = JSON.stringify(editor.getJSON()); setDirty(true); },
  });
  useEffect(() => {
    const form = field.current?.form;
    const clear = () => setDirty(false), warn = (e: BeforeUnloadEvent) => { if (dirty) e.preventDefault(); };
    form?.addEventListener("submit", clear); window.addEventListener("beforeunload", warn);
    return () => { form?.removeEventListener("submit", clear); window.removeEventListener("beforeunload", warn); };
  }, [dirty]);
  const c = () => editor!.chain().focus();
  const link = () => {
    const prev = editor!.getAttributes("link").href ?? "";
    const href = window.prompt("Link URL (https://, mailto: or /path). Blank removes the link.", prev);
    if (href === null) return;
    if (!href) c().unsetLink().run(); else if (/^(https?:\/\/|mailto:|\/(?!\/))/i.test(href)) c().setLink({ href }).run(); else setNote("LINK MUST START WITH HTTPS://, MAILTO: OR /");
  };
  const B = (label: string, on: () => void, active?: boolean, aria?: string) => <button type="button" className="tbtn" onClick={on} aria-pressed={active} aria-label={aria ?? label}>{label}</button>;
  return (<div>
    <input ref={field} type="hidden" name={name} defaultValue={JSON.stringify(initial)} />
    {editor && <div className="toolbar" role="toolbar" aria-label="Formatting">
      {B("B", () => c().toggleBold().run(), editor.isActive("bold"), "Bold")}{B("I", () => c().toggleItalic().run(), editor.isActive("italic"), "Italic")}
      {B("H2", () => c().toggleHeading({ level: 2 }).run(), editor.isActive("heading", { level: 2 }), "Heading 2")}{B("H3", () => c().toggleHeading({ level: 3 }).run(), editor.isActive("heading", { level: 3 }), "Heading 3")}
      {B("LIST", () => c().toggleBulletList().run(), editor.isActive("bulletList"), "Bulleted list")}{B("1.", () => c().toggleOrderedList().run(), editor.isActive("orderedList"), "Numbered list")}
      {B("QUOTE", () => c().toggleBlockquote().run(), editor.isActive("blockquote"))}{B("CODE", () => c().toggleCodeBlock().run(), editor.isActive("codeBlock"), "Code block")}
      {B("LINK", link, editor.isActive("link"))}{B("RULE", () => c().setHorizontalRule().run(), undefined, "Horizontal rule")}
      <label className="tbtn" style={{ cursor: "pointer" }}>UPLOAD IMAGE<input type="file" accept="image/jpeg,image/png,image/webp" className="sr" onChange={(e) => { const f = e.target.files?.[0]; if (f) void upload(f); e.target.value = ""; }} /></label>
    </div>}
    <EditorContent editor={editor} />
    {media.length > 0 && <details className="picker"><summary className="mono">INSERT FROM MEDIA LIBRARY</summary>
      <div>{media.map((m) => <button type="button" key={m.url} title={m.alt || "No alt text"} onClick={() => editor?.chain().focus().setImage({ src: m.url, alt: m.alt }).run()}><img src={m.thumb} alt={m.alt} width={96} /></button>)}</div></details>}
    <p className="mono" role="status">{dirty ? "UNSAVED CHANGES" : "NO CHANGES"} {note && `/ ${note}`}</p>
  </div>);
}
