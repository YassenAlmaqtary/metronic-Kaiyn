import json
import re
from pathlib import Path

transcript = Path(
    r"C:\Users\USER\.cursor\projects\d-metronic-tailwind-angular\agent-transcripts"
    r"\84acff2d-967b-47bc-a170-ff2b3514200e\84acff2d-967b-47bc-a170-ff2b3514200e.jsonl"
)
output = Path(__file__).resolve().parent / "_bottom_grids_extracted.html"

with transcript.open(encoding="utf-8") as f:
    data = json.loads(f.readline())

text = data["message"]["content"][0]["text"]

first_end = text.find("<!-- end: grid -->")
start = text.find("<!-- begin: grid -->", first_end + 1)
second_end = text.find("<!-- end: grid -->", start)
end = text.find("<!-- end: grid -->", second_end + 1) + len("<!-- end: grid -->")
content = text[start:end]

content = re.sub(r'href="html/demo1/[^"]*"', 'href="#"', content)
content = re.sub(r'href=""', 'href="#"', content)
content = re.sub(r"<style>.*?</style>", "", content, flags=re.DOTALL)
content = re.sub(r"<input([^>]*?)>\s*</input>", r"<input\1 />", content)
content = re.sub(r"<input([^>/]*?)>", r"<input\1 />", content)
content = re.sub(r"<img([^>]*?)(?<!/)>", r"<img\1 />", content)

lines = content.split("\n")
out_lines = []
for line in lines:
    stripped = line.lstrip()
    if not stripped:
        out_lines.append("")
        continue
    orig_tabs = len(line) - len(line.lstrip("\t "))
    new_tabs = max(2, orig_tabs - 5)
    out_lines.append("\t" * new_tabs + stripped)

output.write_text("\n".join(out_lines), encoding="utf-8")
print(f"Wrote {len(out_lines)} lines to {output}")
