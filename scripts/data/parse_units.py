"""Parse faction units out of the core rulebook using font information."""
import html
import json
import re
import sys

import pymupdf

PDF = r"D:\Random RPG\Hellpiercers\Hellpiercers Core Rules.pdf"
OUT = sys.argv[1] if len(sys.argv) > 1 else "units.json"

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
NON_UNIT_LABELS = {
    "STRATCOM ACTIONS",
    "UPGRADES",
    "STARTING LOCATIONS",
    "UNIQUE LOCATIONS",
    "UNIQUE MECHANICS",
    "UNIQUE FORTIFICATIONS",
    "FORTIFICATIONS",
}
SECTION_LABELS = {"AGNOSIA": "agnosia", "SPECIAL": "special"}
HEADING_LABELS = {"STAINWALK": "Stainwalk", "THRASHING PHASE": "Thrashing Phase", "SLUMBERING PHASE": "Slumbering Phase"}

d = pymupdf.open(PDF)
units = []
cur = None
section = None
prev = None  # (page, x, y0)
last_title_y = None


def faction_for(p):
    for k, a, b in FACTION_PAGES:
        if a <= p <= b:
            return k
    return None


def spans_html(line):
    out = []
    for s in line["spans"]:
        t = s["text"]
        if not t.strip():
            out.append(t)
            continue
        t = html.escape(t, quote=False)
        if "Bold" in s["font"] and "Garamond" in s["font"]:
            out.append(f"<strong>{t}</strong>")
        else:
            out.append(t)
    return "".join(out)


def join_lines(lines):
    """Join wrapped lines into a paragraph, repairing hyphenated line breaks."""
    text = ""
    for ln in lines:
        if not text:
            text = ln
        elif re.search(r"[A-Za-z]-$", text) and re.match(r"[a-z]", re.sub(r"<[^>]+>", "", ln)[:1] or " "):
            text = text[:-1] + ln
        else:
            text = text + " " + ln
    text = re.sub(r"</strong>\s*<strong>", " ", text)
    text = text.replace("</strong><strong>", "")
    return text.strip()


def new_unit(name, faction, boss=False):
    global cur, section
    cur = {
        "name": name,
        "code": "",
        "subtitle": "",
        "faction": faction,
        "boss": boss,
        "flavor": [],
        "tags": [],
        "hp": None,
        "hp_total": False,
        "agnosia": None,
        "scale": None,
        "speed": None,
        "crown": None,
        "actions": None,
        "sprawl": None,
        "attacks": [],
        "agnosia_text": [],
        "special_text": [],
        "stats_done": False,
        "_para": [],
    }
    units.append(cur)
    section = None


def flush_para():
    global cur
    if cur is None or not cur["_para"]:
        return
    text = join_lines(cur["_para"])
    sec = cur.get("_sec", "attacks")
    if sec == "attacks":
        cur["attacks"].append(text)
    elif sec == "agnosia":
        cur["agnosia_text"].append(text)
    else:
        cur["special_text"].append(text)
    cur["_para"] = []


def stat(text):
    t = text.strip()
    found = False
    m = re.search(r"Tags:\s*(.*?)(?=\s+(?:HP:|\d+\s*HP|AGNOSIA|Scale|Speed|Crown|Actions|Sprawl)|$)", t)
    if m:
        cur["tags"] = [x.strip() for x in re.split(r"[,.]", m.group(1)) if x.strip()]
        found = True
    m = re.search(r"AGNOSIA:?\s*(\d+)\s*HP", t, re.I)
    if m:
        cur["agnosia"] = int(m.group(1))
        found = True
    t_noag = re.sub(r"\(?AGNOSIA:?\s*\d+\s*HP\)?", "", t, flags=re.I)
    m = re.search(r"(\d+)\s*HP(\s*Total)?", t_noag) or re.search(r"HP:\s*(\d+)", t_noag)
    if m:
        cur["hp"] = int(m.group(1))
        cur["hp_total"] = bool(m.lastindex and m.lastindex >= 2 and m.group(2))
        found = True
    m = re.search(r"Scale:?\s*(\d+)", t)
    if m:
        cur["scale"] = int(m.group(1))
        found = True
    m = re.search(r"Sprawl:?\s*(\d+)", t)
    if m:
        cur["sprawl"] = int(m.group(1))
        found = True
    m = re.search(r"Speed:?\s*(.*?)(?=\s+Actions|$)", t)
    if m:
        cur["speed"] = m.group(1).strip()
        found = True
    m = re.search(r"Actions:?\s*([\d/]+)", t)
    if m:
        cur["actions"] = m.group(1)
        found = True
    if "Crown:" in t:
        cur["crown"] = t.count("\u0398")
        found = True
    return found


