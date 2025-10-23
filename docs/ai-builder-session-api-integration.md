# AI Builder Session Management - API Integration

## Summary

Migrated AI Builder session management from `localStorage` to FORGE backend API with PostgreSQL persistence.

## Problem Solved

✅ **Before**: Sessions only in browser localStorage

- ❌ Limited to one browser/device
- ❌ Lost on cache clear
- ❌ No team visibility

✅ **After**: Sessions in PostgreSQL via FORGE API

- ✅ Cross-device access
- ✅ Persistent storage
- ✅ Team visibility (who created what)
- ✅ localStorage fallback for offline use

## Architecture

### Backend (FORGE)

```
PostgreSQL
    ↓
ai_builder_sessions table
    ↓
FORGE API Routes (/api/newwork/sessions)
    ↓
AI Builder Client
```

### API Endpoints

- **POST** `/api/newwork/sessions` - Save/update session
- **GET** `/api/newwork/sessions?userId={id}` - List user sessions
- **GET** `/api/newwork/sessions/:sessionId` - Get session details
- **PATCH** `/api/newwork/sessions/:sessionId` - Update metadata
- **DELETE** `/api/newwork/sessions/:sessionId` - Delete session

## Changes Made

### 1. FORGE Backend

**Files Created:**

- `packages/api/src/routes/newwork-sessions.ts` - Session management routes

**Files Modified:**

- `packages/api/src/db/schema.ts` - Added `aiBuilderSessions` table
- `packages/api/src/server.ts` - Registered session routes

### 2. AI Builder Frontend

**Files Created:**

- `src/business-apps/platform/apps/ai-builder/api/sessionClient.ts` - Session API client

**Files Modified:**

- `src/business-apps/platform/apps/ai-builder/AIBuilder.tsx`
  - Load sessions from API on mount
  - Save sessions to API after changes
  - Delete sessions via API
  - Cache in localStorage for fast loading

## Data Flow

### Session Load (on AI Builder open)

```typescript
1. User opens AI Builder
2. Fetch sessions from API: listSessions(userId)
3. Display session list
4. Cache in localStorage for next time
5. If API fails → fallback to localStorage
```

### Session Save (after screen path change)

```typescript
1. User types screen path or adds files
2. Update local state immediately (fast UI)
3. Save to localStorage (cache)
4. Save to API in background
5. If API fails → still in localStorage
```

### Session Delete

```typescript
1. User clicks delete on session
2. Call API: deleteSession(sessionId)
3. Remove from local state
4. Remove from localStorage
5. If API fails → show error, don't delete locally
```

## Database Schema

```sql
CREATE TABLE ai_builder_sessions (
  id UUID PRIMARY KEY,
  session_id VARCHAR(255) UNIQUE NOT NULL,
  repo_id UUID REFERENCES repositories(id),
  screen_path TEXT,
  resource_url TEXT,
  file_count INTEGER DEFAULT 0,
  description TEXT,
  created_by JSONB NOT NULL,  -- User info with avatar
  created_at TIMESTAMP DEFAULT NOW(),
  last_modified TIMESTAMP DEFAULT NOW()
);
```

## Session Metadata

```typescript
interface SessionMetadata {
  sessionId: string
  screenPath: string | null
  resourceUrl: string | null
  fileCount: number
  description?: string
  createdBy: SessionUser
  createdAt: string // ISO
  lastModified: string // ISO
}

interface SessionUser {
  id: string
  employeeId: string
  firstName: string
  lastName: string
  displayName: string
  email?: string
  pictureThumbnail?: string // Base64 avatar
}
```

## Testing Checklist

### Backend (FORGE)

- [ ] Database migration successful
- [ ] POST /sessions creates new session
- [ ] POST /sessions updates existing session
- [ ] GET /sessions returns user's sessions
- [ ] GET /sessions/:id returns specific session
- [ ] DELETE /sessions/:id removes session
- [ ] Sessions filtered by userId correctly

### Frontend (AI Builder)

- [ ] Session list loads on startup
- [ ] Can create new session
- [ ] Can select existing session
- [ ] Can delete session
- [ ] Screen path updates session metadata
- [ ] File count updates session metadata
- [ ] localStorage fallback works if API fails
- [ ] User avatar displays correctly in session list

## Deployment Steps

1. **Deploy FORGE Backend**

   ```bash
   cd /Users/denisprekrat/Documents/APPS/NEWWORK Apps/forge
   git add packages/api/src/routes/newwork-sessions.ts
   git add packages/api/src/db/schema.ts
   git add packages/api/src/server.ts
   git commit -m "feat: Add session management API for AI Builder"
   git push origin main
   # Railway auto-deploys from main branch
   ```

2. **Run Database Migration**

   ```bash
   # SSH into Railway or use Railway CLI
   psql $DATABASE_URL -c "CREATE TABLE IF NOT EXISTS ai_builder_sessions ..."
   # Or use Drizzle migrations (see SESSION_MANAGEMENT_SETUP.md)
   ```

3. **Deploy AI Builder**

   ```bash
   cd /Users/denisprekrat/Documents/APPS/NEWWORK Apps/BusinessApps/gravity-business-apps
   npm run publish:screen -- /platform/apps/ai-builder
   ```

4. **Verify**
   - Open AI Builder in DEV
   - Check browser console for session API calls
   - Create/delete sessions
   - Verify data in PostgreSQL

## Fallback & Error Handling

- **API Unavailable**: AI Builder uses localStorage
- **API Error**: Error logged, operation continues with local data
- **Stale Data**: localStorage refreshed on each API success
- **User Not Loaded**: Session creation waits for user info

## Future Enhancements

- [ ] Session sharing between users
- [ ] Session templates (reusable screen scaffolds)
- [ ] Session search/filtering
- [ ] Session export/import
- [ ] Session history/versioning
- [ ] Team session dashboard

## Related Files

**Backend:**

- FORGE: `/Users/denisprekrat/Documents/APPS/NEWWORK Apps/forge/packages/api/src/routes/newwork-sessions.ts`
- Schema: `/Users/denisprekrat/Documents/APPS/NEWWORK Apps/forge/packages/api/src/db/schema.ts`

**Frontend:**

- Client: `src/business-apps/platform/apps/ai-builder/api/sessionClient.ts`
- UI: `src/business-apps/platform/apps/ai-builder/AIBuilder.tsx`
- Types: `src/business-apps/platform/apps/ai-builder/types/session.ts`

**Documentation:**

- Setup: `/Users/denisprekrat/Documents/APPS/NEWWORK Apps/forge/docs/SESSION_MANAGEMENT_SETUP.md`
