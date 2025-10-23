# AI Builder Publish Flow - Complete Architecture

## Overview

This document traces the **complete flow** from when you press the "Publish" button in the AI Builder to when your screen is live on the NEWWORK platform.

---

## 🎯 High-Level Flow

```
AI Builder UI (Browser)
    ↓ Click "Publish" button
    ↓ Calls publishClient.ts
    ↓ HTTP POST to Forge API
Forge API (Railway)
    ↓ Loads base repo files from database
    ↓ Overlays session changes
    ↓ Creates wrapped entry
    ↓ Runs Vite build
    ↓ Uploads to Azure CDN
    ↓ Registers in platform services
Platform (NEWWORK)
    ↓ Loads screen from Azure CDN
    ↓ Renders in RemoteComponentLoader
✅ Screen is live!
```

---

## 📋 Detailed Step-by-Step Flow

### **STEP 1: AI Builder UI (Browser)**

**File:** `src/business-apps/platform/apps/ai-builder/AIBuilder.tsx`

#### 1.1 User Clicks "Publish" Button

- Button location: Publish dialog (`showPublishDialog = true`)
- Triggers: `handlePublish()` function (line 577)

#### 1.2 Validate Inputs

```typescript
if (!screenPath || !resourceUrl) {
  alert('Please enter both screen path and resource URL')
  return
}
```

- **screenPath**: `hr/common/apps/absence-report` (NO 'src/' prefix!)
- **resourceUrl**: `/apps/hr/absence-report`

#### 1.3 Fetch Session Changes from Forge

```typescript
const data = await getChanges(REPO_ID, sessionId)
const files = (data.changes || [])
  .filter((change: any) => change.changeType !== 'delete')
  .map((change: any) => ({
    path: change.filePath,
    content: change.newContent || '',
    changeType: change.changeType
  }))
```

- **What this does**: Gets all files that were generated/modified by the AI during the session
- **Filters out**: Deleted files (we don't need to publish those)
- **Example files**:
  - `src/business-apps/hr/common/apps/absence-report/AbsenceReport.tsx`
  - `src/business-apps/hr/common/apps/absence-report/index.ts`
  - `src/business-apps/hr/common/apps/absence-report/queries/AbsenceReportQueries.ts`

#### 1.4 Call publishScreen (publishClient.ts)

```typescript
const result = await publishScreen({
  files,
  screenPath,
  resourceUrl,
  sessionId,
  accessToken: context.accessToken
})
```

---

### **STEP 2: Publish Client (Browser)**

**File:** `src/business-apps/platform/apps/ai-builder/api/publishClient.ts`

#### 2.1 Inject vite.config.ts Fix (Workaround)

```typescript
await injectViteConfigFix(request)
```

**What this does:**

1. **Reads** `vite.config.ts` from Forge's session using `/api/files/read`
2. **Checks** if it has the broken `exports: 'named'` setting
3. **Replaces** it with `exports: 'auto'` (to preserve both default and named exports)
4. **Tracks** the change in the session using `/api/newwork/track-change`

**Why this is needed:**

- Forge's indexed repository has an OLD `vite.config.ts` with `exports: 'named'`
- This breaks component registration because it strips the default export
- This workaround injects the fix BEFORE publishing so the build works correctly

**Console output:**

```
[AI Builder] Injecting vite.config.ts fix...
[AI Builder] ✅ vite.config.ts fix injected successfully
```

#### 2.2 Make HTTP Request to Forge API

```typescript
const response = await fetch(`${PUBLISH_API_URL}/api/publish`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${request.accessToken}`
  },
  body: JSON.stringify({
    files: request.files,
    screenPath: request.screenPath,
    resourceUrl: request.resourceUrl,
    sessionId: request.sessionId
  })
})
```

**Request payload:**

```json
{
  "repoId": "168cd931-0e04-4f64-a496-fcb4af916612",
  "sessionId": "YOUR_SESSION_ID",
  "screenPath": "hr/common/apps/absence-report",
  "resourceUrl": "/apps/hr/absence-report",
  "files": [
    {
      "path": "src/business-apps/hr/common/apps/absence-report/AbsenceReport.tsx",
      "content": "export default AbsenceReport;\nexport { AbsenceReport };",
      "changeType": "create"
    }
  ]
}
```

---

### **STEP 3: Forge API (Railway Server)**

**File:** `forge/packages/api/src/routes/newwork-publish.ts`

This is where the magic happens! Forge receives the request and orchestrates the entire build and deploy process.

---

#### 3.1 Validation Phase

##### 3.1a Screen Path Validation

```typescript
// Must NOT start with 'src/'
if (body.screenPath.startsWith('src/')) {
  throw new Error('Invalid screen path: should NOT include "src/" prefix')
}

