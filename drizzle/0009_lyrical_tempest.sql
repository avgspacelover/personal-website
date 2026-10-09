CREATE TABLE IF NOT EXISTS "agent_run" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"mode" text NOT NULL,
	"target" text DEFAULT '' NOT NULL,
	"provider" text NOT NULL,
	"resume_id" uuid,
	"status" text DEFAULT 'proposed' NOT NULL,
	"summary" text DEFAULT '' NOT NULL,
	"proposal" jsonb NOT NULL,
	"log" jsonb DEFAULT '[]'::jsonb NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "agent_run" ADD CONSTRAINT "agent_run_resume_id_resume_id_fk" FOREIGN KEY ("resume_id") REFERENCES "public"."resume"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
