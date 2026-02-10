CREATE TABLE "vote_calculation_account_votes" (
	"state_id" integer NOT NULL,
	"account_address" varchar(255) NOT NULL,
	"vote" varchar(255) NOT NULL,
	"vote_power" numeric DEFAULT '0' NOT NULL,
	CONSTRAINT "vote_calculation_account_votes_state_id_account_address_vote_pk" PRIMARY KEY("state_id","account_address","vote")
);
--> statement-breakpoint
ALTER TABLE "vote_calculation_account_votes" ADD CONSTRAINT "vote_calculation_account_votes_state_id_vote_calculation_state_id_fk" FOREIGN KEY ("state_id") REFERENCES "public"."vote_calculation_state"("id") ON DELETE cascade ON UPDATE no action;