// Must contain 'apps', 'forms', or 'screens'
if (!body.screenPath.includes('/apps/')) {
  throw new Error('Path must contain "/apps/"')
}

// Must have at least 3 parts: module/sub-module/apps/name
const parts = body.screenPath.split('/')
if (parts.length < 3) {
  throw new Error('Path must have at least 3 parts')
}
```

**✅ Valid:**

- `hr/common/apps/absence-report`
- `crm/customers/apps/lead-list`

**❌ Invalid:**

- `src/hr/common/apps/absence-report` (has 'src/' prefix)
- `hr/absence-report` (missing 'apps/')

##### 3.1b Import Validation

```typescript
const forbiddenImports = ['@/components/ui/', '@/lib/utils', 'shadcn']

// Check each file for forbidden imports
for (const [filePath, change] of latestFiles) {
  if (change.newContent && (filePath.endsWith('.ts') || filePath.endsWith('.tsx'))) {
    for (const forbidden of forbiddenImports) {
      if (change.newContent.includes(`from '${forbidden}`)) {
        throw new Error(`${filePath}: imports from "${forbidden}" (use @newwork/nw-design-system instead)`)
      }
    }
  }
}
```

**Why this matters:**

- `@/components/ui/` is Shadcn UI components (local) - NOT allowed in published screens
- All UI components MUST come from `@newwork/nw-design-system` (published package)

##### 3.1c Preflight Validations

```typescript
// 1) Validate index.ts export pattern
const hasSingleLine = /export\s*\{\s*default\s*,\s*[A-Za-z_][A-Za-z0-9_]*\s*\}\s*from/.test(indexContent)
const hasTwoLine =
  /export\s*\{\s*default\s*\}\s*from/.test(indexContent) &&
  /export\s*\{\s*[A-Za-z_][A-Za-z0-9_]*\s*\}\s*from/.test(indexContent)

if (!hasSingleLine && !hasTwoLine) {
  throw new Error('Invalid exports. Required: "export { default, ComponentName } from ..."')
}

// 2) Validate PageLayout usage (no contentContainer prop)
if (content.includes('<PageLayout') && /contentContainer\s*=/.test(content)) {
  throw new Error('Do not use PageLayout contentContainer prop. Use children instead.')
}

