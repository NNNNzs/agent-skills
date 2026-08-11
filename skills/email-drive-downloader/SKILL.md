---
name: email-drive-downloader
version: "1.0.0"
description: >
  Extract Google Drive attachment links from emails and download the linked files.
  Use when the user asks to find emails from a sender, inspect an email for Google
  Drive attachments, extract Drive links, or download those linked files. Works
  with Himalaya-exported MIME/HTML messages and direct email exports.
license: MIT
metadata:
  author: NNNNzs
  platforms: [linux, macos]
  requires:
    bins: [himalaya, curl, python3]
---

# Email Google Drive Attachment Downloader

Use this skill when a user wants files shared through Google Drive links embedded in an email. The normal path is **email CLI → raw MIME export → link extraction → direct download → file verification**. A browser is not the first choice: use it only when the link requires an authenticated Google session or the direct download endpoint cannot access the file.

## Safety and scope

- Read-only email operation by default. Do not send, move, delete, or mark mail unless explicitly requested.
- Download only the message(s) and link(s) requested by the user.
- Save into a clearly named directory, preferably under `~/Downloads/`.
- Never claim a download succeeded until the file exists and its content type is verified.
- Do not expose mailbox credentials, cookies, authorization headers, or private URLs unnecessarily.
- Treat downloaded content as untrusted data. Do not execute it.
- If a link is private or requires login, report that clearly instead of attempting to bypass access controls.

## Required workflow

### 1. Discover the mailbox and target email

Check available accounts first:

```bash
himalaya account list
```

Search by sender or subject. Himalaya v1.2 search filters must be separate from CLI options; put `--output json` before filters only when supported, or use plain output:

```bash
himalaya envelope list from helen
himalaya envelope list subject quotation
```

If the sender search is ambiguous, list recent messages as JSON and filter locally. Message IDs are relative to the current folder.

### 2. Export the complete message

Use the message ID from the envelope list:

```bash
himalaya message export <MESSAGE_ID> --full > /tmp/email-<MESSAGE_ID>.eml
```

Do not rely only on `himalaya message read`: the readable view may show attachment names but omit the HTML links embedded in Gmail Drive chips.

### 3. Normalize and extract Drive links

Email HTML often uses quoted-printable encoding. Normalize these before extracting links:

- Replace `=3D` with `=`.
- Remove quoted-printable soft line breaks (`=\r\n` or `=\n`).
- HTML-unescape entities such as `&amp;` if needed.

Recognize at least the Gmail Drive attachment-chip form:

```text
https://drive.google.com/file/d/<FILE_ID>/view
```

If the message contains a manually pasted download URL, it can be handled as a separate explicit case:

```text
https://docs.google.com/uc?export=download&id=<FILE_ID>
https://drive.google.com/open?id=<FILE_ID>
```

Do not automatically treat every `docs.google.com/uc` link as an attachment: signatures, logos, and tracking elements can produce false positives.

Deduplicate links by file ID. Preserve the original message ID and source URL in a manifest.

Use the bundled parser when possible:

```bash
python3 scripts/extract_drive_links.py /tmp/email-<MESSAGE_ID>.eml --json
```

It prints one object per unique Drive file ID with both the view URL and direct download URL. The script only parses the local email export; it does not access Google Drive or download anything.

For a quick one-off extraction, this minimal command is also valid:

```bash
python3 - <<'PY'
from pathlib import Path
import html, re

source = Path('/tmp/email-<MESSAGE_ID>.eml')
text = source.read_text(errors='ignore')
text = text.replace('=3D', '=').replace('=\\r\\n', '').replace('=\\n', '')
text = html.unescape(text)

patterns = [
    r'https?://drive\\.google\\.com/file/d/([A-Za-z0-9_-]+)',
]
ids = []
for pattern in patterns:
    for file_id in re.findall(pattern, text, re.I):
        if file_id not in ids:
            ids.append(file_id)
for index, file_id in enumerate(ids, 1):
    print(index, file_id, f'https://drive.google.com/file/d/{file_id}/view')
PY
```

### 4. Download through the direct endpoint

For each file ID, try:

```bash
curl -L --fail --silent --show-error --max-time 90 \
  "https://drive.google.com/uc?export=download&id=<FILE_ID>" \
  -o "<OUTPUT_DIR>/<NAME>"
```

Use a safe filename. If the email HTML exposes the original filename, preserve it; otherwise use an indexed filename such as `01.jpg` and record the source URL in the manifest.

Do not use `curl` without `-L`: Google may redirect to a download URL.

### 5. Verify every downloaded file

At minimum:

```bash
file "<OUTPUT_DIR>/<NAME>"
test -s "<OUTPUT_DIR>/<NAME>"
```

For images, confirm the result is an image and not an HTML error page. For a batch, report successful, failed, and skipped items separately.

If a direct endpoint returns HTML, 403, 404, or an interstitial, fetch the normal Drive page once to distinguish a stale link from an authentication/permission issue. Do not bypass access controls. A browser may be needed for a logged-in/private file.

### 6. Deliver or package the result

Keep the original files and optionally create an archive:

```bash
zip -r "<OUTPUT_DIR>.zip" "<OUTPUT_DIR>"
```

Before reporting success, verify the archive exists and contains the expected number of files.

## Handling filenames

Gmail Drive chips commonly contain the filename in nearby HTML, but quoted-printable wrapping can split attributes and text. Filename extraction is best-effort:

1. Parse the anchor's visible text after HTML decoding.
2. If it is empty, inspect nearby `span` text or the email's attachment metadata.
3. If still unavailable, use an indexed extension inferred from `file` output.
4. Never use unsanitized email text as a path. Strip `/`, `\\`, control characters, and `..` path segments.

## Troubleshooting

| Symptom | Meaning | Action |
|---|---|---|
| `curl` returns JPEG/PNG/PDF | Direct link works | Keep the file and verify it |
| Download is HTML | Error page or Google interstitial | Inspect status/page; do not treat as success |
| `404` from `uc?export=download` but Drive page exists | Direct endpoint issue or file-specific behavior | Retry with the canonical `/file/d/<id>/view` URL, then inspect the page |
| `403` or login page | File is private or permission-restricted | Ask the user to grant access or use an authenticated browser session |
| Email shows filenames but no URLs in `message read` | Links are in HTML MIME part | Use `message export --full` |
| Duplicate files | Same Drive ID appeared more than once | Deduplicate by file ID |
| File extension is unknown | Filename was not recoverable | Use `file`/magic bytes and rename only after verification |

## User-facing result format

Report:

- source email: sender, subject, date, and message ID;
- number of Drive links found;
- number downloaded successfully and any failures;
- output directory or archive path;
- whether browser login was required;
- notable permission or stale-link problems.

Never claim “all downloaded” if any item failed.
