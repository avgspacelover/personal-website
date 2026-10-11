CREATE TABLE "revision" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"at" timestamp with time zone DEFAULT now() NOT NULL,
	"entry_id" uuid NOT NULL,
	"actor" text NOT NULL,
	"note" text DEFAULT '' NOT NULL,
	"snapshot" jsonb NOT NULL
);
--> statement-breakpoint
ALTER TABLE "entry" ADD COLUMN "seo_title" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "entry" ADD COLUMN "seo_description" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "entry" ADD COLUMN "canonical_url" text DEFAULT '' NOT NULL;--> statement-breakpoint
ALTER TABLE "entry" ADD COLUMN "seo_image" text;--> statement-breakpoint
ALTER TABLE "revision" ADD CONSTRAINT "revision_entry_id_entry_id_fk" FOREIGN KEY ("entry_id") REFERENCES "public"."entry"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "entry" ADD CONSTRAINT "entry_seo_image_media_asset_key_fk" FOREIGN KEY ("seo_image") REFERENCES "public"."media_asset"("key") ON DELETE set null ON UPDATE no action;