// 3) Validate icon props (must be component type, not JSX element)
if (/headerIcon\s*=\s*\{\s*<[^>]+>\s*\}/.test(content)) {
  throw new Error('headerIcon must be component type (headerIcon={Users}) not JSX (headerIcon={<Users />})')
}
```

**Console output:**

```
NEWWORK: ✅ Screen path validation passed
NEWWORK: ✅ Import validation passed
NEWWORK: ✅ Preflight validations passed
```

---

#### 3.2 Build Directory Setup

##### 3.2a Create Temporary Build Directory

```typescript
buildDir = `/tmp/build-${Date.now()}`
await mkdir(buildDir, { recursive: true })
```

**Example:** `/tmp/build-1761049582158`

##### 3.2b Load Base Repository Files from Database

```typescript
const baseFiles = await db.select().from(repositoryFiles).where(eq(repositoryFiles.repoId, body.repoId))
```

**What this does:**

- Forge has an **indexed copy** of the entire `gravity-business-apps` repository in its database
- This includes: `package.json`, `tsconfig.json`, `vite.config.ts`, all common components, utils, etc.
- **Does NOT include:** `node_modules` (will be installed fresh)

**Console output:**

```
NEWWORK: Loading base repository files from database...
NEWWORK: Found 60397 base files (package.json, etc.)
```

##### 3.2c Write Base Files to Disk

```typescript
for (const file of baseFiles) {
  // Skip deleted files
  if (deletedFiles.has(file.filePath)) continue

  // Skip public node_modules (but keep @newwork packages)
  if (file.filePath.startsWith('node_modules/')) {
    const isNewworkPackage = file.filePath.startsWith('node_modules/@newwork/')
    if (!isNewworkPackage) continue // Fresh install will get them
  }

  const fullPath = path.join(buildDir, file.filePath)
  await writeFile(fullPath, file.content, 'utf-8')
}
```

**Console output:**

```
NEWWORK: Wrote 9534 base files (skipped 50863 stale node_modules, 0 deleted files)
```

##### 3.2d Deduplicate Session Changes

```typescript
const latestChanges = new Map<string, (typeof changes)[0]>()
for (const change of changes) {
  if (change.filePath === 'index.html') continue // Skip dev-only file
  latestChanges.set(change.filePath, change) // Last change wins
}
```

**Why this matters:**

- AI might have generated the same file multiple times during the session
- We only want the LATEST version of each file

**Console output:**

```
NEWWORK: Deduplicating 6 session changes...
NEWWORK: Deduplicated to 4 unique files (was 6 changes)
```

##### 3.2e Overlay Session Changes

```typescript
for (const [filePath, change] of latestChanges.entries()) {
  // CRITICAL: Only apply files that belong to the target screen
  if (!filePath.startsWith(screenTargetPath)) {
    logger.warn(`Skipping file outside screen directory: ${filePath}`)
    continue
  }

  const fullPath = path.join(buildDir, filePath)
  await writeFile(fullPath, change.newContent, 'utf-8')
}
```

**What this does:**

- Writes the AI-generated files on top of the base repository
- **Security:** Only writes files in the target screen directory (prevents contamination)

**Console output:**

```
NEWWORK: Applying session changes...
NEWWORK: Wrote session file: src/business-apps/hr/common/apps/absence-report/queries/AbsenceReportQueries.ts
NEWWORK: Wrote session file: src/business-apps/hr/common/apps/absence-report/AbsenceReport.tsx
NEWWORK: Wrote session file: src/business-apps/hr/common/apps/absence-report/index.ts
NEWWORK: Wrote session file: src/business-apps/hr/common/apps/absence-report/README.md
NEWWORK: Applied 4 screen files, skipped 0 non-screen files
```

##### 3.2f Create Wrapped Entry

```typescript
const manualWrappedEntryPath = path.join(buildDir, 'src', 'wrapped-entries', `${body.screenPath}.ts`)

const wrappedContent = `// Auto-generated by Forge publish
import { wrapWithUiCatalog } from '@/common/wrapWithUiCatalog';
import OriginalComponent from '@/business-apps/${body.screenPath}';

export default wrapWithUiCatalog(OriginalComponent);
`

await writeFile(manualWrappedEntryPath, wrappedContent, 'utf-8')
```

**What this does:**

- Creates the entry point that Vite will build
- Wraps your component with `UiCatalogProvider` (required for platform)
- **CRITICAL:** Must match the local pattern EXACTLY (default export only)

**File created:**
`/tmp/build-1761049582158/src/wrapped-entries/hr/common/apps/absence-report.ts`

**Console output:**

```
NEWWORK: Created manual wrapped entry: /tmp/build-1761049582158/src/wrapped-entries/hr/common/apps/absence-report.ts
```

##### 3.2g Sanitize vite.config.ts

```typescript
// Remove problematic externals (clsx, tailwind-merge, etc.)
// These should be bundled, not externalized
```

**Console output:**

```
NEWWORK: Sanitized vite.config.ts externals (safe line-based removal)
```

---

#### 3.3 Build Phase

##### 3.3a Install Dependencies

```typescript
const installEnv = { ...process.env }
delete installEnv.NODE_ENV // Ensure devDependencies are installed

await execAsync('npm install', {
  cwd: repoPath,
  env: installEnv,
  timeout: 300000
})
```

**What this installs:**

- All production dependencies (React, @newwork/nw-design-system, etc.)
- All devDependencies (Vite, TypeScript, plugins, etc.)
- Takes ~30-40 seconds

**Console output:**

```
NEWWORK: Installing dependencies with npm install...
NEWWORK: Dependencies installed
NEWWORK: npm output:
added 820 packages, and audited 829 packages in 37s

140 packages are looking for funding
  run `npm fund` for details

found 0 vulnerabilities
```

##### 3.3b Run Vite Build

```typescript
const buildEnv = {
  ...process.env,
  NODE_ENV: 'production',
  NODE_OPTIONS: '--max-old-space-size=4096', // 4GB memory limit
  PROJECT_ROOT_DIR: repoPath,
  TARGET_ENTRY_FILE: sourceEntryFile,
  TARGET_ENTRY_KEY: body.screenPath,
  SINGLE_SCREEN_CSS: 'true'
}

