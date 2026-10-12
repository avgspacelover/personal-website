CREATE TABLE "accomplishment_vocation" (
	"accomplishment_id" uuid NOT NULL,
	"vocation_id" uuid NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "accomplishment_vocation_accomplishment_id_vocation_id_pk" PRIMARY KEY("accomplishment_id","vocation_id")
);
--> statement-breakpoint
-- keep existing single-vocation links when moving to many-to-many
INSERT INTO "accomplishment_vocation" ("accomplishment_id", "vocation_id", "position") SELECT "id", "vocation_id", 0 FROM "accomplishment" WHERE "vocation_id" IS NOT NULL;
--> statement-breakpoint
ALTER TABLE "accomplishment" DROP CONSTRAINT "accomplishment_vocation_id_vocation_id_fk";
--> statement-breakpoint
ALTER TABLE "accomplishment_vocation" ADD CONSTRAINT "accomplishment_vocation_accomplishment_id_accomplishment_id_fk" FOREIGN KEY ("accomplishment_id") REFERENCES "public"."accomplishment"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "accomplishment_vocation" ADD CONSTRAINT "accomplishment_vocation_vocation_id_vocation_id_fk" FOREIGN KEY ("vocation_id") REFERENCES "public"."vocation"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "accomplishment" DROP COLUMN "vocation_id";