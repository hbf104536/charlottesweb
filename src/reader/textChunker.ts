import type { Chunk } from "./types";

const MAX_CHUNK_LEN = 400;
const CHAPTER_LINE = /^(chapter|part|book|section)\b/i;
const NUMBERED_HEADING = /^(chapter\s+)?([ivxlcdm]+|\d+)[.:)]?$/i;

function looksLikeHeading(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed || trimmed.length > 60) return false;
  if (CHAPTER_LINE.test(trimmed)) return true;
  if (NUMBERED_HEADING.test(trimmed)) return true;
  const letters = trimmed.replace(/[^a-zA-Z]/g, "");
  if (letters.length >= 3 && letters === letters.toUpperCase()) return true;
  return false;
}

function splitSentences(paragraph: string): string[] {
  const sentences = paragraph.match(/[^.!?]+[.!?]+(\s+|$)|[^.!?]+$/g);
  return sentences ? sentences.map((s) => s.trim()).filter(Boolean) : [paragraph.trim()];
}

/** Splits raw book text into chapter-aware, TTS-sized chunks. */
export function chunkText(rawText: string): Chunk[] {
  const normalized = rawText.replace(/\r\n/g, "\n").replace(/ /g, " ");
  const paragraphs = normalized
    .split(/\n\s*\n/)
    .map((p) => p.replace(/\s+/g, " ").trim())
    .filter(Boolean);

  const chunks: Chunk[] = [];
  let chapter = "Beginning";
  let buffer = "";

  const flush = () => {
    if (buffer.trim()) {
      chunks.push({ index: chunks.length, chapter, text: buffer.trim() });
      buffer = "";
    }
  };

  for (const paragraph of paragraphs) {
    if (looksLikeHeading(paragraph)) {
      flush();
      chapter = paragraph.replace(/\s+/g, " ").trim();
      continue;
    }
    for (const sentence of splitSentences(paragraph)) {
      if (buffer.length + sentence.length + 1 > MAX_CHUNK_LEN) flush();
      buffer = buffer ? `${buffer} ${sentence}` : sentence;
    }
    flush();
  }
  flush();

  return chunks;
}
