import { useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import WebBackground from "../components/WebBackground";
import { createBook, readFileAsText } from "../reader/importBook";
import { SAMPLE_TEXT, SAMPLE_TITLE } from "../reader/sampleBook";
import { deleteBook, listBooks, saveBook } from "../reader/storage";
import type { Book } from "../reader/types";

export default function ReaderLibraryPage() {
  const [books, setBooks] = useState<Book[]>(() => listBooks());
  const [error, setError] = useState<string | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  async function handleFile(file: File) {
    setError(null);
    try {
      const text = await readFileAsText(file);
      if (!text.trim()) {
        setError("That file doesn't seem to contain any text.");
        return;
      }
      const title = file.name.replace(/\.[^/.]+$/, "");
      const book = createBook(title, file.name, text);
      saveBook(book);
      setBooks(listBooks());
      navigate(`/reader/${book.id}`);
    } catch {
      setError("Couldn't read that file. Try a plain .txt export of the book.");
    }
  }

  function handleSample() {
    const book = createBook(SAMPLE_TITLE, "bundled sample", SAMPLE_TEXT);
    saveBook(book);
    setBooks(listBooks());
    navigate(`/reader/${book.id}`);
  }

  function handleDelete(id: string) {
    deleteBook(id);
    setBooks(listBooks());
  }

  return (
    <div className="relative min-h-screen overflow-hidden">
      <WebBackground />
      <div className="relative z-10 mx-auto flex min-h-screen max-w-3xl flex-col px-6 py-16">
        <div className="mb-8">
          <Link to="/" className="text-xs uppercase tracking-wide text-sky-400/80 hover:text-sky-300">
            &larr; Back
          </Link>
          <h1 className="mt-3 text-3xl font-semibold text-slate-100">Reader</h1>
          <p className="mt-2 text-sm text-slate-400">
            Import a plain-text book you legitimately have (e.g. a public-domain text from{" "}
            <span className="text-slate-300">Project Gutenberg</span>) and listen to it read aloud,
            free, using your device&rsquo;s built-in text-to-speech &mdash; even with the screen off.
          </p>
        </div>

        <div className="mb-6 flex flex-wrap gap-3">
          <button
            onClick={() => fileInput.current?.click()}
            className="rounded-lg border border-sky-500/60 bg-sky-500/10 px-4 py-2 text-sm font-medium text-sky-300 transition hover:bg-sky-500/20"
          >
            Import .txt file
          </button>
          <input
            ref={fileInput}
            type="file"
            accept=".txt,text/plain"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void handleFile(file);
              e.target.value = "";
            }}
          />
          <button
            onClick={handleSample}
            className="rounded-lg border border-slate-700 px-4 py-2 text-sm font-medium text-slate-300 transition hover:border-slate-500"
          >
            Try a public-domain sample
          </button>
        </div>

        {error && <p className="mb-6 text-sm text-rose-400">{error}</p>}

        <div className="flex flex-col gap-3">
          {books.length === 0 && (
            <p className="text-sm text-slate-500">No books yet &mdash; import one to get started.</p>
          )}
          {books
            .slice()
            .sort((a, b) => b.importedAt - a.importedAt)
            .map((book) => (
              <div
                key={book.id}
                className="flex items-center justify-between rounded-xl border border-slate-800 bg-web-panel/60 px-5 py-4 backdrop-blur-sm"
              >
                <Link to={`/reader/${book.id}`} className="min-w-0 flex-1">
                  <h2 className="truncate text-base font-medium text-slate-100">{book.title}</h2>
                  <p className="mt-1 text-xs text-slate-500">
                    {book.chunks.length} segments &middot; imported{" "}
                    {new Date(book.importedAt).toLocaleDateString()}
                  </p>
                </Link>
                <button
                  onClick={() => handleDelete(book.id)}
                  className="ml-4 shrink-0 rounded-md border border-slate-700 px-2 py-1 text-xs text-slate-400 transition hover:border-rose-500/60 hover:text-rose-400"
                >
                  Delete
                </button>
              </div>
            ))}
        </div>

        <p className="mt-10 text-xs text-slate-600">
          Tip: for the smoothest voice, in Android go to Settings &rarr; General management &rarr;
          Text-to-speech, pick the Google engine, and install its high-quality network voice data.
          For reliable playback with the screen off, also exclude this app from Samsung&rsquo;s
          battery optimization (Settings &rarr; Apps &rarr; this app &rarr; Battery &rarr;
          Unrestricted).
        </p>
      </div>
    </div>
  );
}
