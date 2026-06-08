ALTER TABLE "groups" ADD COLUMN "code" VARCHAR(10);

WITH numbered_groups AS (
  SELECT
    "id",
    LPAD((1000000000 + ROW_NUMBER() OVER (ORDER BY "created_at", "id"))::text, 10, '0') AS "next_code"
  FROM "groups"
)
UPDATE "groups"
SET "code" = numbered_groups."next_code"
FROM numbered_groups
WHERE "groups"."id" = numbered_groups."id";

ALTER TABLE "groups" ALTER COLUMN "code" SET NOT NULL;

CREATE UNIQUE INDEX "groups_code_key" ON "groups"("code");

CREATE TABLE "group_join_requests" (
  "id" UUID NOT NULL,
  "group_id" UUID NOT NULL,
  "applicant_id" UUID NOT NULL,
  "status" "FriendRequestStatus" NOT NULL DEFAULT 'pending',
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "responded_at" TIMESTAMP(3),

  CONSTRAINT "group_join_requests_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "group_join_requests_group_id_applicant_id_status_key"
  ON "group_join_requests"("group_id", "applicant_id", "status");

CREATE INDEX "group_join_requests_applicant_id_status_idx"
  ON "group_join_requests"("applicant_id", "status");

ALTER TABLE "group_join_requests"
  ADD CONSTRAINT "group_join_requests_group_id_fkey"
  FOREIGN KEY ("group_id") REFERENCES "groups"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "group_join_requests"
  ADD CONSTRAINT "group_join_requests_applicant_id_fkey"
  FOREIGN KEY ("applicant_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
