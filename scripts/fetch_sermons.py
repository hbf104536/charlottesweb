#!/usr/bin/env python3
"""Download audio for Pastor Bill's sermons (data/sermon_boundaries.json) and
transcribe it locally with faster-whisper.

Run this from the repo root on a home computer. YouTube blocks audio downloads
from cloud servers, which is why this runs on your machine.

    python3 scripts/fetch_sermons.py --whisper --push   # audio + Whisper, then commit & push
    python3 scripts/fetch_sermons.py --no-audio --captions   # captions only

Outputs (text files are committed; audio and caption downloads are not):
    raw/whisper/<id>.json            Whisper segments + word timestamps
    raw/audio/<id>.<ext>             audio only, kept local (gitignored)
    raw/captions/<id>.<lang>.json3   YouTube captions (with --captions; gitignored)
    raw/manifest.json                what succeeded / failed per video
"""
import argparse
import glob
import json
import os
import shutil
import subprocess
import sys
import time

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RAW = os.path.join(ROOT, "raw")
CAPTIONS = os.path.join(RAW, "captions")
AUDIO = os.path.join(RAW, "audio")
WHISPER = os.path.join(RAW, "whisper")


def sermon_ids():
    with open(os.path.join(ROOT, "data", "sermon_boundaries.json"), encoding="utf-8") as f:
        return [s["id"] for s in json.load(f)["sermons"] if not s.get("exclude")]


def js_runtime_args():
    # YouTube downloads need a JavaScript runtime; deno is yt-dlp's default.
    for name in ("deno", "node", "bun"):
        if shutil.which(name):
            return [] if name == "deno" else ["--js-runtimes", name]
    print("WARNING: no JavaScript runtime found (deno, node or bun). Captions may still work,\n"
          "but audio downloads will probably fail. Install deno: https://deno.com")
    return []


def ytdlp(args, extra):
    cmd = [sys.executable, "-m", "yt_dlp", "--no-progress", "--sleep-requests", "1"] + extra + args
    return subprocess.run(cmd).returncode == 0


def fetch_captions(vid, extra):
    if glob.glob(os.path.join(CAPTIONS, vid + ".*.json3")):
        return True
    ytdlp(["--skip-download", "--write-subs", "--write-auto-subs",
           "--sub-langs", "en.*,en", "--sub-format", "json3",
           "-o", os.path.join(CAPTIONS, "%(id)s.%(ext)s"),
           "--", "https://www.youtube.com/watch?v=" + vid], extra)
    return bool(glob.glob(os.path.join(CAPTIONS, vid + ".*.json3")))


def fetch_audio(vid, extra):
    existing = [p for p in glob.glob(os.path.join(AUDIO, vid + ".*")) if not p.endswith(".part")]
    if existing:
        return existing[0]
    # Native audio stream, no re-encoding, so ffmpeg is not required.
    ytdlp(["-f", "bestaudio[ext=m4a]/bestaudio", "--no-playlist",
           "-o", os.path.join(AUDIO, "%(id)s.%(ext)s"),
           "--", "https://www.youtube.com/watch?v=" + vid], extra)
    existing = [p for p in glob.glob(os.path.join(AUDIO, vid + ".*")) if not p.endswith(".part")]
    return existing[0] if existing else None


def transcribe(vid, audio_path, model, model_name):
    out = os.path.join(WHISPER, vid + ".json")
    if os.path.exists(out):
        return True
    t0 = time.time()
    segments, info = model.transcribe(audio_path, language="en", word_timestamps=True,
                                      vad_filter=True, beam_size=5)
    segs = []
    for s in segments:
        segs.append({"start": round(s.start, 2), "end": round(s.end, 2), "text": s.text.strip(),
                     "words": [{"start": round(w.start, 2), "end": round(w.end, 2), "word": w.word}
                               for w in (s.words or [])]})
        print(f"\r  {vid}: {s.end / 60:5.1f} min transcribed", end="", flush=True)
    with open(out, "w", encoding="utf-8") as f:
        json.dump({"id": vid, "model": model_name, "duration": info.duration, "segments": segs}, f, ensure_ascii=False)
    print(f"\n  done in {(time.time() - t0) / 60:.1f} min")
    return True


def git_push():
    paths = ["raw/manifest.json"] + (["raw/whisper"] if os.path.isdir(WHISPER) else [])
    subprocess.run(["git", "-C", ROOT, "add", "--"] + paths, check=True)
    if subprocess.run(["git", "-C", ROOT, "diff", "--cached", "--quiet"]).returncode == 0:
        print("Nothing new to commit.")
        return
    subprocess.run(["git", "-C", ROOT, "commit", "-m", "Add raw sermon captions/transcripts"], check=True)
    subprocess.run(["git", "-C", ROOT, "push"], check=True)


def main():
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    p.add_argument("--captions", action="store_true", help="also download YouTube captions")
    p.add_argument("--no-audio", action="store_true", help="skip audio (and so Whisper)")
    p.add_argument("--whisper", action="store_true", help="transcribe audio with faster-whisper")
    p.add_argument("--model", default="small.en",
                   help="faster-whisper model (small.en is a good laptop default; medium.en is more accurate but slower)")
    p.add_argument("--cookies-from-browser", metavar="BROWSER",
                   help="only if YouTube asks you to sign in, e.g. chrome, firefox, safari")
    p.add_argument("--only", nargs="*", help="limit to these video IDs")
    p.add_argument("--push", action="store_true", help="git commit & push the text outputs when done")
    a = p.parse_args()

    try:
        import yt_dlp  # noqa: F401
    except ImportError:
        sys.exit('yt-dlp is not installed. Run:  python3 -m pip install -U "yt-dlp[default]"')

    model = None
    if a.whisper:
        try:
            from faster_whisper import WhisperModel
        except ImportError:
            sys.exit("faster-whisper is not installed. Run:  python3 -m pip install -U faster-whisper")
        print(f"Loading Whisper model {a.model} (first run downloads it)...")
        model = WhisperModel(a.model, device="auto", compute_type="int8")

    extra = js_runtime_args()
    if a.cookies_from_browser:
        extra += ["--cookies-from-browser", a.cookies_from_browser]

    for d in (CAPTIONS if a.captions else None, AUDIO, WHISPER if a.whisper else None):
        if d:
            os.makedirs(d, exist_ok=True)

    manifest_path = os.path.join(RAW, "manifest.json")
    manifest = json.load(open(manifest_path)) if os.path.exists(manifest_path) else {}
    ids = a.only or sermon_ids()
    for n, vid in enumerate(ids, 1):
        print(f"\n[{n}/{len(ids)}] {vid}")
        m = manifest.setdefault(vid, {})
        if a.captions:
            m["captions"] = fetch_captions(vid, extra)
        if not a.no_audio:
            audio = fetch_audio(vid, extra)
            m["audio"] = bool(audio)
            if a.whisper and audio:
                m["whisper"] = transcribe(vid, audio, model, a.model)
        with open(manifest_path, "w") as f:
            json.dump(manifest, f, indent=1)

    print("\nSummary (captions / audio / whisper):")
    for vid in ids:
        m = manifest.get(vid, {})
        print(f"  {vid}  " + "  ".join("yes" if m.get(k) else ("-" if k not in m else "FAILED")
                                       for k in ("captions", "audio", "whisper")))
    if a.push:
        git_push()


if __name__ == "__main__":
    main()
