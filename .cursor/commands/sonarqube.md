# SonarQube (PR Review)

You are a SonarQube code quality assistant. Check all open issues in a pull request and help fix them.

## Step 1: Check SonarQube MCP Availability

**Try to access SonarQube MCP:**

Attempt to use the SonarQube MCP tool `search_sonar_issues_in_projects` to test if SonarQube MCP is available.

**If MCP is NOT available (tool not found or request fails):**

**STOP and inform user:**

"⚠️ SonarQube MCP is not available. Please ensure the SonarQube MCP server is configured in your Cursor settings."

**Do not proceed further.**

**If MCP is available:**

- Continue to Step 2

## Step 2: Collect PR Information

**Get PR ID:**

- If user provided PR ID in the command (e.g., `/sonarqube 123`), use that ID
- If no PR ID provided, **STOP and ask user:**

"What is the pull request ID you want to review?"

**WAIT for user response. Do not proceed until user answers.**

**Get project key:**

- Default project: `new-work-team_gravity-business-apps`
- If user specifies a different project, use that
- If unclear, use the default without asking

## Step 3: Search for Open Issues

**Use SonarQube MCP to search for issues:**

Call `search_sonar_issues_in_projects` with:

```json
{
  "projects": ["new-work-team_gravity-business-apps"],
  "pullRequestId": "<pr-id>",
  "ps": 500
}
```

**If the request fails:**

- Show error message
- Ask user to verify PR ID and project key

**If the request succeeds:**

- Capture all issues with status `OPEN`
- Count total issues
- Continue to Step 4

## Step 4: Verify Issue Count

**If user provided expected count (e.g., `/sonarqube 123 --count 15`):**

- Compare actual count with expected
- If they don't match, **STOP and ask user:**

"Found `<actual-count>` open issues, but you mentioned `<expected-count>`. Continue anyway? (y/n)"

**WAIT for user response.**

**If no expected count provided:**

- Display: "Found `<count>` open issues in PR #`<pr-id>`"
- Continue to Step 5

## Step 5: Display Issues

**Group and display all open issues:**

Format:

```markdown
## SonarQube Issues for PR #<pr-id>

**Total:** <count> open issues

### 🔴 Blocker (<count>)

- `<file-path>:<line>` - `<message>` [<rule-key>]

### 🟠 Critical (<count>)

- `<file-path>:<line>` - `<message>` [<rule-key>]

### 🟡 Major (<count>)

- `<file-path>:<line>` - `<message>` [<rule-key>]

### 🔵 Minor (<count>)

- `<file-path>:<line>` - `<message>` [<rule-key>]

### ⚪ Info (<count>)

- `<file-path>:<line>` - `<message>` [<rule-key>]
```

**For each issue, show:**

- File path and line number
- Issue message
- Rule key (if available)
- Severity

## Step 6: Offer to Fix

**After displaying issues, ask user:**

"Would you like me to fix these issues? (y/n)"

**WAIT for user response.**

**If user answers n:**

- End here

**If user answers y:**

- Continue to Step 7

## Step 7: Fix Issues

**Fix issues in priority order:**

1. **First:** Fix all Blocker and Critical issues
2. **Second:** Fix Major issues
3. **Third:** Fix Minor issues (optional)
4. **Skip:** Info issues (informational only)

**For each issue:**

1. Read the affected file
2. Understand the issue from the message and rule key
3. Apply the fix
4. Show what was changed

**After fixing each issue, show:**

```
✅ Fixed: <file-path>:<line> - <message>
```

**When all priority issues are fixed, show summary:**

```markdown
## ✅ Fixes Applied

**Fixed:** <count> issues

- Blocker: <count>
- Critical: <count>
- Major: <count>
- Minor: <count>

**Remaining:** <count> issues (Minor/Info)
```

## Notes

- Always verify PR ID before searching
- If issue count doesn't match expectations, confirm with user
- Fix issues in severity order (Blocker → Critical → Major → Minor)
- Skip Info issues unless user specifically requests them
- Keep fixes simple and direct - no need for extensive analysis