for pno in range(143, 221):
    page = d[pno - 1]
    faction = faction_for(pno)
    for block in page.get_text("dict")["blocks"]:
        for line in block.get("lines", []):
            text = "".join(s["text"] for s in line["spans"]).strip()
            if not text:
                continue
            fonts = {s["font"] for s in line["spans"]}
            size = max(s["size"] for s in line["spans"])
            x0, y0 = line["bbox"][0], line["bbox"][1]
            fam = next(iter(fonts))

            if "Ancient" in fam or "DODavid" in fam:
                continue

            if "CHIKARA" in fam:
                if size >= 25:
                    flush_para()
                    new_unit(text.title() if text.isupper() else text, faction, boss=True)
                elif cur and cur["boss"] and not cur["stats_done"]:
                    cur["subtitle"] = (cur["subtitle"] + " " + text).strip()
                continue

            if "BigShoulders" in fam and size >= 15:
                up = text.upper()
                if up in NON_UNIT_LABELS:
                    flush_para()
                    cur = None
                    continue
                if up in SECTION_LABELS and cur:
                    flush_para()
                    cur["_sec"] = SECTION_LABELS[up]
                    continue
                if up in HEADING_LABELS and cur:
                    flush_para()
                    cur["_sec"] = "special"
                    cur["special_text"].append("<h4>" + HEADING_LABELS[up] + "</h4>")
                    continue
                if re.search(r":\s*\d\s*$", text) and not re.search(r"\(", text):
                    continue  # the faction Crown line
                flush_para()
                # Wrapped title: continue the previous title if its parenthesis was not closed
                if cur and not cur["stats_done"] and cur["name"].count("(") > cur["name"].count(")") and not cur["flavor"]:
                    cur["name"] += " " + text
                    continue
                new_unit(text, faction)
                continue

            if cur is None:
                continue

            spans = line["spans"]
            bs = next(
                (i for i, sp in enumerate(spans) if "BigShoulders" in sp["font"] and sp["size"] < 15),
                None,
            )
            if bs is not None:
                before = "".join(sp["text"] for sp in spans[:bs]).strip()
                if before and not cur["stats_done"]:
                    cur["flavor"].append(before)
                stat_text = "".join(sp["text"] for sp in spans[bs:]).strip()
                if stat(stat_text):
                    cur["stats_done"] = True
                    prev = None
                continue
            if "Arial" in fam and text.startswith("Crown"):
                if stat(text):
                    cur["stats_done"] = True
                continue

            if "Italic" in fam:
                if not cur["stats_done"]:
                    cur["flavor"].append(text)
                continue

            if "Garamond" in fam:
                if not cur["stats_done"]:
                    continue
                gap_new = prev is None or prev[0] != pno or abs(prev[1] - x0) > 20 or (y0 - prev[2]) > 14.5 or (y0 - prev[2]) < 0
                if gap_new:
                    flush_para()
                cur.setdefault("_sec", "attacks")
                cur["_para"].append(spans_html(line).strip())
                prev = (pno, x0, y0)

flush_para()

out = []
for u in units:
    u.pop("_para", None)
    u["_sec"] = u.pop("_sec", None)
    u["flavor"] = join_lines(u["flavor"])
    m = re.match(r"^(.*?)\s*\(\s*[\u201c\"“]?([^\u201d\"”)]+)[\u201d\"”]?\s*\)\s*$", u["name"])
    if m:
        u["name"], u["code"] = m.group(1).strip(), m.group(2).strip()
    u["name"] = re.sub(r"\s+-\s*$", "", u["name"]).strip()
    out.append(u)

merged = []
for u in out:
    # A wrapped title leaves a unit with no stats followed by a unit with only a parenthesis
    if merged and merged[-1]["hp"] is None and not merged[-1]["tags"] and (not u["name"] or u["name"].startswith("(")):
        merged[-1]["code"] = u["code"] or merged[-1]["code"]
        for k in ("hp", "hp_total", "tags", "agnosia", "scale", "speed", "crown", "actions", "sprawl"):
            merged[-1][k] = u[k]
        for k in ("flavor", "attacks", "agnosia_text", "special_text"):
            merged[-1][k] = u[k] or merged[-1][k]
        continue
    merged.append(u)
final = []
for u in merged:
    if u["hp"] is None and not u["tags"]:
        continue
    # "Allotriopragmon (The Petty Tyrant)": the English epithet is the name players know
    if u["code"] and (u["code"].startswith("The ") or " " in u["code"]) and not u["name"].startswith("The "):
        u["name"], u["code"] = u["code"], u["name"]
    u["name"] = u["name"].replace("\u0144", "")
    if u["boss"]:
        u["name"] = u["name"].title()
    final.append(u)
out = final
json.dump(out, open(OUT, "w", encoding="utf-8"), indent=1, ensure_ascii=False)
print(len(out), "units")
for u in out:
    print(
        f"{u['faction'][:5]:5} {u['name'][:34]:34} {','.join(u['tags'])[:30]:30} hp={u['hp']}{'T' if u['hp_total'] else ''} ag={u['agnosia']} sc={u['scale']} sp={u['speed']} cr={u['crown']} act={u['actions']} spr={u['sprawl']} atk={len(u['attacks'])} agT={len(u['agnosia_text'])} spT={len(u['special_text'])}"
    )
