CREATE TABLE IF NOT EXISTS "resume" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"name" text NOT NULL,
	"template" text DEFAULT 'minimal' NOT NULL,
	"pages" text DEFAULT 'one' NOT NULL,
	"full_name" text DEFAULT '' NOT NULL,
	"contact" text DEFAULT '' NOT NULL,
	"headline" text DEFAULT '' NOT NULL,
	"sections" text[] DEFAULT '{"experience","projects","skills","education"}' NOT NULL,
	"is_public" boolean DEFAULT false NOT NULL,
	"status" "status" DEFAULT 'draft' NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "resume_item" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"resume_id" uuid NOT NULL,
	"section" text NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"entry_id" uuid,
	"skill_id" uuid,
	"education_id" uuid,
	"bullets" text[] DEFAULT '{}' NOT NULL,
	"proposed_by_agent" boolean DEFAULT false NOT NULL,
	"approved" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "resume_item" ADD CONSTRAINT "resume_item_resume_id_resume_id_fk" FOREIGN KEY ("resume_id") REFERENCES "public"."resume"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "resume_item" ADD CONSTRAINT "resume_item_entry_id_entry_id_fk" FOREIGN KEY ("entry_id") REFERENCES "public"."entry"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "resume_item" ADD CONSTRAINT "resume_item_skill_id_skill_id_fk" FOREIGN KEY ("skill_id") REFERENCES "public"."skill"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "resume_item" ADD CONSTRAINT "resume_item_education_id_education_id_fk" FOREIGN KEY ("education_id") REFERENCES "public"."education"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
