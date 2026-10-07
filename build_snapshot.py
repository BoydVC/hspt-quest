#!/usr/bin/env python3
"""Builds dist/hspt-quest-snapshot.html: one offline file with the CSS, JS and question bank baked in."""
import json
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import build_bank  # noqa: E402


def main():
    build_bank.main()
    web = os.path.join(HERE, "web")
    page = open(os.path.join(web, "index.html"), encoding="utf-8").read()
    css = open(os.path.join(web, "app.css"), encoding="utf-8").read()
    js = open(os.path.join(web, "app.js"), encoding="utf-8").read()
    bank = json.load(open(os.path.join(HERE, "data", "bank.json"), encoding="utf-8"))
    data = json.dumps(bank, ensure_ascii=False, separators=(",", ":")).replace("</", "<\\/").replace("<!--", "<\\!--")
    js = re.sub(r"</(script)", r"<\\/\1", js, flags=re.I)
    page = page.replace('<link rel="stylesheet" href="app.css">', "<style>\n" + css + "\n</style>")
    page = page.replace('<script src="app.js"></script>',
                        "<script>window.__BANK__ = " + data + ";</script>\n<script>\n" + js + "\n</script>")
    page = page.replace("<title>HSPT Quest</title>", "<title>HSPT Quest (offline)</title>")
    assert "app.css" not in page and 'src="app.js"' not in page
    assert not re.search(r"https?://", page), "snapshot must not reference the network"
    out = os.path.join(HERE, "dist", "hspt-quest-snapshot.html")
    os.makedirs(os.path.dirname(out), exist_ok=True)
    with open(out + ".tmp", "w", encoding="utf-8") as f:
        f.write(page)
    os.replace(out + ".tmp", out)
    print("wrote %s (%d KB, %d questions)" % (out, os.path.getsize(out) // 1024, len(bank["questions"])))


if __name__ == "__main__":
    main()
