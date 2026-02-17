CREATE TABLE "config" (
	"key" varchar(255) PRIMARY KEY NOT NULL,
	"value" text NOT NULL
);
--> statement-breakpoint
ALTER TABLE "vote_calculation_state" DROP COLUMN "is_calculating";