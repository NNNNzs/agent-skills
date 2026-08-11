#!/usr/bin/env python3
"""Extract Google Drive file IDs and canonical links from an exported email.

Usage:
  extract_drive_links.py MESSAGE.eml
  extract_drive_links.py MESSAGE.eml --json

The parser handles common quoted-printable and HTML escaping found in Gmail
messages. It does not access Google Drive or download anything.
"""

from __future__ import annotations

import argparse
import html
import json
import re
from pathlib import Path

PATTERNS = (
    # Gmail's Google Drive attachment chips use this canonical form. Restrict
    # automatic extraction to it: generic docs.google.com/uc links commonly
    # occur in signatures, tracking pixels, or logos and create false positives.
    re.compile(r"https?://drive\.google\.com/file/d/([A-Za-z0-9_-]+)", re.I),
)


def normalize(text: str) -> str:
    """Normalize common quoted-printable and HTML escaping in MIME exports."""
    text = text.replace("=3D", "=")
    text = text.replace("=\r\n", "").replace("=\n", "")
    return html.unescape(text)


def extract(text: str) -> list[dict[str, str]]:
    """Return deduplicated Drive file IDs and canonical URLs in first-seen order."""
    normalized = normalize(text)
    found: list[dict[str, str]] = []
    seen: set[str] = set()
    for pattern in PATTERNS:
        for file_id in pattern.findall(normalized):
            if file_id in seen:
                continue
            seen.add(file_id)
            found.append(
                {
                    "file_id": file_id,
                    "view_url": f"https://drive.google.com/file/d/{file_id}/view",
                    "download_url": f"https://drive.google.com/uc?export=download&id={file_id}",
                }
            )
    return found


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("message", type=Path)
    parser.add_argument("--json", action="store_true", dest="as_json")
    args = parser.parse_args()

    items = extract(args.message.read_text(errors="ignore"))
    if args.as_json:
        print(json.dumps(items, ensure_ascii=False, indent=2))
    else:
        for index, item in enumerate(items, 1):
            print(f"{index:02d}\t{item['file_id']}\t{item['view_url']}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