await execAsync('vite build', {
  cwd: repoPath,
  env: buildEnv,
  timeout: 300000
})
```

**What Vite does:**

1. Reads `vite.config.ts` (with our `exports: 'auto'` fix!)
2. Loads the wrapped entry: `src/wrapped-entries/hr/common/apps/absence-report.ts`
3. Resolves all imports (including your component)
4. Bundles everything into a single JavaScript file
5. Extracts CSS into `main.css`
6. Outputs to: `dist/hr/common/apps/absence-report/index.js`

**Console output:**

```
NEWWORK: Building screen with Vite...
NEWWORK: cwd=/tmp/build-1761049582158
NEWWORK: PROJECT_ROOT_DIR=/tmp/build-1761049582158
NEWWORK: TARGET_ENTRY_FILE=src/wrapped-entries/hr/common/apps/absence-report.ts
NEWWORK: TARGET_ENTRY_KEY=hr/common/apps/absence-report
NEWWORK: NODE_ENV=production
NEWWORK: Running vite build...
NEWWORK: Vite build complete!
NEWWORK: stdout: [vite.config.ts] Running in mode: "production", command: "build"
[vite.config.ts] Using project root directory: /tmp/build-1761049582158
[vite.config.ts] Single build detected for: hr/common/apps/absence-report
vite v5.4.21 building for production...
```

**Build output structure:**

```
dist/
├── hr/
│   └── common/
│       └── apps/
│           └── absence-report/
│               └── index.js          ← Your bundled component!
└── assets/
    └── main.css                      ← Your styles!
```

---

#### 3.4 Upload to Azure CDN

##### 3.4a Initialize Azure Client

```typescript
const blobServiceUrl = `https://${azureStorageAccount}.blob.core.windows.net/?${azureSasToken}`
const { BlobServiceClient } = await import('@azure/storage-blob')
const blobServiceClient = new BlobServiceClient(blobServiceUrl)
const containerClient = blobServiceClient.getContainerClient('screens')
```

**Azure credentials from env:**

- `AZURE_STORAGE_ACCOUNT`: `nwcdndevfiles`
- `AZURE_STORAGE_SAS_TOKEN`: (secret SAS token)
- Container: `screens`

##### 3.4b Upload Screen Files

```typescript
const screenFiles = await glob('**/*', {
  cwd: distPath,
  nodir: true
})

for (const file of screenFiles) {
  const localFilePath = path.join(distPath, file)
  const blobName = path.join(body.screenPath, file).replace(/\\/g, '/')
  const blockBlobClient = containerClient.getBlockBlobClient(blobName)

  const contentType = file.endsWith('.js') ? 'application/javascript' : 'application/octet-stream'
  await blockBlobClient.uploadFile(localFilePath, {
    blobHTTPHeaders: { blobContentType: contentType }
  })
}
```

**Uploads:**

- `hr/common/apps/absence-report/index.js` → Azure
- `hr/common/apps/absence-report/main.css` → Azure

**Console output:**

```
NEWWORK: Uploading to Azure...
NEWWORK: Uploading 1 screen files...
NEWWORK: Uploaded hr/common/apps/absence-report/index.js (application/javascript)
NEWWORK: Uploading main.css...
NEWWORK: Uploaded hr/common/apps/absence-report/main.css
NEWWORK: Upload complete! URL: https://nwcdndevfiles.blob.core.windows.net/screens/hr/common/apps/absence-report
```

**Final Azure URLs:**

- JavaScript: `https://nwcdndevfiles.blob.core.windows.net/screens/hr/common/apps/absence-report/index.js`
- CSS: `https://nwcdndevfiles.blob.core.windows.net/screens/hr/common/apps/absence-report/main.css`

---

#### 3.5 Register in Platform Services

##### 3.5a Get OAuth Token

```typescript
const tokenResponse = await fetch(`${OAUTH_URL}/realms/${OAUTH_REALM}/protocol/openid-connect/token`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  body: new URLSearchParams({
    grant_type: 'client_credentials',
    client_id: OAUTH_CLIENT_ID,
    client_secret: OAUTH_CLIENT_SECRET
  })
})

const { access_token } = await tokenResponse.json()
```

##### 3.5b Register Resource URL (Navigation Service)

```typescript
const resourcePayload = {
  code: 'apps-hr-absence-report',
  name: 'Apps Hr Absence Report',
  url: '/platform//apps/hr/absence-report',
  roles: [],
  features: [],
  isSearchable: false
}

await fetch(`${NAVIGATION_SERVICE_API}/resource-url`, {
  method: 'POST',
  headers: {
    authorization: `Bearer ${access_token}`,
    'content-type': 'application/json'
  },
  body: JSON.stringify(resourcePayload)
})
```

