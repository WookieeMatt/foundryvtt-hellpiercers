"""Extract the numbered RECON roll tables (pages 66-90) with light formatting."""
import html
import json
import re
import sys

import pymupdf

PDF = r"D:\Random RPG\Hellpiercers\Hellpiercers Core Rules.pdf"
OUT = sys.argv[1] if len(sys.argv) > 1 else "tables.json"
TABLES = [
    ("Chambers of Forbidden Truths", 66, 69),
    ("Corridors", 70, 73),
    ("Vaults", 74, 78),
    ("Legendary Arms", 79, 81),
    ("Scavenge", 82, 84),
    ("Scout", 85, 87),
    ("Travel", 88, 90),
]
d = pymupdf.open(PDF)


def span_html(s):
    t = html.escape(s["text"], quote=False)
    if not t.strip():
        return t
    f = s["font"]
    if "Bold" in f and "Garamond" in f:
        t = f"<strong>{t}</strong>"
    if "Italic" in f and "Garamond" in f:
        t = f"<em>{t}</em>"
    return t


def join(lines):
    text = ""
    for ln in lines:
        if not text:
            text = ln
        elif re.search(r"[A-Za-z]-$", re.sub(r"<[^>]+>", "", text)) and re.match(r"[a-z]", re.sub(r"<[^>]+>", "", ln)[:1] or " "):
            text = re.sub(r"-(</[a-z]+>)?$", r"\1", text) + ln
        else:
            text = text + " " + ln
    text = re.sub(r"</(strong|em)>\s*<\1>", " ", text)
    text = text.replace("</strong><strong>", "").replace("</em><em>", "")
    return re.sub(r" {2,}", " ", text).strip()


result = {}
for title, a, b in TABLES:
    entries = []
    cur = None
    para = []
    prev = None

    def flush():
        global para
        if para and cur is not None:
            cur["blocks"].append(("p", join(para)))
        para = []

    for pno in range(a, b + 1):
        prev = None
        for blk in d[pno - 1].get_text("dict")["blocks"]:
            for line in blk.get("lines", []):
                spans = line["spans"]
                text = "".join(s["text"] for s in spans).strip()
                if not text:
                    continue
                fam = spans[0]["font"]
                if "Ancient" in fam or "DODavid" in fam:
                    continue
                size = max(s["size"] for s in spans)
                x0, y0 = line["bbox"][0], line["bbox"][1]
                if "Stencil" in fam and size >= 20:
                    if re.fullmatch(r"\d+", text):
                        flush()
                        cur = {"n": int(text), "blocks": []}
                        entries.append(cur)
                    continue
                if cur is None:
                    continue
                if "BigShoulders" in fam and size >= 15:
                    flush()
                    cur["blocks"].append(("h", html.escape(text, quote=False)))
                    prev = None
                    continue
                if "BigShoulders" in fam:
                    flush()
                    cur["blocks"].append(("s", html.escape(text, quote=False)))
                    prev = None
                    continue
                if re.fullmatch(r"\d{2,3}", text) and size < 14 and y0 > 700:
                    continue  # page number
                new_para = (
                    prev is None
                    or (y0 - prev[2]) > 14.5
                    or (y0 - prev[2]) < 0
                    or bool(re.match(r"^(\d+\s*[-–]\s*\d+|\d+)\s*:", text))
                )
                if "Italic" in fam and prev and not new_para:
                    pass
                if new_para:
                    flush()
                para.append("".join(span_html(s) for s in spans).strip())
                prev = (pno, x0, y0)
        # a page break never splits an entry's paragraph mid-sentence in practice, keep the buffer
        prev = None
    flush()
    result[title] = [{"n": e["n"], "blocks": e["blocks"]} for e in entries]

json.dump(result, open(OUT, "w", encoding="utf-8"), indent=1, ensure_ascii=False)
for t, es in result.items():
    print(t, len(es), [e["n"] for e in es])
