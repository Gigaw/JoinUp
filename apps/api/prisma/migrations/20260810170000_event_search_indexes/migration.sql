-- CreateIndex
CREATE INDEX "events_search_vector_idx"
ON "events"
USING GIN (
  (
    setweight(to_tsvector('russian', coalesce("title", '')), 'A') ||
    setweight(to_tsvector('russian', coalesce("description", '')), 'B') ||
    setweight(to_tsvector('russian', coalesce("meeting_place", '')), 'B')
  )
);

-- CreateIndex
CREATE INDEX "categories_search_vector_idx"
ON "categories"
USING GIN (
  setweight(to_tsvector('russian', coalesce("name", '')), 'A')
);
