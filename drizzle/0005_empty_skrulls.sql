ALTER TABLE "library_item" ADD COLUMN "tags" text[] DEFAULT '{}' NOT NULL;--> statement-breakpoint
ALTER TABLE "library_item" ADD COLUMN "image" text;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "library_item" ADD CONSTRAINT "library_item_image_media_asset_key_fk" FOREIGN KEY ("image") REFERENCES "public"."media_asset"("key") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
