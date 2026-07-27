export interface Chunk {
  /** Index within the book's flat chunk list. */
  index: number;
  /** Chapter/section title this chunk belongs to, if detected. */
  chapter: string;
  text: string;
}

export interface Book {
  id: string;
  title: string;
  source: string;
  importedAt: number;
  chunks: Chunk[];
}

export interface BookProgress {
  bookId: string;
  chunkIndex: number;
  rate: number;
  voiceURI: string | null;
  updatedAt: number;
}
