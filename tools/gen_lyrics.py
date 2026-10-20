# Generate js/data.js from the .lrc + audio envelope.
import json, re, io

LRC = r"D:\code\video\AWAAWA - WHAT ROBOTS NEED (hazama RUNWAY ver.).lrc"
OUT = r"D:\code\video\mv\js\data.js"

lines = []
with io.open(LRC, encoding="utf-8") as f:
    for raw in f:
        raw = raw.strip()
        if not raw:
            continue
        m = re.match(r"^\[(\d+):(\d+(?:\.\d+)?)\](.*)$", raw)
        if m:
            mm, ss, text = int(m.group(1)), float(m.group(2)), m.group(3).strip()
            lines.append((mm * 60 + ss, text))
        else:
            j = re.match(r'^\{"t":(\d+),"c":(.*)\}$', raw)
            if j:
                # metadata header (lyrics by / music by) - skip from sung lines
                pass

lines.sort(key=lambda x: x[0])
# normalise doubled spaces that appear in the source file
for i, (t, s) in enumerate(lines):
    s2 = re.sub(r"\s{2,}", " ", s).strip()
    lines[i] = (round(t, 2), s2)

print(len(lines), "lyric lines")
for t, s in lines:
    print(f"{t:7.2f}  {s}")

out = "/* AUTO-GENERATED from the project .lrc — do not hand-edit. */\n"
out += "window.LYRICS = " + json.dumps([{"t": t, "s": s} for t, s in lines], ensure_ascii=False, indent=0).replace("\n", "") + ";\n"
with io.open(OUT, "w", encoding="utf-8") as f:
    f.write(out)
print("wrote", OUT)
