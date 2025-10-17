# URGENT DEBUG STEPS

## The Issue
- Error happens on **iteration 2** of the agentic loop (within the same request)
- First iteration works fine
- Error: Claude expects thinking blocks first, but gets text blocks

## Since FORGE Demo Works...

There must be something different. Please do this:

### Step 1: Open FORGE Demo
```
http://forge-demo.vercel.app (or wherever your production FORGE demo is)
```

### Step 2: Open Browser DevTools
Press F12, go to **Network** tab

### Step 3: Type a Message
Type: "Create a simple component"
Press Send

### Step 4: Find the Request
Look for `query-agentic` in Network tab
Click on it

### Step 5: Copy Request Payload
Go to "Payload" or "Request" tab
Copy the ENTIRE JSON payload

### Step 6: Compare with Ours

Our payload looks like this:
```json
{
  "repoId": "168cd931-0e04-4f64-a496-fcb4af916612",
  "query": "Create a simple welcome screen",
  "stream": true,
  "conversationHistory": [],
  "buildEnabled": true,
  "sessionId": "session-1234567890-abc123",
  "llmProvider": "claude"
}
```

Is FORGE's payload different?

### Alternative: Run FORGE Locally

```bash
cd /Users/denisprekrat/Documents/APPS/NEWWORK\ Apps/forge

# Start FORGE API locally
cd packages/api
npm start

# In new terminal, start demo app
cd apps/demo
npm run dev

# Test against localhost:3000 instead of Railway
```

Then update our AI Builder:
```typescript
const API_URL = 'http://localhost:3000'; // Use local FORGE with the fix
```

### The Real Problem

The Railway backend might not have the conversation-optimizer fix deployed yet. The fix was committed (328304d) but Railway might be running an older version.

Check Railway deployment:
1. Go to Railway dashboard
2. Check last deployment time
3. Redeploy if needed

---

**Without seeing the working FORGE request payload, I can't identify the difference!**

