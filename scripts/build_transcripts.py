#!/usr/bin/env python3
"""Build readable, timestamped transcripts from raw/words/<id>.json.

    python3 scripts/build_transcripts.py --full OUTDIR   # whole videos (for finding boundaries)
    python3 scripts/build_transcripts.py                 # sermon-only files in transcripts/

Sermon-only output uses the start/end seconds in data/sermon_boundaries.json.
Paragraphs break at speaker changes (">>" in YouTube captions) and at sentence
ends once a paragraph runs ~30 seconds (hard break at ~45 s for unpunctuated captions), so every line carries a usable timestamp.
"""
import argparse
import json
import os
import re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def ts(sec):
    sec = int(sec)
    h, m, s = sec // 3600, sec % 3600 // 60, sec % 60
    return f"{h}:{m:02d}:{s:02d}" if h else f"{m}:{s:02d}"


def load_words(vid):
    with open(os.path.join(ROOT, "raw", "words", vid + ".json"), encoding="utf-8") as f:
        return json.load(f)["words"]


def paragraphs(words, start=0.0, end=None, max_len=30.0):
    out, cur, cur_t = [], [], None
    for ms, tok in words:
        t = ms / 1000
        if t < start or (end is not None and t > end):
            continue
        tok = tok.replace("\n", " ")
        speaker_change = tok.strip().startswith(">>")
        if speaker_change and cur:
            out.append((cur_t, "".join(cur).strip()))
            cur, cur_t = [], None
        if cur_t is None:
            cur_t = t
        if cur and not tok.startswith(" ") and not cur[-1].endswith(" "):
            tok = " " + tok
        cur.append(tok)
        # Older captions have no punctuation, so fall back to a hard break.
        if t - cur_t >= max_len and (re.search(r"[.?!]$", tok.strip()) or t - cur_t >= max_len * 1.5):
            out.append((cur_t, "".join(cur).strip()))
            cur, cur_t = [], None
    if cur:
        out.append((cur_t, "".join(cur).strip()))
    return out


def render(paras):
    return "\n\n".join(f"[{ts(t)}] {p}" for t, p in paras) + "\n"


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--full", metavar="OUTDIR", help="write whole-video transcripts here instead")
    a = ap.parse_args()

    with open(os.path.join(ROOT, "data", "confirmed_sermons.json"), encoding="utf-8") as f:
        sermons = json.load(f)["sermons"]

    if a.full:
        os.makedirs(a.full, exist_ok=True)
        for s in sermons:
            with open(os.path.join(a.full, s["id"] + ".txt"), "w", encoding="utf-8") as f:
                f.write(render(paragraphs(load_words(s["id"]))))
        return

    with open(os.path.join(ROOT, "data", "sermon_boundaries.json"), encoding="utf-8") as f:
        bounds = {b["id"]: b for b in json.load(f)["sermons"]}
    outdir = os.path.join(ROOT, "transcripts")
    os.makedirs(outdir, exist_ok=True)
    for s in sermons:
        b = bounds.get(s["id"])
        if not b or b.get("exclude"):
            continue
        paras = paragraphs(load_words(s["id"]), b["start"], b["end"])
        d = s["upload_date"]
        head = [f"# {b.get('sermon_title') or s['title']}", "",
                f"- Speaker: {b['speaker']}",
                f"- Video: {s['url']} ({s['title']})",
                f"- Uploaded: {d[:4]}-{d[4:6]}-{d[6:]}" + (f"; preached {b['preached']}" if b.get("preached") else ""),
                f"- Sermon runs {ts(b['start'])} to {ts(b['end'])} of the {s['duration']} video",
                f"- Source: YouTube auto-captions (not hand-corrected; names and scripture references may be misheard)"]
        if b.get("notes"):
            head.append(f"- Notes: {b['notes']}")
        with open(os.path.join(outdir, f"{d}_{s['id']}.md"), "w", encoding="utf-8") as f:
            f.write("\n".join(head) + "\n\n---\n\n" + render(paras))


if __name__ == "__main__":
    main()
