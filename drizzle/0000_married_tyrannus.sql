CREATE TYPE "public"."entry_kind" AS ENUM('projects', 'experience');--> statement-breakpoint
CREATE TYPE "public"."status" AS ENUM('draft', 'published', 'archived');--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "education" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"institution" text NOT NULL,
	"program" text DEFAULT '' NOT NULL,
	"period" text DEFAULT '' NOT NULL,
	"position" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "entry" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kind" "entry_kind" NOT NULL,
	"slug" text NOT NULL,
	"title" text NOT NULL,
	"organization" text,
	"summary" text DEFAULT '' NOT NULL,
	"period" text DEFAULT '' NOT NULL,
	"phase" text DEFAULT '' NOT NULL,
	"tech" text[] DEFAULT '{}' NOT NULL,
	"body" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"featured" boolean DEFAULT false NOT NULL,
	"status" "status" DEFAULT 'draft' NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "library_item" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"collection" text NOT NULL,
	"title" text NOT NULL,
	"creator" text DEFAULT '' NOT NULL,
	"url" text,
	"year" text,
	"rating" text DEFAULT '' NOT NULL,
	"notes" text DEFAULT '' NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"status" "status" DEFAULT 'draft' NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "skill" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"category" text NOT NULL,
	"items" text[] DEFAULT '{}' NOT NULL,
	"position" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "vocation" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"intro" text DEFAULT '' NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"status" "status" DEFAULT 'draft' NOT NULL,
	CONSTRAINT "vocation_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "vocation_entry" (
	"vocation_id" uuid NOT NULL,
	"entry_id" uuid NOT NULL,
	"is_primary" boolean DEFAULT false NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "vocation_entry_vocation_id_entry_id_pk" PRIMARY KEY("vocation_id","entry_id")
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "vocation_entry" ADD CONSTRAINT "vocation_entry_vocation_id_vocation_id_fk" FOREIGN KEY ("vocation_id") REFERENCES "public"."vocation"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "vocation_entry" ADD CONSTRAINT "vocation_entry_entry_id_entry_id_fk" FOREIGN KEY ("entry_id") REFERENCES "public"."entry"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "entry_kind_slug" ON "entry" USING btree ("kind","slug");