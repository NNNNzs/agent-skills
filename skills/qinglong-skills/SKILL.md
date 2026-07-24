---
name: qinglong
description: Manage QingLong (青龙) panel — cron jobs, environment variables, scripts, dependencies, logs and system operations.
metadata: {"openclaw": {"emoji": "🐉", "requires": {"bins": ["curl", "jq"], "env": ["QINGLONG_URL", "QINGLONG_CLIENT_ID", "QINGLONG_CLIENT_SECRET"]}}}
---

# QingLong Panel Skill

Control your [QingLong (青龙)](https://github.com/whyour/qinglong) scheduled task panel via REST API.

📦 ClawHub: https://clawhub.ai/nnnnzs/qinglong-skills
📖 GitHub: https://github.com/NNNNzs/qinglong-skills

## Prerequisites

- `curl` and `jq` installed
- A running QingLong panel with Open API enabled

## Get QingLong API Credentials

1. Open QingLong web UI → **Configuration** → **Application**
2. Click **Create Application**
3. Select the scopes you need (crons / envs / scripts / logs / system)
4. Copy the **Client ID** and **Client Secret**

## Required Environment Variables

| Variable | Description |
|----------|-------------|
| `QINGLONG_URL` | Panel base URL (e.g. `http://192.168.1.100:5700`) |
| `QINGLONG_CLIENT_ID` | Open API Client ID |
| `QINGLONG_CLIENT_SECRET` | Open API Client Secret |

## Setup for Claude Code CLI

This skill works with Claude Code CLI or any agent that can execute shell commands.

### 1. Set environment variables

Add to your `~/.bashrc` or `~/.zshrc`:

```bash
export QINGLONG_URL="https://ql.yourdomain.com"
export QINGLONG_CLIENT_ID="your_client_id"
export QINGLONG_CLIENT_SECRET="your_client_secret"
```

Then reload: `source ~/.bashrc`

### 2. Test the connection

```bash
scripts/ql.sh cron list
```

### 3. Use with Claude Code

Create a `CLAUDE.md` in your project root:

```markdown
# QingLong Panel Management

Use `scripts/ql.sh` to manage the QingLong panel.

Common commands:
- `scripts/ql.sh cron list` — List all cron jobs
- `scripts/ql.sh env list` — List environment variables
- `scripts/ql.sh system info` — Get system info

Full reference: see SKILL.md in this directory.
```

Then run: `claude-code "帮我查看青龙面板的定时任务"`

## Setup for OpenClaw

### Install

```bash
# Via ClawHub (recommended)
clawhub install qinglong-skills

# Or via npx
npx skills add NNNNzs/qinglong-skills

# Or manual copy
cp -r qinglong-skills ~/.openclaw/workspace/skills/qinglong
```

### Configure environment variables

Open `~/.openclaw/openclaw.json` and add under `skills.entries`:

```json5
{
  "skills": {
    "entries": {
      "qinglong": {
        "enabled": true,
        "env": {
          "QINGLONG_URL": "https://ql.yourdomain.com",
          "QINGLONG_CLIENT_ID": "your_client_id",
          "QINGLONG_CLIENT_SECRET": "your_client_secret"
        }
      }
    }
  }
}
```

Restart the gateway: `openclaw gateway restart`

## Quick Reference

### Cron Jobs

```bash
scripts/ql.sh cron list                                    # List all
scripts/ql.sh cron get <id>                                # Get detail
scripts/ql.sh cron create --command "task x.js" --schedule "0 0 * * *" --name "Task"
scripts/ql.sh cron update <id> --name "New Name"
scripts/ql.sh cron delete <id>                             # Delete (supports multiple IDs)
scripts/ql.sh cron run <id>                                # Run now
scripts/ql.sh cron stop <id>                               # Stop
scripts/ql.sh cron enable <id> / disable <id>              # Enable / Disable
scripts/ql.sh cron pin <id> / unpin <id>                   # Pin / Unpin
scripts/ql.sh cron log <id>                                # View log
```

### Environment Variables

```bash
scripts/ql.sh env list                                     # List all
scripts/ql.sh env list "JD"                                # Search
scripts/ql.sh env create --name "KEY" --value "VALUE" --remarks "note"
scripts/ql.sh env update --id <id> --name "KEY" --value "NEW_VALUE"
scripts/ql.sh env delete <id>
scripts/ql.sh env enable <id> / disable <id>
```

### Scripts

```bash
scripts/ql.sh script list                                  # List all
scripts/ql.sh script get --file "test.js"                  # View content
scripts/ql.sh script save --file "test.js" --content "console.log('hi')"
scripts/ql.sh script run --file "test.js"                  # Run
scripts/ql.sh script stop --file "test.js"                 # Stop
scripts/ql.sh script delete --file "test.js"               # Delete
```

### Dependencies

```bash
scripts/ql.sh dep list                                     # List all
scripts/ql.sh dep install --name "axios" --type 0          # 0=node, 1=linux, 2=python3
scripts/ql.sh dep reinstall <id>
scripts/ql.sh dep delete <id>
```

### Subscriptions

```bash
scripts/ql.sh sub list / run <id> / stop <id> / enable <id> / disable <id> / delete <id>
```

### System

```bash
scripts/ql.sh system info                                  # System info
scripts/ql.sh system config                                # System config
scripts/ql.sh system check-update                          # Check updates
scripts/ql.sh system reload                                # Reload
scripts/ql.sh system command-run --command "task test.js"  # Run command
scripts/ql.sh system auth-reset --username admin --password newpass
```

### Token Management

```bash
scripts/ql.sh token refresh                                # Force refresh
scripts/ql.sh token show                                   # Show cached
scripts/ql.sh token clear                                  # Clear cache
```

## Troubleshooting

- **401 Unauthorized**: Check client_id and client_secret are correct
- **Connection refused**: Verify QINGLONG_URL is accessible from this machine
- **Token expired**: The script auto-refreshes tokens; no manual action needed
- **Scope error**: Ensure the application in QingLong has the required scopes enabled

## API Reference

The skill wraps the QingLong Open API. Key endpoints:

| Resource | Endpoints |
|----------|-----------|
| Cron Jobs | GET/POST/PUT/DELETE `/crons`, run/stop/enable/disable/pin/unpin |
| Envs | GET/POST/PUT/DELETE `/envs`, enable/disable |
| Scripts | GET/POST/PUT/DELETE `/scripts`, run/stop |
| Dependencies | GET/POST/PUT/DELETE `/dependencies`, reinstall |
| Subscriptions | GET/POST/PUT/DELETE `/subscriptions`, run/stop/enable/disable |
| Logs | GET/DELETE `/logs` |
| System | GET `/system`, config, reload, update, command-run |
| Config Files | GET/POST `/configs` |

See [references/api.md](references/api.md) for full API documentation.