**What this does:**

- Registers the URL in the platform's navigation service
- Allows the platform to route `/platform//apps/hr/absence-report` to your screen

**Console output:**

```
NEWWORK: Registering resource URL in platform...
NEWWORK: Getting OAuth token...
NEWWORK: ℹ️ Auto-registration not available (404). Screen is published and working at: /platform//apps/hr/absence-report
NEWWORK: ℹ️ To add to navigation, register manually in Platform Admin.
```

##### 3.5c Register Screen (Screen Management Service)

```typescript
const screenPayload = {
  id: crypto.randomUUID(),
  name: 'Absence Report',
  screenKey: 'url_apps~hr~absence-report',
  namespaceCode: 'nw_dev',
  type: 'SCREEN',
  screenComponents: {
    builderType: 'NATIVE_SCREEN',
    formDefinition: {
      componentPath: '/hr/common/apps/absence-report'
    }
  }
}

await fetch(`${SCREEN_MANAGEMENT_API}/screen`, {
  method: 'POST',
  headers: {
    authorization: `Bearer ${access_token}`,
    'content-type': 'application/json'
  },
  body: JSON.stringify(screenPayload)
})
```

**What this does:**

- Registers the screen metadata in Screen Management Service
- Links the URL to the Azure CDN path

**Console output:**

```
NEWWORK: Registering screen in Screen Management...
NEWWORK: ℹ️ Auto-registration not available (404). Screen is published and working.
NEWWORK: ℹ️ The screen files are live at: https://nwcdndevfiles.blob.core.windows.net/screens/hr/common/apps/absence-report
```

---

#### 3.6 Cleanup

```typescript
await execAsync(`rm -rf ${buildDir}`, { timeout: 30000 })
```

**Console output:**

```
NEWWORK: Cleaning up build directory: /tmp/build-1761049582158
NEWWORK: Build directory cleaned up
```

---

### **STEP 4: Platform Loads Your Screen**

**File:** Platform's `remoteComponentLoader.ts`

#### 4.1 User Navigates to Screen

```
User goes to: https://newwork-dev.newwork.com/platform//apps/hr/absence-report
```

#### 4.2 Platform Router Matches URL

```typescript
// Platform routing logic
const screenPath = extractScreenPath(url) // '/hr/common/apps/absence-report'
```

#### 4.3 RemoteComponentLoader Loads Bundle

```typescript
// Construct Azure CDN URLs
const jsUrl = `https://nwcdndevfiles.blob.core.windows.net/screens${screenPath}/index.js`
const cssUrl = `https://nwcdndevfiles.blob.core.windows.net/screens${screenPath}/main.css`

// Dynamically load JavaScript
const module = await import(/* @vite-ignore */ jsUrl)

// Load CSS
const link = document.createElement('link')
link.rel = 'stylesheet'
link.href = cssUrl
document.head.appendChild(link)
```

#### 4.4 Component Registration

```typescript
// Try to find the component in the loaded module
let Component = null

// 1. Try default export (CRITICAL!)
if (module.default && typeof module.default === 'function') {
  Component = module.default
}
// 2. Try named export
else if (module[componentName] && typeof module[componentName] === 'function') {
  Component = module[componentName]
}

