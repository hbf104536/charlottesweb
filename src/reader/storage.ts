import type { Book, BookProgress } from "./types";

const BOOKS_KEY = "reader.books.v1";
const PROGRESS_PREFIX = "reader.progress.v1.";

function readJSON<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

export function listBooks(): Book[] {
  return readJSON<Book[]>(BOOKS_KEY) ?? [];
}

export function getBook(id: string): Book | undefined {
  return listBooks().find((b) => b.id === id);
}

export function saveBook(book: Book): void {
  const books = listBooks().filter((b) => b.id !== book.id);
  books.push(book);
  localStorage.setItem(BOOKS_KEY, JSON.stringify(books));
}

export function deleteBook(id: string): void {
  localStorage.setItem(BOOKS_KEY, JSON.stringify(listBooks().filter((b) => b.id !== id)));
  localStorage.removeItem(PROGRESS_PREFIX + id);
}

export function getProgress(bookId: string): BookProgress | undefined {
  return readJSON<BookProgress>(PROGRESS_PREFIX + bookId) ?? undefined;
}

export function saveProgress(progress: BookProgress): void {
  localStorage.setItem(PROGRESS_PREFIX + progress.bookId, JSON.stringify(progress));
}
