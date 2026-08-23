CREATE TABLE "campaigns" (
	"id" text PRIMARY KEY,
	"workspace_id" text NOT NULL,
	"slug" text NOT NULL UNIQUE,
	"campaign_name" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"destination_url" text NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"template" text DEFAULT 'qr-only' NOT NULL,
	"custom_text" text DEFAULT 'SCAN ME' NOT NULL,
	"design_settings" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "events" (
	"id" text PRIMARY KEY,
	"campaign_id" text NOT NULL,
	"slug" text NOT NULL,
	"event_type" text DEFAULT 'scan' NOT NULL,
	"timestamp" timestamp with time zone DEFAULT now() NOT NULL,
	"visitor_id" text NOT NULL,
	"device" text DEFAULT 'Unknown' NOT NULL,
	"browser" text DEFAULT 'Other' NOT NULL,
	"operating_system" text DEFAULT 'Other' NOT NULL,
	"country" text,
	"region" text,
	"referrer" text,
	"user_agent" text
);
--> statement-breakpoint
CREATE INDEX "campaigns_workspace_idx" ON "campaigns" ("workspace_id");--> statement-breakpoint
CREATE INDEX "campaigns_slug_idx" ON "campaigns" ("slug");--> statement-breakpoint
CREATE INDEX "events_campaign_idx" ON "events" ("campaign_id");--> statement-breakpoint
CREATE INDEX "events_slug_idx" ON "events" ("slug");--> statement-breakpoint
CREATE INDEX "events_timestamp_idx" ON "events" ("timestamp");--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_campaign_id_campaigns_id_fkey" FOREIGN KEY ("campaign_id") REFERENCES "campaigns"("id");