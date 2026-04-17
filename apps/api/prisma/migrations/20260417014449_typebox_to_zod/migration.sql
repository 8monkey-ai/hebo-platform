-- AlterTable
ALTER TABLE "agents" ALTER COLUMN "created_by" SET DEFAULT '',
ALTER COLUMN "updated_by" SET DEFAULT '',
ALTER COLUMN "organization_id" SET DEFAULT '';

-- AlterTable
ALTER TABLE "branches" ALTER COLUMN "created_by" SET DEFAULT '',
ALTER COLUMN "updated_by" SET DEFAULT '',
ALTER COLUMN "organization_id" SET DEFAULT '';

-- AlterTable
ALTER TABLE "provider_configs" ALTER COLUMN "created_by" SET DEFAULT '',
ALTER COLUMN "updated_by" SET DEFAULT '',
ALTER COLUMN "organization_id" SET DEFAULT '';
