CREATE TABLE "event_messages" (
    "id" UUID NOT NULL,
    "event_id" UUID NOT NULL,
    "author_id" UUID NOT NULL,
    "text" VARCHAR(1000) NOT NULL,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "event_messages_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "event_messages_event_id_created_at_id_idx"
ON "event_messages"("event_id", "created_at", "id");

ALTER TABLE "event_messages"
ADD CONSTRAINT "event_messages_event_id_fkey"
FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "event_messages"
ADD CONSTRAINT "event_messages_author_id_fkey"
FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
