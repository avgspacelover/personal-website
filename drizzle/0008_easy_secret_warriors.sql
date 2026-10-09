ALTER TABLE "resume" ALTER COLUMN "template" SET DEFAULT 'classic';--> statement-breakpoint
ALTER TABLE "resume" ALTER COLUMN "sections" SET DEFAULT '{"education","experience","projects","skills"}';--> statement-breakpoint
ALTER TABLE "education" ADD COLUMN "location" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "entry" ADD COLUMN "location" text DEFAULT '' NOT NULL;