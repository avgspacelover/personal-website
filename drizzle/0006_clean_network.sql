ALTER TABLE "entry" ADD COLUMN "updated_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "library_item" ADD COLUMN "updated_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "vocation" ADD COLUMN "updated_at" timestamp with time zone DEFAULT now() NOT NULL;