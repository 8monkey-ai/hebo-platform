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

-- Better Auth 1.7 identifies Microsoft accounts by the stable `oid` claim
-- instead of the app-specific `sub`. Rewrite legacy accountIds using the `oid`
-- from the ID token stored at sign-in (received directly from Microsoft's
-- token endpoint). Rows without a stored ID token are re-linked by
-- email on next sign-in, since Microsoft is a trusted provider.
UPDATE "accounts" AS account
SET "accountId" = claims."oid"
FROM (
    SELECT
        "id",
        convert_from(
            decode(
                rpad(
                    translate(split_part("idToken", '.', 2), '-_', '+/'),
                    ((length(split_part("idToken", '.', 2)) + 3) / 4) * 4,
                    '='
                ),
                'base64'
            ),
            'UTF8'
        )::JSONB ->> 'oid' AS "oid"
    FROM "accounts"
    WHERE "providerId" = 'microsoft'
      AND "idToken" ~ '^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]*$'
) AS claims
WHERE account."id" = claims."id"
  AND claims."oid" IS NOT NULL
  AND account."accountId" <> claims."oid";
