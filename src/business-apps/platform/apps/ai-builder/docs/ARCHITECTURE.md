# NEWWORK AI Builder - Architecture

## System Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    NEWWORK Platform (Browser)                │
│  ┌───────────────────────────────────────────────────────┐  │
│  │              AI Builder React App                      │  │
│  │  (Published to platform, runs in users' browsers)      │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                          │
                          │ HTTPS
                          ▼
┌─────────────────────────────────────────────────────────────┐
│         FORGE Backend (Railway - Public Internet)            │
│                                                               │
│  General FORGE Endpoints:                                    │
│  - /api/analyze/query-agentic  → AI code generation          │
│  - /api/git/changes            → Get session files           │
│  - /api/git/patch              → Download patch              │
│                                                               │
│  NEWWORK-Specific Endpoints:                                 │
│  - /api/newwork/publish        → Publish to platform ✨      │
│  - /api/newwork/publish/status → Check publish status        │
│                                                               │
└─────────────────────────────────────────────────────────────┘
                          │
                          │ Vite Build + Azure Upload
                          ▼
┌─────────────────────────────────────────────────────────────┐
│              Azure Blob Storage (screens)                    │
│  - Stores built screen bundles                               │
│  - Publicly accessible via CDN                               │
└─────────────────────────────────────────────────────────────┘
                          │
                          │ Resource URL registration
                          ▼
┌─────────────────────────────────────────────────────────────┐
│              NEWWORK Platform API                            │
│  - Registers resource URLs                                   │
│  - Makes screens available in navigation                     │
└─────────────────────────────────────────────────────────────┘
```

## Publishing Flow

### 1. User Builds Screen with AI

```
User types: "Create a lead list screen"
         ↓
AI Builder → FORGE /api/analyze/query-agentic
         ↓
FORGE generates files using Claude 4
         ↓
Files stored in FORGE session (memory/db)
         ↓
AI Builder shows "5 files changed" banner
```

### 2. User Publishes Screen

```
User clicks "Publish to Platform"
         ↓
Dialog prompts for:
  - Screen Path: crm/customers/apps/lead-list
  - Resource URL: /apps/crm/lead-list
         ↓
AI Builder → FORGE /api/newwork/publish
```

### 3. FORGE Publishes to Platform

```
FORGE Backend (Railway):
  1. Gets files from session
  2. Writes files to cached gravbusapps repo
  3. Runs Vite build (generates bundle)
  4. Uploads bundle to Azure blob storage
  5. Calls NEWWORK platform API to register resource URL
         ↓
Returns: { success: true, resourceUrl: "/apps/crm/lead-list" }
```

### 4. Screen is Live!

```
User navigates to: /apps/crm/lead-list
         ↓
NEWWORK platform loads screen from Azure
         ↓
Screen works immediately!
```

## Key Design Decisions

### Why FORGE Handles Publishing?

1. **Accessible from anywhere** - FORGE is on Railway (public internet)
2. **Already has the files** - Stored in session from AI generation
3. **No localhost dependency** - AI Builder can be published to platform
4. **Reuses existing infrastructure** - No new services needed

### Why Separate `/api/newwork/*` Endpoints?

1. **Clear separation** - NEWWORK-specific vs general FORGE
2. **Independent evolution** - NEWWORK can modify without affecting others
3. **Different auth/config** - Can have NEWWORK-specific settings
4. **Better logs/monitoring** - Easy to track NEWWORK usage

### Why Not GitHub PRs?

- NEWWORK wants **instant publishing** (one-click)
- PRs add review/merge steps (defeats the USP)
- Direct publishing matches `npm run publish:screen` workflow

## Components

### Frontend: AI Builder (gravity-business-apps)

- Location: `src/business-apps/platform/apps/ai-builder/`
- Published to: NEWWORK platform
- Runs in: Users' browsers
- Calls: FORGE Railway API

### Backend: FORGE `/api/newwork/*` (Railway)

- Location: `forge/packages/api/src/routes/newwork-publish.ts`
- Runs on: Railway (https://forge-api-production-db58.up.railway.app)
- Purpose: Handle NEWWORK-specific publishing
- Separate from: General FORGE functionality

## Configuration

### FORGE Environment Variables (Railway)

```env
# Azure Storage (for uploading screens)
AZURE_STORAGE_ACCOUNT=nwcdndevfiles
AZURE_STORAGE_SAS_TOKEN=your_sas_token
AZURE_BLOB_CONTAINER_NAME=screens

# NEWWORK Platform API (for resource URL registration)
NEWWORK_PLATFORM_API_URL=https://your-platform-api.com
NEWWORK_PLATFORM_API_KEY=your_api_key
```

### AI Builder Environment Variables

None needed! Everything configured via FORGE.

## Security

- FORGE validates all requests
- Azure credentials stored only in FORGE (not exposed to browser)
- Session-based isolation (users only access their own files)
- Resource URL validation (prevent path traversal)

## Monitoring

FORGE logs all NEWWORK publish requests with prefix "NEWWORK:" for easy filtering:

```
NEWWORK: Publishing screen to platform { screenPath: '...', resourceUrl: '...' }
NEWWORK: Found 5 files to publish
NEWWORK: Running Vite build...
NEWWORK: Uploading to Azure...
NEWWORK: Registering resource URL...
NEWWORK: Publish complete!
```

## Failure Handling

If publish fails:

1. User sees error message in AI Builder
2. Can download patch file as backup
3. Can manually run `npm run publish:screen` locally
4. FORGE logs full error for debugging

## Future Enhancements

- [ ] Preview before publish (WebContainer)
- [ ] Version history and rollback
- [ ] A/B testing support
- [ ] Analytics integration
- [ ] Automated testing before publish

---

**Architecture designed for**: One-click screen publishing from browser to production
**Key principle**: Reuse existing infrastructure (FORGE + Azure + Platform)
