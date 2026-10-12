CREATE TABLE "accomplishment" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"title" text NOT NULL,
	"detail" text DEFAULT '' NOT NULL,
	"year" text DEFAULT '' NOT NULL,
	"figure" text DEFAULT '' NOT NULL,
	"url" text,
	"vocation_id" uuid,
	"position" integer DEFAULT 0 NOT NULL,
	"status" "status" DEFAULT 'draft' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "stat" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"label" text NOT NULL,
	"value" text NOT NULL,
	"period" text DEFAULT '' NOT NULL,
	"note" text DEFAULT '' NOT NULL,
	"url" text,
	"position" integer DEFAULT 0 NOT NULL,
	"status" "status" DEFAULT 'draft' NOT NULL
);
--> statement-breakpoint
ALTER TABLE "library_item" ADD COLUMN "finished" text;--> statement-breakpoint
ALTER TABLE "site_settings" ADD COLUMN "milestones_title" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "site_settings" ADD COLUMN "milestones_intro" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "accomplishment" ADD CONSTRAINT "accomplishment_vocation_id_vocation_id_fk" FOREIGN KEY ("vocation_id") REFERENCES "public"."vocation"("id") ON DELETE set null ON UPDATE no action;