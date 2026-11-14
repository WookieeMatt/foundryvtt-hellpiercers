"""Extract each faction's STRATCOM Actions and Unique Mechanics (with map hazards) from the PDF."""
import html
import json
import re
import sys

import pymupdf

PDF = r"D:\Random RPG\Hellpiercers\Hellpiercers Core Rules.pdf"
OUT = sys.argv[1] if len(sys.argv) > 1 else "actions.json"
FACTION_PAGES = [
    ("syncrasis", 143, 152),
    ("henosis", 153, 162),
    ("autophyes", 163, 174),
    ("mixis", 175, 184),
    ("metricos", 185, 192),
    ("paracletus", 193, 202),
    ("theletus", 203, 212),
    ("ekklesia", 213, 220),
]
d = pymupdf.open(PDF)


def faction_for(p):
    for k, a, b in FACTION_PAGES:
        if a <= p <= b:
            return k


def span_html(s):
    t = html.escape(s["text"], quote=False)
    if t.strip() and "Bold" in s["font"] and "Garamond" in s["font"]:
        return f"<strong>{t}</strong>"
    return t


def join(lines):
    text = ""
    for ln in lines:
        plain = re.sub(r"<[^>]+>", "", text)
        if not text:
            text = ln
        elif re.search(r"[A-Za-z]-$", plain) and re.match(r"[a-z]", re.sub(r"<[^>]+>", "", ln)[:1] or " "):
            text = re.sub(r"-(</[a-z]+>)?$", r"\1", text) + ln
        else:
            text = text + " " + ln
    text = text.replace("</strong> <strong>", " ").replace("</strong><strong>", "")
    return re.sub(r" {2,}", " ", text).strip()


MODES = {
    "STRATCOM ACTIONS": "actions",
    "UNIQUE MECHANICS": "mechanics",
    "UNIQUE FORTIFICATIONS": None,
    "FORTIFICATIONS": None,
    "UPGRADES": None,
    "STARTING LOCATIONS": None,
    "UNIQUE LOCATIONS": None,
}

result = {k: {"actions": [], "mechanics": []} for k, *_ in FACTION_PAGES}
mode = None
cur = None
sub = None
para = []
flavor = []
prev = None


def target():
    return sub if sub is not None else cur


def flush():
    global para, flavor
    t = target()
    if t is not None:
        if flavor:
            t["flavor"] = join(flavor)
        if para:
            t["body"].append(join(para))
    para = []
    flavor = []


def new_item(faction, kind, name):
    global cur, sub
    flush()
    sub = None
    cur = {"name": name, "crown": None, "flavor": "", "body": [], "subs": []}
    result[faction][kind].append(cur)


for pno in range(143, 221):
    faction = faction_for(pno)
    for blk in d[pno - 1].get_text("dict")["blocks"]:
        for line in blk.get("lines", []):
            spans = line["spans"]
            text = "".join(s["text"] for s in spans).strip()
            if not text:
                continue
            fam = spans[0]["font"]
            size = max(s["size"] for s in spans)
            y0, x0 = line["bbox"][1], line["bbox"][0]
            if "Ancient" in fam or "DODavid" in fam or "CHIKARA" in fam:
                continue
            if "Stencil" in fam and size >= 20:
                flush()
                up = text.upper()
                if up in MODES:
                    mode = MODES[up]
                    cur = sub = None
                elif re.fullmatch(r"\d+", text):
                    pass
                else:
                    mode = None
                    cur = sub = None
                prev = None
                continue
            if mode is None:
                continue
            if "Stencil" in fam and 12 <= size < 20:
                new_item(faction, mode, text)
                prev = None
                continue
            if cur is None:
                continue
            if "BigShoulders" in fam and size >= 15:
                flush()
                sub = {"name": text, "flavor": "", "body": []}
                cur["subs"].append(sub)
                prev = None
                continue
            if "Italic" in fam and not para:
                flavor.append(text)
                prev = (pno, x0, y0)
                continue
            if "Garamond" in fam or "BigShoulders" in fam:
                starts_stage = bool(re.match(r"^(Stage \d+|Crown:)", text))
                gap = prev is None or prev[0] != pno or (y0 - prev[2]) > 14.5 or (y0 - prev[2]) < 0
                if flavor and not para:
                    t = target()
                    t["flavor"] = join(flavor)
                    flavor = []
                if gap or starts_stage:
                    if para:
                        t = target()
                        t["body"].append(join(para))
                        para = []
                line_html = "".join(
                    (f"<strong>{html.escape(s['text'], quote=False)}</strong>" if "BigShoulders" in s["font"] and s["text"].strip() else span_html(s))
                    for s in spans
                )
                para.append(line_html.strip())
                prev = (pno, x0, y0)
flush()

for f in result.values():
    for kind in ("actions", "mechanics"):
        for it in f[kind]:
            if it["body"] and "Crown:" in re.sub(r"<[^>]+>", "", it["body"][0])[:8]:
                it["crown"] = it["body"][0].count("\u0398")
json.dump(result, open(OUT, "w", encoding="utf-8"), indent=1, ensure_ascii=False)
for fid, f in result.items():
    print(fid, [(a["name"], a["crown"], len(a["body"]), len(a["subs"])) for a in f["actions"]], "| mech:", [(a["name"], len(a["body"])) for a in f["mechanics"]])
