import type { Chunk } from "./types";

export type PlayerState = "idle" | "playing" | "paused" | "finished";

export interface TTSPlayerCallbacks {
  onChunkChange?: (index: number) => void;
  onStateChange?: (state: PlayerState) => void;
}

/**
 * A single silent, looping audio element. Chrome/Android only exempts a tab
 * from background-tab throttling (and only shows MediaSession lock-screen
 * controls) while a real <audio>/<video> element is actively playing, so we
 * keep one alive for the whole session instead of relying on speechSynthesis
 * alone, which gets suspended a few seconds after the screen turns off.
 */
const SILENT_WAV_DATA_URI =
  "data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=";

function pickBestVoice(voices: SpeechSynthesisVoice[], preferredURI: string | null): SpeechSynthesisVoice | null {
  if (preferredURI) {
    const preferred = voices.find((v) => v.voiceURI === preferredURI);
    if (preferred) return preferred;
  }
  const english = voices.filter((v) => v.lang.toLowerCase().startsWith("en"));
  const pool = english.length ? english : voices;
  const ranked = [...pool].sort((a, b) => score(b) - score(a));
  return ranked[0] ?? null;

  function score(v: SpeechSynthesisVoice): number {
    const name = v.name.toLowerCase();
    let s = 0;
    if (name.includes("natural")) s += 3;
    if (name.includes("neural")) s += 3;
    if (name.includes("google")) s += 2;
    if (!v.localService) s += 1; // network voices are usually higher quality
    return s;
  }
}

export class TTSPlayer {
  private chunks: Chunk[];
  private index: number;
  private rate: number;
  private voiceURI: string | null;
  private state: PlayerState = "idle";
  private keepAlive: HTMLAudioElement;
  private watchdog: number | null = null;
  private callbacks: TTSPlayerCallbacks;
  private destroyed = false;

  constructor(chunks: Chunk[], startIndex: number, rate: number, voiceURI: string | null, callbacks: TTSPlayerCallbacks = {}) {
    this.chunks = chunks;
    this.index = Math.min(startIndex, Math.max(chunks.length - 1, 0));
    this.rate = rate;
    this.voiceURI = voiceURI;
    this.callbacks = callbacks;

    this.keepAlive = new Audio(SILENT_WAV_DATA_URI);
    this.keepAlive.loop = true;
    this.keepAlive.volume = 0;

    this.setupMediaSession();
  }

  private setupMediaSession() {
    if (!("mediaSession" in navigator)) return;
    const chapter = this.chunks[this.index]?.chapter ?? "";
    navigator.mediaSession.metadata = new MediaMetadata({
      title: chapter,
      artist: "Reader",
      album: "Audiobook",
    });
    navigator.mediaSession.setActionHandler("play", () => this.play());
    navigator.mediaSession.setActionHandler("pause", () => this.pause());
    navigator.mediaSession.setActionHandler("previoustrack", () => this.skip(-1));
    navigator.mediaSession.setActionHandler("nexttrack", () => this.skip(1));
  }

  private setState(state: PlayerState) {
    this.state = state;
    if ("mediaSession" in navigator) {
      navigator.mediaSession.playbackState = state === "playing" ? "playing" : "paused";
    }
    this.callbacks.onStateChange?.(state);
  }

  private speakCurrent() {
    if (this.destroyed) return;
    const chunk = this.chunks[this.index];
    if (!chunk) {
      this.setState("finished");
      speechSynthesis.cancel();
      return;
    }
    this.callbacks.onChunkChange?.(this.index);
    if ("mediaSession" in navigator) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: chunk.chapter,
        artist: "Reader",
        album: "Audiobook",
      });
    }

    const utterance = new SpeechSynthesisUtterance(chunk.text);
    utterance.rate = this.rate;
    const voice = pickBestVoice(speechSynthesis.getVoices(), this.voiceURI);
    if (voice) utterance.voice = voice;

    utterance.onend = () => {
      if (this.destroyed || this.state !== "playing") return;
      this.index += 1;
      this.speakCurrent();
    };
    utterance.onerror = () => {
      if (this.destroyed || this.state !== "playing") return;
      this.index += 1;
      this.speakCurrent();
    };

    speechSynthesis.speak(utterance);
  }

  play() {
    if (this.destroyed) return;
    this.setState("playing");
    this.keepAlive.play().catch(() => {});
    if (!this.watchdog) {
      // Chrome silently pauses long-running speech synthesis in the
      // background; nudging resume() periodically is the standard workaround.
      this.watchdog = window.setInterval(() => {
        if (speechSynthesis.paused) speechSynthesis.resume();
      }, 4000);
    }
    if (speechSynthesis.speaking || speechSynthesis.pending) {
      speechSynthesis.resume();
    } else {
      this.speakCurrent();
    }
  }

  pause() {
    this.setState("paused");
    speechSynthesis.pause();
    this.keepAlive.pause();
  }

  skip(delta: number) {
    const wasPlaying = this.state === "playing";
    speechSynthesis.cancel();
    this.index = Math.max(0, Math.min(this.chunks.length - 1, this.index + delta));
    this.callbacks.onChunkChange?.(this.index);
    if (wasPlaying) this.speakCurrent();
  }

  seekTo(index: number) {
    const wasPlaying = this.state === "playing";
    speechSynthesis.cancel();
    this.index = Math.max(0, Math.min(this.chunks.length - 1, index));
    this.callbacks.onChunkChange?.(this.index);
    if (wasPlaying) this.speakCurrent();
  }

  setRate(rate: number) {
    this.rate = rate;
  }

  setVoice(voiceURI: string | null) {
    this.voiceURI = voiceURI;
  }

  getState() {
    return this.state;
  }

  getIndex() {
    return this.index;
  }

  destroy() {
    this.destroyed = true;
    if (this.watchdog) window.clearInterval(this.watchdog);
    speechSynthesis.cancel();
    this.keepAlive.pause();
    if ("mediaSession" in navigator) {
      navigator.mediaSession.setActionHandler("play", null);
      navigator.mediaSession.setActionHandler("pause", null);
      navigator.mediaSession.setActionHandler("previoustrack", null);
      navigator.mediaSession.setActionHandler("nexttrack", null);
    }
  }
}
