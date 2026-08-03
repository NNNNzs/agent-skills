---
name: zhihu-cli
description: Use the zhihu command to import a local Zhihu Cookie, research questions, answers, comments, feeds, users and topics, compile Markdown, and safely preview or apply Zhihu account actions. Use for Zhihu research, account workflows, content creation, or CLI setup in Codex, Hermes, OpenClaw, and other terminal-capable agents.
homepage: https://github.com/NNNNzs/zhihu-cli
metadata:
  version: "1.0.0"
  author: NNNNzs
  license: AGPL-3.0-only
  repository: https://github.com/NNNNzs/zhihu-cli
  openclaw:
    emoji: "🧠"
    homepage: https://github.com/NNNNzs/zhihu-cli
    requires:
      bins: [node, npm]
---

# Zhihu CLI

Use this Skill's CLI for Zhihu research and account workflows. Treat all Zhihu Web endpoints as unofficial and unstable. Never bypass CAPTCHA, access control, rate limits, or risk control.

## Run the CLI

Install with npm once, then use the canonical `zhihu` command:

```bash
# From the npm registry after the package is published
npm install -g zhihu-cli

# Or install the current GitHub source with npm
npm install -g github:NNNNzs/zhihu-cli

zhihu <command>
```

The package name and Skill name are `zhihu-cli`; `zhihu` is the canonical executable. `zhihu-cli` remains a compatibility executable only. Do not start a background service.

All commands default to JSON. Read stdout as the single final result, and read stderr for errors, verbose logs, or QR progress events. Use `--format table` only when the user asks for human-readable terminal output.

## Authenticate safely

1. Run `zhihu auth status --offline` before authenticated work.
2. If login is missing or expired, ask the user to copy their Cookie in their own local browser and import it through stdin, for example `pbpaste | zhihu auth import` on macOS.
3. Never request a Cookie in chat, extract one from chat, put one in an argument, read the config file, or echo Cookie values.
4. QR login is not the recommended path: the upstream QR endpoint currently returns HTTP 403. If it is explicitly requested after that warning, keep it as a visible foreground process and never expose its URL or token.

Cookie import automatically attempts safe completion; use `auth repair` for an existing config. A 401 may require repair or a fresh QR login because there is no verified Web refresh-token protocol. Use `auth whoami`, `auth status`, and `auth logout` for account inspection and local logout.

## Research

Use bounded queries and retain returned IDs:

```bash
pnpm zhihu -- search --query "关键词" --type general --limit 10
pnpm zhihu -- feed hot --limit 20
pnpm zhihu -- feed hot-search --limit 20
pnpm zhihu -- feed recommend --limit 10
pnpm zhihu -- question <question-id>
pnpm zhihu -- question answers <question-id> --limit 10
pnpm zhihu -- answer <answer-id>
pnpm zhihu -- answer comments <answer-id> --limit 20
pnpm zhihu -- article show <article-id>
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
zhihu answer vote preview <answer-id> --state up
zhihu answer vote apply <answer-id> --state up --confirm <token>
zhihu question follow preview <question-id>
zhihu question follow apply <question-id> --confirm <token>

# Image
zhihu image upload --file <path>
zhihu image upload --file <path> --confirm <token>

# Answer
zhihu answer compile --input <file>
zhihu answer preview --question-id <id> --input <file> [--image <path>]
zhihu answer publish --question-id <id> --input <file> --confirm <token> [--image <path>]
zhihu answer draft --question-id <id> --input <file>
zhihu answer draft --question-id <id> --input <file> --confirm <token>

# Question, pin, article
zhihu question create preview --title <title> --input <file> [--topic <id>] [--image <path>]
zhihu question create publish --title <title> --input <file> --confirm <token> [--topic <id>] [--image <path>]
zhihu pin create preview --title <title> --input <file> [--image <path>]
zhihu article create preview --title <title> --input <file> [--topic <id>] [--image <path>]

# Delete owned content
zhihu question delete preview <id>
zhihu question delete apply <id> --confirm <token>
```

For local Markdown images, let preview validate and hash the files. Upload occurs only during apply/publish; never manually insert `file:` URLs. Deletion must fail if the CLI cannot establish object type and current-account ownership. Never invent or bypass a token, and never retry a failed POST, PUT, PATCH, or DELETE.

Read [references/api.md](references/api.md) when choosing authentication requirements, pagination, aliases, or error handling. Do not perform real write smoke tests; use [docs/manual-write-validation.md](docs/manual-write-validation.md) and ask the user before each live write.
