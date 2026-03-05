# Gravity Business Apps — Agent Instructions

## Product Issues API

This project tracks bugs and feature suggestions via a remote API at `https://product.newwork.com`.
Use the following curl commands to interact with it. All requests require the auth header shown below.

### Auth header (required on every request)

```
-H "X-Gravity-Issues-Token: 55555"
```

### List issues

```bash
curl -s "https://product.newwork.com/api/gravity/issues" \
  -H "X-Gravity-Issues-Token: 55555" | jq .
```

### Filter issues

Combine any of these query parameters:

| Parameter    | Values                              | Example                          |
| ------------ | ----------------------------------- | -------------------------------- |
| `status`     | `OPEN`, `IN_PROGRESS`, `DONE`       | `?status=OPEN`                   |
| `type`       | `BUG`, `SUGGESTION`                 | `?type=BUG`                      |
| `screenKey`  | screen path                         | `?screenKey=platform/apps/nexus` |
| `ownerEmail` | email address                       | `?ownerEmail=user@example.com`   |
| `q`          | keyword search in title/description | `?q=login+error`                 |
| `id`         | single issue UUID                   | `?id=UUID`                       |
| `since`      | ISO date (inclusive, >=)            | `?since=2026-03-04`              |
| `until`      | ISO date (inclusive, <=)            | `?until=2026-03-05`              |
| `limit`      | 1–200 (default 50)                  | `?limit=100`                     |

Examples:

```bash
# All open issues
curl -s "https://product.newwork.com/api/gravity/issues?status=OPEN" \
  -H "X-Gravity-Issues-Token: 55555" | jq .

# Issues reported in the last 24 hours
curl -s "https://product.newwork.com/api/gravity/issues?since=$(date -u -d '1 day ago' +%Y-%m-%dT%H:%M:%SZ 2>/dev/null || date -u -v-1d +%Y-%m-%dT%H:%M:%SZ)" \
  -H "X-Gravity-Issues-Token: 55555" | jq .

# Issues from a specific date range
curl -s "https://product.newwork.com/api/gravity/issues?since=2026-03-01&until=2026-03-04" \
  -H "X-Gravity-Issues-Token: 55555" | jq .

# Open bugs on a specific screen
curl -s "https://product.newwork.com/api/gravity/issues?status=OPEN&type=BUG&screenKey=platform/apps/every-office" \
  -H "X-Gravity-Issues-Token: 55555" | jq .
```

### Get single issue with full details

Always fetch a single issue by ID to get complete information including logs and screenshot:

```bash
curl -s "https://product.newwork.com/api/gravity/issues?id=ISSUE_UUID" \
  -H "X-Gravity-Issues-Token: 55555" | jq '.items[0]'
```

### Response format

Each issue contains:

- `id`, `title`, `description`, `type`, `status`, `screenKey`, `screenDisplayName`
- `ownerEmail`, `reporterName`, `pageUrl`, `createdAt`
- `buildInfo.evidence.screenshot` — base64 screenshot of the page at report time
- `buildInfo.evidence.telemetry.console` — array of captured console errors/warnings: `{ level, message, timestamp }`
- `buildInfo.evidence.telemetry.network` — array of failed network requests: `{ method, url, status, duration }`
- `resolutionNotes` — explanation of the fix (populated when status=DONE)
- `resolvedBy` — who resolved it (e.g. "Codex Automation", person name)
- `resolvedAt` — ISO timestamp of when it was resolved

**Important**: When investigating an issue, ALWAYS fetch it by ID and inspect `buildInfo.evidence` for the screenshot, console logs, and failed network requests. These contain critical debugging context.

### Update issue status

```bash
# Set to in progress
curl -s -X POST "https://product.newwork.com/api/gravity/issue-status" \
  -H "Content-Type: application/json" \
  -H "X-Gravity-Issues-Write-Token: 55555" \
  -d '{"id": "ISSUE_UUID", "status": "IN_PROGRESS"}' | jq .

# Mark as done WITH resolution details (always do this when closing a bug)
curl -s -X POST "https://product.newwork.com/api/gravity/issue-status" \
  -H "Content-Type: application/json" \
  -H "X-Gravity-Issues-Write-Token: 55555" \
  -d '{"id": "ISSUE_UUID", "status": "DONE", "resolution_notes": "Description of what was wrong and how it was fixed", "resolved_by": "Codex Automation"}' | jq .
```

**Important**: When marking an issue as DONE, ALWAYS include `resolution_notes` (what was wrong and what was changed) and `resolved_by` (your identity, e.g. "Codex Automation" for automated runs, or a person's name).

### Delete an issue

```bash
curl -s -X POST "https://product.newwork.com/api/gravity/issue-delete" \
  -H "Content-Type: application/json" \
  -H "X-Gravity-Issues-Write-Token: 55555" \
  -d '{"id": "ISSUE_UUID"}' | jq .
```

### List registered screens

```bash
curl -s "https://product.newwork.com/api/gravity/screens" \
  -H "X-Gravity-Issues-Token: 55555" | jq .
```

## Workflow

When asked to fix a bug or work on a reported issue:

1. Fetch the issue details by ID using the API above
2. Read `buildInfo.evidence.telemetry.console` for console errors/warnings
3. Read `buildInfo.evidence.telemetry.network` for failed network requests
4. The `screenKey` maps to a file path under `src/business-apps/` (e.g. `platform/apps/every-office` → `src/business-apps/platform/apps/every-office/`)
5. After fixing, update the issue status to `DONE` with `resolution_notes` explaining the fix and `resolved_by` identifying yourself

When asked for a daily review or summary:

1. Fetch issues with `?since=YYYY-MM-DD` for the relevant period
2. Group by screen and type
3. Highlight any with console errors or failed network requests
