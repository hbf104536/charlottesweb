import { chunkText } from "./textChunker";
import type { Book } from "./types";

export function createBook(title: string, source: string, rawText: string): Book {
  return {
    id: crypto.randomUUID(),
    title: title.trim() || "Untitled",
    source,
    importedAt: Date.now(),
    chunks: chunkText(rawText),
  };
}

export async function readFileAsText(file: File): Promise<string> {
  return await file.text();
}
