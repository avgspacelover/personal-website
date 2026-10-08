import { boolean, integer, jsonb, pgEnum, pgTable, primaryKey, text, uniqueIndex, uuid } from "drizzle-orm/pg-core";

export const status = pgEnum("status", ["draft", "published", "archived"]);
export const kind = pgEnum("entry_kind", ["projects", "experience"]);
const id = () => uuid("id").primaryKey().defaultRandom();

export const vocation = pgTable("vocation", {
  id: id(), slug: text("slug").notNull().unique(), name: text("name").notNull(), intro: text("intro").notNull().default(""),
  position: integer("position").notNull().default(0), status: status("status").notNull().default("draft"),
});

// Experience and Project share one table (kind column). Same fields, one CRUD path, one canonical record each.
export const entry = pgTable("entry", {
  id: id(), kind: kind("kind").notNull(), slug: text("slug").notNull(), title: text("title").notNull(), organization: text("organization"),
  summary: text("summary").notNull().default(""), period: text("period").notNull().default(""), phase: text("phase").notNull().default(""),
  tech: text("tech").array().notNull().default([]), body: jsonb("body").notNull().default([]),
  position: integer("position").notNull().default(0), featured: boolean("featured").notNull().default(false),
  status: status("status").notNull().default("draft"),
}, (t) => ({ uniq: uniqueIndex("entry_kind_slug").on(t.kind, t.slug) }));

export const vocationEntry = pgTable("vocation_entry", {
  vocationId: uuid("vocation_id").notNull().references(() => vocation.id, { onDelete: "cascade" }),
  entryId: uuid("entry_id").notNull().references(() => entry.id, { onDelete: "cascade" }),
  isPrimary: boolean("is_primary").notNull().default(false), position: integer("position").notNull().default(0),
}, (t) => ({ pk: primaryKey({ columns: [t.vocationId, t.entryId] }) }));

export const libraryItem = pgTable("library_item", {
  id: id(), collection: text("collection").notNull(), title: text("title").notNull(), creator: text("creator").notNull().default(""),
  url: text("url"), year: text("year"), rating: text("rating").notNull().default(""), notes: text("notes").notNull().default(""),
  position: integer("position").notNull().default(0), status: status("status").notNull().default("draft"),
});

export const skill = pgTable("skill", {
  id: id(), category: text("category").notNull(), items: text("items").array().notNull().default([]), position: integer("position").notNull().default(0),
});
export const education = pgTable("education", {
  id: id(), institution: text("institution").notNull(), program: text("program").notNull().default(""), period: text("period").notNull().default(""), position: integer("position").notNull().default(0),
});

