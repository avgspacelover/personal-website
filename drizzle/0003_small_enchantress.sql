CREATE TABLE IF NOT EXISTS "media_asset" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"key" text NOT NULL,
	"name" text DEFAULT '' NOT NULL,
	"mime" text NOT NULL,
	"bytes" integer NOT NULL,
	"width" integer NOT NULL,
	"height" integer NOT NULL,
	"alt" text DEFAULT '' NOT NULL,
	"variants" integer[] DEFAULT '{}' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "media_asset_key_unique" UNIQUE("key")
);
