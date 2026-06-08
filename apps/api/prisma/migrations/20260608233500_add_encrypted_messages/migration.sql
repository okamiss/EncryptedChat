CREATE TABLE "encrypted_messages" (
    "id" UUID NOT NULL,
    "client_message_id" VARCHAR(128) NOT NULL,
    "conversation_type" VARCHAR(16) NOT NULL,
    "sender_id" UUID NOT NULL,
    "recipient_id" UUID,
    "group_id" UUID,
    "payload" JSONB NOT NULL,
    "sent_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "encrypted_messages_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "encrypted_messages_client_message_id_key" ON "encrypted_messages"("client_message_id");
CREATE INDEX "encrypted_messages_sender_id_sent_at_idx" ON "encrypted_messages"("sender_id", "sent_at");
CREATE INDEX "encrypted_messages_recipient_id_sent_at_idx" ON "encrypted_messages"("recipient_id", "sent_at");
CREATE INDEX "encrypted_messages_group_id_sent_at_idx" ON "encrypted_messages"("group_id", "sent_at");

ALTER TABLE "encrypted_messages" ADD CONSTRAINT "encrypted_messages_sender_id_fkey" FOREIGN KEY ("sender_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "encrypted_messages" ADD CONSTRAINT "encrypted_messages_recipient_id_fkey" FOREIGN KEY ("recipient_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "encrypted_messages" ADD CONSTRAINT "encrypted_messages_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;
