-- Minimum orders are off for now: every listing can be ordered from 1 unit.
ALTER TABLE "listing" ALTER COLUMN "minOrderQty" SET DEFAULT 1;
UPDATE "listing" SET "minOrderQty" = 1;
