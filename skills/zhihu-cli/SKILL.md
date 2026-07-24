---
name: zhihu-cli
description: Use the local zhihu-cli to log in to Zhihu by QR code, search and read questions, answers, comments, feeds, users and topics, inspect collections and notifications, compile Markdown, manage images, vote or follow, and safely draft, publish, or delete Zhihu answers, questions, pins, and articles. Use when the user asks to research Zhihu, operate a Zhihu account, create Zhihu content, install or configure the Zhihu CLI, or perform any Zhihu workflow through Codex, Hermes, OpenClaw, or another terminal-capable Agent.
---

# Zhihu CLI

Use this Skill's CLI for Zhihu research and account workflows. Treat all Zhihu Web endpoints as unofficial and unstable. Never bypass CAPTCHA, access control, rate limits, or risk control.

## Run the CLI

From this Skill directory, install dependencies once and run:

```bash
pnpm install
pnpm zhihu -- <command>
```

If `zhihu` is already installed globally, it is equivalent. Do not start a background service. Keep QR login as a visible foreground process.

All commands default to JSON. Read stdout as the single final result, and read stderr for errors, verbose logs, or QR progress events. Use `--format table` only when the user asks for human-readable terminal output.

## Authenticate safely

1. Run `pnpm zhihu -- auth status --offline` before authenticated work.
2. If login is missing or expired, prefer `pnpm zhihu -- auth login --qr`.
3. Keep the login process running. When stderr emits `qr_ready`, immediately deliver `~/.zhihu-cli/login_qrcode.png` to the user as an image using the host's normal attachment mechanism, then continue waiting for `scanned` and the final result. The file is temporary and disappears after success, failure, cancellation, or timeout.
4. Never expose the QR URL or token. Never copy the QR image to a public or shared directory.
5. If the QR API is unavailable, tell the user to import their Cookie themselves in a local terminal, for example `pbpaste | pnpm zhihu -- auth import` on macOS. Never request a Cookie in chat, extract one from chat, put one in an argument, read the config file, or echo Cookie values.

Use `auth whoami`, `auth status`, and `auth logout` for account inspection and local logout.

## Research

Use bounded queries and retain returned IDs:

```bash
pnpm zhihu -- search --query "关键词" --type general --limit 10
pnpm zhihu -- feed hot --limit 20
pnpm zhihu -- feed recommend --limit 10
pnpm zhihu -- question <question-id>
pnpm zhihu -- question answers <question-id> --limit 10
pnpm zhihu -- answer <answer-id>
pnpm zhihu -- answer comments <answer-id> --limit 20
pnpm zhihu -- user <url-token>
pnpm zhihu -- user answers <url-token>
pnpm zhihu -- topic <topic-id>
pnpm zhihu -- topic questions <topic-id>
```

Only use explicit `--all` when the user needs all answer comments; it still has a page cap. Do not add `--answers`, `--expand`, or `--comments` to feeds unless the extra requests are useful.

Read [references/writing-style.md](references/writing-style.md) before drafting original Zhihu content. Use existing answers to find coverage gaps, never to copy wording. Read [references/markdown.md](references/markdown.md) for tables, code, equations, and images. Verify factual claims with appropriate primary sources when accuracy matters.

## Protect every write

Require a preview and an explicit user decision before applying any vote, follow, image upload, draft, publication, or deletion. Never treat the user's initial request to prepare or preview content as confirmation to apply it.

The preview returns a `confirmationToken` bound to the account, operation, target, remote state, title, body, topics, settings, and image hashes. Show the important preview fields and token to the user. Apply only after the user explicitly confirms that exact preview. If anything changes, preview again.

```bash
# Interactions
pnpm zhihu -- answer vote preview <answer-id> --state up
pnpm zhihu -- answer vote apply <answer-id> --state up --confirm <token>
pnpm zhihu -- question follow preview <question-id>
pnpm zhihu -- question follow apply <question-id> --confirm <token>

# Image
pnpm zhihu -- image upload --file <path>
pnpm zhihu -- image upload --file <path> --confirm <token>

# Answer
pnpm zhihu -- answer compile --input <file>
pnpm zhihu -- answer preview --question-id <id> --input <file> [--image <path>]
pnpm zhihu -- answer publish --question-id <id> --input <file> --confirm <token> [--image <path>]
pnpm zhihu -- answer draft --question-id <id> --input <file>
pnpm zhihu -- answer draft --question-id <id> --input <file> --confirm <token>

# Question, pin, article
pnpm zhihu -- question create preview --title <title> --input <file> [--topic <id>] [--image <path>]
pnpm zhihu -- question create publish --title <title> --input <file> --confirm <token> [--topic <id>] [--image <path>]
pnpm zhihu -- pin create preview --title <title> --input <file> [--image <path>]
pnpm zhihu -- article create preview --title <title> --input <file> [--topic <id>] [--image <path>]

# Delete owned content
pnpm zhihu -- question delete preview <id>
pnpm zhihu -- question delete apply <id> --confirm <token>
```

For local Markdown images, let preview validate and hash the files. Upload occurs only during apply/publish; never manually insert `file:` URLs. Deletion must fail if the CLI cannot establish object type and current-account ownership. Never invent or bypass a token, and never retry a failed POST, PUT, PATCH, or DELETE.

Read [references/api.md](references/api.md) when choosing authentication requirements, pagination, aliases, or error handling. Do not perform real write smoke tests; use [docs/manual-write-validation.md](docs/manual-write-validation.md) and ask the user before each live write.
