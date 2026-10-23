#!/usr/bin/env python3
"""Parse image-search JSON outputs (with leading log lines) and download all images locally."""
import json, os, sys, urllib.request, pathlib

SCRIPTS = pathlib.Path("/home/z/my-project/scripts")
OUT = pathlib.Path("/home/z/my-project/public/salons")
OUT.mkdir(parents=True, exist_ok=True)

ALL_URLS = []
for jf in sorted(SCRIPTS.glob("img-*.json")):
    text = jf.read_text()
    # Skip leading non-JSON lines
    json_start = text.find("{")
    if json_start < 0:
        print(f"!! No JSON in {jf}")
        continue
    try:
        data = json.loads(text[json_start:])
    except Exception as e:
        print(f"!! {jf}: {e}")
        continue
    if not data.get("success"):
        print(f"!! {jf} not success: {data}")
        continue
    for r in data["results"]:
        url = r.get("original_url")
        if url and url not in ALL_URLS:
            ALL_URLS.append(url)
    print(f"{jf.name}: {len(data['results'])} results")

print(f"\nTotal unique URLs: {len(ALL_URLS)}")

# Download each
mapping = {}
for i, url in enumerate(ALL_URLS, 1):
    ext = ".jpg"
    if url.lower().endswith(".png"):
        ext = ".png"
    elif url.lower().endswith(".jpeg"):
        ext = ".jpeg"
    fname = f"salon-{i:02d}{ext}"
    target = OUT / fname
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
        with urllib.request.urlopen(req, timeout=60) as resp, open(target, "wb") as out:
            out.write(resp.read())
        size = target.stat().st_size
        if size < 1024:
            print(f"!! Too small {fname}: {size} bytes")
            target.unlink()
            continue
        mapping[url] = fname
        print(f"  [{i:02d}] {fname} ({size//1024} KB)  <- {url}")
    except Exception as e:
        print(f"!! Failed {url}: {e}")

# Save mapping
(SCRIPTS / "image-map.json").write_text(json.dumps(mapping, indent=2))
print(f"\nDone. Mapping saved to scripts/image-map.json")
