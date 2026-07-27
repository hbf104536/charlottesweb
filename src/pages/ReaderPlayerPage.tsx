import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import WebBackground from "../components/WebBackground";
import { getBook, getProgress, saveProgress } from "../reader/storage";
import { TTSPlayer, type PlayerState } from "../reader/ttsPlayer";
import type { Book } from "../reader/types";

const RATES = [0.75, 1, 1.1, 1.25, 1.5, 1.75, 2];

export default function ReaderPlayerPage() {
  const { bookId } = useParams<{ bookId: string }>();
  const book = useMemo<Book | undefined>(() => (bookId ? getBook(bookId) : undefined), [bookId]);

  const [chunkIndex, setChunkIndex] = useState(0);
  const [state, setState] = useState<PlayerState>("idle");
  const [rate, setRate] = useState(1);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [voiceURI, setVoiceURI] = useState<string | null>(null);
  const playerRef = useRef<TTSPlayer | null>(null);
  const rateRef = useRef(rate);
  const voiceRef = useRef(voiceURI);
  rateRef.current = rate;
  voiceRef.current = voiceURI;

  // Load saved progress once per book.
  useEffect(() => {
    if (!book) return;
    const progress = getProgress(book.id);
    setChunkIndex(progress?.chunkIndex ?? 0);
    setRate(progress?.rate ?? 1);
    setVoiceURI(progress?.voiceURI ?? null);
  }, [book]);

  // Populate available voices (async on most browsers).
  useEffect(() => {
    function refresh() {
      setVoices(speechSynthesis.getVoices());
    }
    refresh();
    speechSynthesis.addEventListener("voiceschanged", refresh);
    return () => speechSynthesis.removeEventListener("voiceschanged", refresh);
  }, []);

  // Create the player once the book (and its saved starting position) is known.
  useEffect(() => {
    if (!book) return;
    const player = new TTSPlayer(book.chunks, chunkIndex, rate, voiceURI, {
      onChunkChange: (idx) => {
        setChunkIndex(idx);
        saveProgress({
          bookId: book.id,
          chunkIndex: idx,
          rate: rateRef.current,
          voiceURI: voiceRef.current,
          updatedAt: Date.now(),
        });
      },
      onStateChange: setState,
    });
    playerRef.current = player;
    return () => player.destroy();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [book?.id]);

  useEffect(() => {
    playerRef.current?.setRate(rate);
  }, [rate]);

  useEffect(() => {
    playerRef.current?.setVoice(voiceURI);
  }, [voiceURI]);

  if (!book) {
    return (
      <div className="relative min-h-screen overflow-hidden">
        <WebBackground />
        <div className="relative z-10 mx-auto flex min-h-screen max-w-3xl flex-col items-center justify-center px-6 text-center">
          <p className="text-slate-400">Book not found.</p>
          <Link to="/reader" className="mt-4 text-sm text-sky-400 hover:text-sky-300">
            &larr; Back to library
          </Link>
        </div>
      </div>
    );
  }

  const chunk = book.chunks[chunkIndex];
  const progressPct = book.chunks.length ? Math.round(((chunkIndex + 1) / book.chunks.length) * 100) : 0;

  return (
    <div className="relative min-h-screen overflow-hidden">
      <WebBackground />
      <div className="relative z-10 mx-auto flex min-h-screen max-w-3xl flex-col px-6 py-16">
        <Link to="/reader" className="text-xs uppercase tracking-wide text-sky-400/80 hover:text-sky-300">
          &larr; Library
        </Link>

        <h1 className="mt-3 text-2xl font-semibold text-slate-100">{book.title}</h1>
        <p className="mt-1 text-sm text-sky-400/80">{chunk?.chapter}</p>

        <div className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
          <div className="h-full bg-sky-500 shadow-glow transition-all" style={{ width: `${progressPct}%` }} />
        </div>
        <p className="mt-1 text-xs text-slate-500">
          Segment {chunkIndex + 1} of {book.chunks.length}
        </p>

        <div className="mt-6 rounded-xl border border-slate-800 bg-web-panel/60 p-5 backdrop-blur-sm">
          <p className="max-h-40 overflow-y-auto whitespace-pre-wrap text-sm leading-relaxed text-slate-300">
            {chunk?.text}
          </p>
        </div>

        <div className="mt-6 flex items-center justify-center gap-4">
          <button
            onClick={() => playerRef.current?.skip(-1)}
            className="rounded-full border border-slate-700 p-3 text-slate-300 transition hover:border-slate-500"
            aria-label="Previous segment"
          >
            &#9664;&#9664;
          </button>
          <button
            onClick={() => (state === "playing" ? playerRef.current?.pause() : playerRef.current?.play())}
            className="rounded-full border border-sky-500/60 bg-sky-500/10 px-6 py-3 text-sm font-semibold text-sky-300 transition hover:bg-sky-500/20"
          >
            {state === "playing" ? "Pause" : "Play"}
          </button>
          <button
            onClick={() => playerRef.current?.skip(1)}
            className="rounded-full border border-slate-700 p-3 text-slate-300 transition hover:border-slate-500"
            aria-label="Next segment"
          >
            &#9654;&#9654;
          </button>
        </div>

        <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label className="text-xs text-slate-400">
            Speed
            <select
              value={rate}
              onChange={(e) => setRate(Number(e.target.value))}
              className="mt-1 w-full rounded-lg border border-slate-700 bg-web-panel px-3 py-2 text-sm text-slate-200"
            >
              {RATES.map((r) => (
                <option key={r} value={r}>
                  {r}x
                </option>
              ))}
            </select>
          </label>

          <label className="text-xs text-slate-400">
            Voice
            <select
              value={voiceURI ?? ""}
              onChange={(e) => setVoiceURI(e.target.value || null)}
              className="mt-1 w-full rounded-lg border border-slate-700 bg-web-panel px-3 py-2 text-sm text-slate-200"
            >
              <option value="">Auto (best available)</option>
              {voices.map((v) => (
                <option key={v.voiceURI} value={v.voiceURI}>
                  {v.name} ({v.lang})
                </option>
              ))}
            </select>
          </label>
        </div>

        <p className="mt-10 text-xs text-slate-600">
          Playback continues in the background and with the display off once
          started &mdash; use the lock-screen / notification controls to pause or
          skip. If it stalls, reopening this tab resumes from your last
          segment automatically.
        </p>
      </div>
    </div>
  );
}
