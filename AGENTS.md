# Gravity Business Apps — Agent Instructions

## Product Issues API

This project tracks bugs and feature suggestions via a remote API at `https://product.newwork.com`.
Use the following curl commands to interact with it. All requests require the auth header shown below.

### Auth header (required on every request)

```
-H "X-Gravity-Issues-Token: 55555"
```

### List all issues

```bash
curl -s "https://product.newwork.com/api/gravity/issues" \
  -H "X-Gravity-Issues-Token: 55555" | jq .
```

### Filter issues

Add query parameters to filter:

```bash
# By status: OPEN, IN_PROGRESS, DONE
curl -s "https://product.newwork.com/api/gravity/issues?status=OPEN" \
  -H "X-Gravity-Issues-Token: 55555" | jq .

# By screen key
curl -s "https://product.newwork.com/api/gravity/issues?screenKey=platform/apps/every-office" \
  -H "X-Gravity-Issues-Token: 55555" | jq .

# By type: BUG or SUGGESTION
curl -s "https://product.newwork.com/api/gravity/issues?type=BUG" \
  -H "X-Gravity-Issues-Token: 55555" | jq .

# By owner email
curl -s "https://product.newwork.com/api/gravity/issues?ownerEmail=user@example.com" \
  -H "X-Gravity-Issues-Token: 55555" | jq .

# Search by keyword in title/description
curl -s "https://product.newwork.com/api/gravity/issues?q=login+error" \
  -H "X-Gravity-Issues-Token: 55555" | jq .

# Single issue by ID
curl -s "https://product.newwork.com/api/gravity/issues?id=ISSUE_UUID" \
  -H "X-Gravity-Issues-Token: 55555" | jq .
```

### Response format

Each issue has: `id`, `title`, `description`, `type` (BUG/SUGGESTION), `status` (OPEN/IN_PROGRESS/DONE), `screenKey`, `screenDisplayName`, `ownerEmail`, `reporterName`, `pageUrl`, `createdAt`, and `buildInfo` (which contains `evidence` with `screenshot`, `telemetry.console` logs, and `telemetry.network` failed requests).

### Update issue status

```bash
curl -s -X POST "https://product.newwork.com/api/gravity/issue-status" \
  -H "Content-Type: application/json" \
  -H "X-Gravity-Issues-Write-Token: 55555" \
  -d '{"id": "ISSUE_UUID", "status": "IN_PROGRESS"}' | jq .
```

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

1. Fetch the issue details using the API above
2. Check `buildInfo.evidence` for console logs and failed network requests
3. The `screenKey` maps to a file path under `src/business-apps/` (e.g. `platform/apps/every-office` → `src/business-apps/platform/apps/every-office/`)
4. After fixing, update the issue status to `IN_PROGRESS` or `DONE`
