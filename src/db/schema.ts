import { boolean, integer, jsonb, pgEnum, pgTable, primaryKey, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core";

export const status = pgEnum("status", ["draft", "published", "archived"]);
export const kind = pgEnum("entry_kind", ["projects", "experience"]);
const id = () => uuid("id").primaryKey().defaultRandom();
const updatedAt = () => timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date());

export const vocation = pgTable("vocation", {
  id: id(), updatedAt: updatedAt(), slug: text("slug").notNull().unique(), name: text("name").notNull(), intro: text("intro").notNull().default(""),
  position: integer("position").notNull().default(0), status: status("status").notNull().default("draft"),
});

// Experience and Project share one table (kind column). Same fields, one CRUD path, one canonical record each.
export const entry = pgTable("entry", {
  id: id(), updatedAt: updatedAt(), kind: kind("kind").notNull(), slug: text("slug").notNull(), title: text("title").notNull(), organization: text("organization"), location: text("location").notNull().default(""),
  seoTitle: text("seo_title").notNull().default(""), seoDescription: text("seo_description").notNull().default(""), canonicalUrl: text("canonical_url").notNull().default(""),
  seoImage: text("seo_image").references(() => mediaAsset.key, { onDelete: "set null" }),
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
  id: id(), updatedAt: updatedAt(), collection: text("collection").notNull(), title: text("title").notNull(), creator: text("creator").notNull().default(""),
  url: text("url"), year: text("year"), rating: text("rating").notNull().default(""), notes: text("notes").notNull().default(""),
  tags: text("tags").array().notNull().default([]), image: text("image").references(() => mediaAsset.key, { onDelete: "set null" }), finished: text("finished"),
  position: integer("position").notNull().default(0), status: status("status").notNull().default("draft"),
});

export const skill = pgTable("skill", {
  id: id(), category: text("category").notNull(), items: text("items").array().notNull().default([]), position: integer("position").notNull().default(0),
});
export const education = pgTable("education", {
  id: id(), institution: text("institution").notNull(), program: text("program").notNull().default(""), location: text("location").notNull().default(""), period: text("period").notNull().default(""), position: integer("position").notNull().default(0),
});


// Uploaded images. `key` is the storage key of the original; resized WebP variants are `<base>-<width>.webp`.
export const mediaAsset = pgTable("media_asset", {
  id: id(), key: text("key").notNull().unique(), name: text("name").notNull().default(""), mime: text("mime").notNull(),
  bytes: integer("bytes").notNull(), width: integer("width").notNull(), height: integer("height").notNull(),
  alt: text("alt").notNull().default(""), variants: integer("variants").array().notNull().default([]),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// Old public paths that should permanently redirect (308) to the current path.
export const redirectRule = pgTable("redirect_rule", {
  id: id(), fromPath: text("from_path").notNull().unique(), toPath: text("to_path").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// Resume versions are configurations over canonical records. Nothing here duplicates record content except optional resume-specific bullets.
export const resume = pgTable("resume", {
  id: id(), updatedAt: updatedAt(), name: text("name").notNull(), template: text("template").notNull().default("classic"),
  pages: text("pages").notNull().default("one"), fullName: text("full_name").notNull().default(""), contact: text("contact").notNull().default(""),
  headline: text("headline").notNull().default(""), sections: text("sections").array().notNull().default(["education", "experience", "projects", "skills"]),
  isPublic: boolean("is_public").notNull().default(false), status: status("status").notNull().default("draft"),
});
export const resumeItem = pgTable("resume_item", {
  id: id(), resumeId: uuid("resume_id").notNull().references(() => resume.id, { onDelete: "cascade" }),
  section: text("section").notNull(), position: integer("position").notNull().default(0),
  entryId: uuid("entry_id").references(() => entry.id, { onDelete: "cascade" }),
  skillId: uuid("skill_id").references(() => skill.id, { onDelete: "cascade" }),
  educationId: uuid("education_id").references(() => education.id, { onDelete: "cascade" }),
  bullets: text("bullets").array().notNull().default([]),
  proposedByAgent: boolean("proposed_by_agent").notNull().default(false), approved: boolean("approved").notNull().default(true),
});

// One row per agent run: what was asked, which provider answered, every tool call, and the proposal awaiting human review.
export const agentRun = pgTable("agent_run", {
  id: id(), createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  mode: text("mode").notNull(), target: text("target").notNull().default(""), provider: text("provider").notNull(),
  resumeId: uuid("resume_id").references(() => resume.id, { onDelete: "set null" }),
  status: text("status").notNull().default("proposed"), summary: text("summary").notNull().default(""),
  proposal: jsonb("proposal").notNull(), log: jsonb("log").notNull().default([]),
});

// Admin audit trail (who, what, when). Sign-ins (allowed and denied) and every mutating admin action.
export const auditLog = pgTable("audit_log", {
  id: id(), at: timestamp("at", { withTimezone: true }).notNull().defaultNow(), actor: text("actor").notNull(), action: text("action").notNull(), detail: text("detail").notNull().default(""),
});

// Singleton row (id "main") holding site-wide text that used to be hardcoded. Empty values fall back to defaults in getSettings().
export const siteSettings = pgTable("site_settings", {
  id: text("id").primaryKey().default("main"), updatedAt: updatedAt(),
  siteName: text("site_name").notNull().default(""), tagline: text("tagline").notNull().default(""), intro: text("intro").notNull().default(""),
  currently: jsonb("currently").notNull().default({}), aboutBody: jsonb("about_body").notNull().default({}),
  contactEmail: text("contact_email").notNull().default(""), links: jsonb("links").notNull().default([]), metaDescription: text("meta_description").notNull().default(""),
  milestonesTitle: text("milestones_title").notNull().default(""), milestonesIntro: text("milestones_intro").notNull().default(""),
});

// Previous versions of a record, saved automatically BEFORE each change that alters it (newest 30 kept per record).
export const revision = pgTable("revision", {
  id: id(), at: timestamp("at", { withTimezone: true }).notNull().defaultNow(),
  entryId: uuid("entry_id").notNull().references(() => entry.id, { onDelete: "cascade" }),
  actor: text("actor").notNull(), note: text("note").notNull().default(""), snapshot: jsonb("snapshot").notNull(),
});

// Milestones page: accomplishments (optionally tied to one vocation) and free-form figures. Reading/watching counts are derived from library_item.finished.
export const accomplishment = pgTable("accomplishment", {
  id: id(), updatedAt: updatedAt(), title: text("title").notNull(), detail: text("detail").notNull().default(""), year: text("year").notNull().default(""),
  figure: text("figure").notNull().default(""), url: text("url"),
  position: integer("position").notNull().default(0), status: status("status").notNull().default("draft"),
});
// An accomplishment can belong to any number of vocations (like projects); deleting a vocation only removes the link.
export const accomplishmentVocation = pgTable("accomplishment_vocation", {
  accomplishmentId: uuid("accomplishment_id").notNull().references(() => accomplishment.id, { onDelete: "cascade" }),
  vocationId: uuid("vocation_id").notNull().references(() => vocation.id, { onDelete: "cascade" }),
  position: integer("position").notNull().default(0),
}, (t) => ({ pk: primaryKey({ columns: [t.accomplishmentId, t.vocationId] }) }));
export const stat = pgTable("stat", {
  id: id(), updatedAt: updatedAt(), label: text("label").notNull(), value: text("value").notNull(), period: text("period").notNull().default(""), note: text("note").notNull().default(""),
  url: text("url"), position: integer("position").notNull().default(0), status: status("status").notNull().default("draft"),
});
