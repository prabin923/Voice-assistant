-- RAG knowledge chunks (embeddings stored as JSON float arrays)
CREATE TABLE "knowledge_chunks" (
    "id" TEXT NOT NULL,
    "chunk_key" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "content_hash" TEXT NOT NULL,
    "embedding" TEXT NOT NULL,
    "embed_model" TEXT NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "knowledge_chunks_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "knowledge_chunks_chunk_key_key" ON "knowledge_chunks"("chunk_key");
CREATE INDEX "knowledge_chunks_category_idx" ON "knowledge_chunks"("category");
