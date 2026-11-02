-- Better Auth 1.7 uses atomic counters to enforce team capacity.
ALTER TABLE "teams" ADD COLUMN "memberCount" INTEGER NOT NULL DEFAULT 0;

UPDATE "teams" AS team
SET "memberCount" = (
    SELECT COUNT(*)::INTEGER
    FROM "teamMembers" AS member
    WHERE member."teamId" = team."id"
);

-- Existing memberships remain readable by teamId/userId. New memberships get
-- a deterministic key from Better Auth; NULL preserves legacy rows.
ALTER TABLE "teamMembers" ADD COLUMN "membershipKey" TEXT;
CREATE UNIQUE INDEX "teamMembers_membershipKey_key" ON "teamMembers"("membershipKey");

ALTER TABLE "apikeys" ALTER COLUMN "rateLimitTimeWindow" SET DEFAULT 86400000;
ALTER TABLE "apikeys" ALTER COLUMN "rateLimitMax" SET DEFAULT 10;
