-- Enable pg_trgm extension for trigram-based GIN indexes
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- Item search indexes (used by ILIKE on title, url, description, siteName)
CREATE INDEX "items_title_trgm_idx" ON "items" USING GIN (title gin_trgm_ops);
CREATE INDEX "items_url_trgm_idx" ON "items" USING GIN (url gin_trgm_ops);
CREATE INDEX "items_description_trgm_idx" ON "items" USING GIN (description gin_trgm_ops);
CREATE INDEX "items_sitename_trgm_idx" ON "items" USING GIN ("siteName" gin_trgm_ops);

-- Collection search index (used by ILIKE on name)
CREATE INDEX "collections_name_trgm_idx" ON "collections" USING GIN (name gin_trgm_ops);
