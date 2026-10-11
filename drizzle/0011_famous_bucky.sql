CREATE TABLE "site_settings" (
	"id" text PRIMARY KEY DEFAULT 'main' NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"site_name" text DEFAULT '' NOT NULL,
	"tagline" text DEFAULT '' NOT NULL,
	"intro" text DEFAULT '' NOT NULL,
	"currently" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"about_body" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"contact_email" text DEFAULT '' NOT NULL,
	"links" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"meta_description" text DEFAULT '' NOT NULL
);