if (!Component) {
  throw new Error('Component not registered via standard exports pattern')
}
```

**This is why the export pattern matters!**

- Your `index.js` bundle MUST have: `exports.default = WrappedComponent`
- This is what `exports: 'auto'` in `vite.config.ts` ensures

#### 4.5 Render Component

```typescript
<Component {...props} />
```

**✅ Your screen is now live on the platform!**

---

## 🔍 Key Files and Their Roles

| File                         | Purpose             | What It Does                                                           |
| ---------------------------- | ------------------- | ---------------------------------------------------------------------- |
| **AIBuilder.tsx**            | UI orchestrator     | Handles user interaction, manages state, calls publish functions       |
| **publishClient.ts**         | Client-side API     | Injects vite.config fix, makes HTTP request to Forge                   |
| **newwork-publish.ts**       | Forge API endpoint  | Validates, builds, uploads, registers - the workhorse!                 |
| **vite.config.ts**           | Build configuration | Controls how Vite bundles your code (exports: 'auto' is critical!)     |
| **wrapWithUiCatalog.tsx**    | Component wrapper   | Wraps your component with UiCatalogProvider for platform compatibility |
| **index.ts**                 | Component entry     | Exports your component (must have both default and named export!)      |
| **AbsenceReport.tsx**        | Your component      | The actual React component (must export default first, then named)     |
| **remoteComponentLoader.ts** | Platform loader     | Dynamically loads and renders your screen from Azure CDN               |

---

## 🐛 Common Issues and Debugging

### Issue: "Component not registered via standard exports pattern"

**Root Cause:**

- The final `index.js` bundle is missing `exports.default`
- Usually caused by `exports: 'named'` in `vite.config.ts`

**How to Check:**

```bash
curl -s "https://nwcdndevfiles.blob.core.windows.net/screens/hr/common/apps/absence-report/index.js" | tail -c 200
```

**Expected (✅ GOOD):**

```javascript
exports.default=WrappedComponent})();
```

**Broken (❌ BAD):**

```javascript
const cG=NFe(cG);exports.default=cG})();  // Circular reference!
```

**Fix:**

1. Ensure `vite.config.ts` has `exports: 'auto'`
2. Ensure `publishClient.ts` injects the fix (look for console logs)
3. Ensure AI Builder is republished (hard refresh browser)

---

### Issue: Vite config fix not injecting

**Symptoms:**

- No console logs: `[AI Builder] Injecting vite.config.ts fix...`
- Build still uses `exports: 'named'`

**Causes:**

1. AI Builder page not refreshed (still running old code)
2. `publishClient.ts` not properly deployed

**Fix:**

1. Hard refresh AI Builder: `Cmd + Shift + R` (Mac) or `Ctrl + Shift + R` (Windows)
2. Check browser console for injection logs
3. If missing, AI Builder needs to be republished

---

### Issue: Import validation errors

**Symptoms:**

```
Invalid imports detected:
src/business-apps/hr/common/apps/absence-report/AbsenceReport.tsx: imports from "@/components/ui/button"
```

**Cause:**

- AI used local Shadcn UI components instead of `@newwork/nw-design-system`

**Fix:**

- Tell AI: "Use @newwork/nw-design-system instead of @/components/ui/"
- AI will regenerate the files with correct imports

---

### Issue: Export pattern errors

**Symptoms:**

```
Preflight validation failed:
src/business-apps/hr/common/apps/absence-report/index.ts: Invalid exports. Required: "export { default, ComponentName } from ..."
```

**Cause:**

- `index.ts` or component file has incorrect export order/format

**Correct Pattern:**

**index.ts:**

```typescript
// Option 1: Single line
export { default, AbsenceReport } from './AbsenceReport'

// Option 2: Two lines
export { default } from './AbsenceReport'
export { AbsenceReport } from './AbsenceReport'
```

**AbsenceReport.tsx:**

```typescript
// Default export FIRST
export default AbsenceReport

// Named export SECOND
export { AbsenceReport }
```

---

## 📝 Summary

The publish flow is a sophisticated multi-stage process:

1. **AI Builder UI** → Collects session files, validates inputs
2. **Publish Client** → Injects vite.config fix as workaround
3. **Forge API** → Validates, builds, uploads, registers
   - Loads 60K+ base files from database
   - Overlays your AI-generated files
   - Creates wrapped entry
   - Runs Vite build (with correct exports setting!)
   - Uploads to Azure CDN
   - Registers in platform services
4. **Platform** → Dynamically loads and renders your screen

**The critical fix:**

- `exports: 'auto'` in `vite.config.ts` ensures both default and named exports
- This is injected dynamically by `publishClient.ts` until Forge's base repo is updated
- Without it, `exports.default` is missing and the platform can't load your component

**The workaround:**

- AI Builder injects the fix before EVERY publish
- This ensures builds work even though Forge's indexed repo has the old config
- Eventually, Forge's base repo will be reindexed and the workaround can be removed

---

## 🎯 Next Steps

**If your screen still fails after publish:**

1. Check the injection logs (should see `[AI Builder] ✅ vite.config.ts fix injected successfully`)
2. Inspect the built bundle (curl the Azure URL and check the end)
3. Verify export patterns in your component files
4. Check browser console for specific error messages

**The system is working when:**

- ✅ Injection logs appear
- ✅ Bundle ends with `exports.default=WrappedComponent})()`
- ✅ Screen loads without "Component not registered" error
