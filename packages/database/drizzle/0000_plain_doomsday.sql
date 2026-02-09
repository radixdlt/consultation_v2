CREATE TABLE "vote_calculation_results" (
	"state_id" integer NOT NULL,
	"vote" varchar(255) NOT NULL,
	"vote_power" numeric DEFAULT '0' NOT NULL,
	CONSTRAINT "vote_calculation_results_state_id_vote_pk" PRIMARY KEY("state_id","vote")
);
--> statement-breakpoint
CREATE TABLE "vote_calculation_state" (
	"id" serial PRIMARY KEY NOT NULL,
	"type" varchar(50) NOT NULL,
	"entity_id" integer NOT NULL,
	"last_vote_count" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "vote_calculation_state_type_entity_id_unique" UNIQUE("type","entity_id")
);
--> statement-breakpoint
ALTER TABLE "vote_calculation_results" ADD CONSTRAINT "vote_calculation_results_state_id_vote_calculation_state_id_fk" FOREIGN KEY ("state_id") REFERENCES "public"."vote_calculation_state"("id") ON DELETE cascade ON UPDATE no action;