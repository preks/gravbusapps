# AI Builder Troubleshooting Guide

## Issue: Chat Does Nothing When I Type

This means the AI Builder can't connect to FORGE. Here's how to fix it:

### Step 1: Check if FORGE is Running

```bash
# Try to connect to FORGE
curl http://localhost:3000/api/health

# Expected response:
{"status":"ok"}

# If this fails, FORGE is not running!
```

### Step 2: Start FORGE

```bash
cd /Users/denisprekrat/Documents/APPS/NEWWORK\ Apps/forge

# Install dependencies (first time only)
pnpm install

# Start FORGE
pnpm run dev
```

You should see:

```
🚀 API Server running on http://localhost:3000
```

### Step 3: Verify FORGE is Working

Open a new terminal:

```bash
curl http://localhost:3000/api/health
```

If you see `{"status":"ok"}`, FORGE is running! ✅

### Step 4: Check Repository is Indexed

```bash
curl http://localhost:3000/api/repos/gravbusapps-main/status
```

**If you get 404 or error**: Repository is NOT indexed!

**Fix**: Index the repository:

1. Open FORGE dashboard: http://localhost:3001/dashboard
2. Click "Add Repository"
3. Enter URL: `https://github.com/preks/gravbusapps`
4. Branch: `main`
5. Click "Start Indexing"
6. Wait 5-10 minutes for completion

### Step 5: Test AI Builder Again

1. Open AI Builder: http://localhost:3001/apps/platform/ai-builder
2. Type something like: "Create a simple welcome screen"
3. Press Send

You should now see the AI responding! 🎉

## Common Errors and Solutions

### Error: "Failed to fetch" or "Network Error"

**Cause**: FORGE is not running or wrong URL

**Solution**:

```bash
# Check if FORGE is running
lsof -i :3000

# If nothing, start FORGE:
cd /Users/denisprekrat/Documents/APPS/NEWWORK\ Apps/forge
pnpm run dev
```

### Error: "Repository not found"

**Cause**: gravbusapps repository not indexed in FORGE

**Solution**:

1. Go to FORGE dashboard: http://localhost:3001/dashboard
2. Add repository: https://github.com/preks/gravbusapps
3. Wait for indexing to complete

### Error: "CORS Error" in Browser Console

**Cause**: FORGE not allowing requests from your domain

**Solution**:
FORGE should already have CORS enabled. If not, check FORGE's `packages/api/src/server.ts` has:

```typescript
app.use(cors())
```

### Error: "Repository status: indexing"

**Cause**: Repository is still being indexed

**Solution**:
Wait for indexing to complete. Check status:

```bash
curl http://localhost:3000/api/repos/gravbusapps-main/status
```

Look for `"status": "completed"`

### Chat Shows Error Message

**Check the error message in chat**. It will tell you:

- If FORGE is not running
- If repository is not indexed
- The specific error

### Browser Console Shows Errors

Open browser DevTools (F12) and check Console tab.

**Common errors:**

1. **"Failed to fetch"**: FORGE not running
2. **"404 Not Found"**: Wrong repository ID or not indexed
3. **"Network request failed"**: Check if FORGE URL is correct

## Verify Your Setup

Run this checklist:

### ✅ Prerequisites

- [ ] Node.js 20+ installed: `node --version`
- [ ] pnpm installed: `pnpm --version`
- [ ] Git installed: `git --version`

### ✅ FORGE Running

- [ ] FORGE started: `cd forge && pnpm run dev`
- [ ] Health check works: `curl http://localhost:3000/api/health`
- [ ] Port 3000 is free: `lsof -i :3000`

### ✅ Repository Indexed

- [ ] Repository added in FORGE dashboard
- [ ] Indexing completed (status: "completed")
- [ ] Can query status: `curl http://localhost:3000/api/repos/gravbusapps-main/status`

### ✅ AI Builder Running

- [ ] Dev server started: `npm run dev`
- [ ] Can access: http://localhost:3001/apps/platform/ai-builder
- [ ] No console errors in browser
- [ ] Chat interface visible

### ✅ Test End-to-End

- [ ] Type message in chat
- [ ] AI responds with streaming text
- [ ] Files are generated
- [ ] Can switch to Files tab
- [ ] Files show up in tree

## Still Not Working?

### Check FORGE Logs

In the terminal where FORGE is running, check for errors:

- Look for `ERROR` messages
- Look for connection issues
- Look for port conflicts

### Check Browser Console

1. Open DevTools (F12)
2. Go to Console tab
3. Look for red errors
4. Check Network tab for failed requests

### Check Environment Variables

Create `.env` in gravity-business-apps root:

```env
FORGE_API_URL=http://localhost:3000
PUBLISH_API_URL=http://localhost:3002
```

Then restart dev server:

```bash
npm run dev
```

### Manual Test FORGE API

```bash
# Test query endpoint
curl -X POST http://localhost:3000/api/analyze/query-agentic \
  -H "Content-Type: application/json" \
  -d '{
    "repoId": "gravbusapps-main",
    "query": "What does this codebase do?",
    "stream": false,
    "buildEnabled": false
  }'
```

If this works, FORGE is fine and the issue is in AI Builder.

### Reset Everything

If nothing works, start fresh:

```bash
# Stop all services
# Press Ctrl+C in all terminals

# Kill any stuck processes
lsof -i :3000 | grep node | awk '{print $2}' | xargs kill -9
lsof -i :3001 | grep node | awk '{print $2}' | xargs kill -9

# Start FORGE
cd /Users/denisprekrat/Documents/APPS/NEWWORK\ Apps/forge
pnpm run dev

# Wait for FORGE to start (30 seconds)

# In new terminal, start gravity-business-apps
cd /Users/denisprekrat/Documents/APPS/NEWWORK\ Apps/BusinessApps/gravity-business-apps
npm run dev

# Wait for dev server to start (30 seconds)

# Open AI Builder
open http://localhost:3001/apps/platform/ai-builder
```

## Quick Debug Commands

```bash
# Check what's running on ports
lsof -i :3000  # FORGE API
lsof -i :3001  # Dev server
lsof -i :3002  # Publish service

# Check FORGE health
curl http://localhost:3000/api/health

# Check repository status
curl http://localhost:3000/api/repos/gravbusapps-main/status

# List all repositories in FORGE
curl http://localhost:3000/api/repos

# Check if dev server is running
curl http://localhost:3001
```

## Success Indicators

When everything is working:

1. **FORGE Terminal**: Shows "API Server running on http://localhost:3000"
2. **Dev Server Terminal**: Shows "Local: http://localhost:3001"
3. **Browser**: AI Builder loads without errors
4. **Chat**: Typing and sending shows AI response
5. **Network Tab**: Shows successful POST to FORGE API

## Need More Help?

1. Check FORGE documentation in `/Users/denisprekrat/Documents/APPS/NEWWORK Apps/forge/docs/`
2. Check if gravbusapps repo is public and accessible
3. Verify you have proper API keys if needed
4. Check firewall/antivirus not blocking localhost connections

---

**Most Common Issue**: FORGE not running!
**Solution**: `cd forge && pnpm run dev`
