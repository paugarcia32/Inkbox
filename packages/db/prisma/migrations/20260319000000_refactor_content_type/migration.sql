-- Refactor ContentType: replace provider-based values with content-type-based values
-- Old values: article, youtube, tweet, link, pinterest, dribbble
-- New values: link, article, video, image, post, document
-- Existing items are reset to the default 'link'.

-- Step 1: Reset all items to a value that exists in the new enum
UPDATE "items" SET "type" = 'link';

-- Step 2: Drop the column default (it depends on the old enum type)
ALTER TABLE "items" ALTER COLUMN "type" DROP DEFAULT;

-- Step 3: Change column to TEXT temporarily to decouple from old enum
ALTER TABLE "items" ALTER COLUMN "type" TYPE TEXT;

-- Step 4: Drop the old enum (now no dependencies remain)
DROP TYPE "ContentType";

-- Step 5: Create the new enum
CREATE TYPE "ContentType" AS ENUM ('link', 'article', 'video', 'image', 'post', 'document');

-- Step 6: Restore the column using the new enum
ALTER TABLE "items" ALTER COLUMN "type" TYPE "ContentType" USING "type"::"ContentType";

-- Step 7: Restore the default
ALTER TABLE "items" ALTER COLUMN "type" SET DEFAULT 'link'::"ContentType";
