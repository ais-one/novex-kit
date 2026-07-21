CREATE TABLE "botbuilder_graphs" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"flow" jsonb NOT NULL,
	"status" text DEFAULT 'draft',
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "botbuilder_messages" (
	"id" serial PRIMARY KEY NOT NULL,
	"session_id" integer,
	"role" text NOT NULL,
	"content" text NOT NULL,
	"content_type" text DEFAULT 'text',
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "botbuilder_sessions" (
	"id" serial PRIMARY KEY NOT NULL,
	"chat_id" text NOT NULL,
	"user_name" text,
	"graph_id" integer,
	"current_node_id" text DEFAULT 'trigger',
	"state" jsonb,
	"status" text DEFAULT 'active',
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	CONSTRAINT "botbuilder_sessions_chat_id_unique" UNIQUE("chat_id")
);
--> statement-breakpoint
ALTER TABLE "botbuilder_messages" ADD CONSTRAINT "botbuilder_messages_session_id_botbuilder_sessions_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."botbuilder_sessions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "botbuilder_sessions" ADD CONSTRAINT "botbuilder_sessions_graph_id_botbuilder_graphs_id_fk" FOREIGN KEY ("graph_id") REFERENCES "public"."botbuilder_graphs"("id") ON DELETE no action ON UPDATE no action;