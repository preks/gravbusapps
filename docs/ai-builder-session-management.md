# AI Builder Session Management

## Overview

Implemented a comprehensive session management system for the AI Builder that allows users to:

- View all their screen-building sessions in one place
- See who created each session (with avatar and name)
- Track screen paths and file counts for each session
- Continue work on existing sessions
- Create new sessions
- Delete sessions they no longer need

## Key Features

### 1. Session List View

- **Grid Layout**: Beautiful card-based grid showing all sessions
- **Search Functionality**: Search by screen path, user name, email, or description
- **User Attribution**: Each session shows the creator's avatar, name, and email
- **Metadata Display**: Shows creation date, last modified time, file count
- **Empty States**: Helpful messages when no sessions exist or search yields no results

### 2. Session Information Tracked

Each session stores:

- **`sessionId`**: Unique identifier for the session
- **`screenPath`**: Path to the screen being built (e.g., `platform/apps/my-screen`)
- **`resourceUrl`**: Resource URL for the screen (e.g., `/apps/my-screen`)
- **`createdAt`**: ISO timestamp of when session was created
- **`lastModified`**: ISO timestamp of last activity
- **`fileCount`**: Number of files in the session
- **`createdBy`**: User object with complete creator information
  - `id`: Employee ID
  - `employeeId`: Employee identifier
  - `firstName`: First name
  - `lastName`: Last name
  - `displayName`: Full display name
  - `email`: Email address
  - `pictureThumbnail`: Base64 encoded profile picture
- **`description`**: Optional description of the session

### 3. User Integration

- **Automatic User Fetching**: Fetches current user data from employee GraphQL API
- **Profile Pictures**: Shows real employee avatars with fallback to gradient initials
- **User Context**: All sessions are attributed to the creator for accountability

### 4. Session Navigation

- **Back to Sessions**: Button in header to return to session list
- **Session Selection**: Click any session card to resume work
- **New Session**: Prominent "New Session" button to start fresh
- **Session Deletion**: Hover over cards to reveal delete button

## Technical Implementation

### Type Definitions

**File**: `src/business-apps/platform/apps/ai-builder/types/session.ts`

```typescript
export interface SessionUser {
  id: string
  employeeId: string
  firstName: string
  lastName: string
  displayName: string
  email?: string
  pictureThumbnail?: string
}

export interface SessionMetadata {
  sessionId: string
  screenPath: string | null
  resourceUrl: string | null
  createdAt: string
  lastModified: string
  fileCount: number
  createdBy: SessionUser
  description?: string
}
```

### SessionList Component

**File**: `src/business-apps/platform/apps/ai-builder/components/SessionList.tsx`

**Features**:

- Grid layout (1 col mobile, 2 cols tablet, 3 cols desktop)
- Real-time search filtering
- Relative time display ("2 hours ago", "Yesterday", etc.)
- User avatars with gradient fallbacks
- Hover effects and delete confirmation
- Empty state handling

**Props**:

```typescript
interface SessionListProps {
  sessions: SessionMetadata[]
  onSelectSession: (sessionId: string) => void
  onCreateSession: () => void
  onDeleteSession: (sessionId: string) => void
}
```

### AIBuilder Integration

**State Management**:

```typescript
const [showSessionList, setShowSessionList] = useState(true)
const [sessions, setSessions] = useState<SessionMetadata[]>([])
const [currentUser, setCurrentUser] = useState<SessionUser | null>(null)
```

**Key Functions**:

1. **`createNewSession()`**
   - Validates current user is loaded
   - Generates unique session ID
   - Creates session metadata with user info
   - Adds to session list
   - Switches to the new session

2. **`selectSession(sessionId)`**
   - Sets active session
   - Updates last modified time
   - Hides session list
   - Loads session data

3. **`deleteSession(sessionId)`**
   - Removes from session list
   - Cleans up localStorage
   - Returns to session list if deleting current session

4. **`backToSessionList()`**
   - Shows session list
   - Keeps current session active in background

### Data Storage

**localStorage Keys**:

- `ai-builder-sessions`: JSON array of all session metadata
- `ai-builder-session-{id}`: Individual session data (future enhancement)

**Auto-Save**:

- Session metadata updates automatically when:
  - Screen path changes
  - Resource URL is set
  - File count changes
  - Session is selected (updates lastModified)

### User Data Fetching

Uses GraphQL to fetch current user's employee record:

```typescript
const query = GET_EMPLOYEE_LIGHT_BY_ID(employeeId)
const result = await graphqlClient.request<{ Employee: any[] }>(query)
const employee = result.Employee?.[0]

const user: SessionUser = {
  id: employee.id,
  employeeId: employeeId,
  firstName: employee.firstName,
  lastName: employee.lastName,
  displayName: employee.displayName,
  email: context.userInfo?.userName,
  pictureThumbnail: employee.pictureThumbnail
}
```

## User Experience

### Initial Load Flow

1. User opens AI Builder
2. System loads all sessions from localStorage
3. Fetches current user data from GraphQL
4. Shows SessionList with all sessions
5. User can create new session or select existing one

### Creating New Session Flow

1. User clicks "New Session" button
2. System creates session with user attribution
3. Session is added to top of list
4. User is taken to chat interface
5. Session metadata auto-updates as work progresses

### Resuming Session Flow

1. User sees all sessions in grid
2. Can search to find specific session
3. Clicks session card
4. AI Builder loads with existing chat and files
5. User continues where they left off

### Session Management Flow

1. User can switch between sessions anytime
2. Click "Back to Sessions" button in header (or "Sessions" on mobile)
3. All work is automatically saved
4. Sessions show last modified time for easy tracking
5. Can delete old sessions by hovering and clicking trash icon

## UI Components

### Session Card Design

- **Header**: Screen path (or "Untitled") + delete button (on hover)
- **Resource URL**: If available, shown below screen path
- **User Info**: Avatar + name + email in compact format
- **Description**: Optional description text (line-clamped to 2 lines)
- **Metadata Footer**: Last modified time + file count badge

### Search Bar

- Icon-prefixed input
- Real-time filtering
- Searches across:
  - Screen path
  - Resource URL
  - Description
  - User display name
  - User email

### Empty States

1. **No Sessions**: Encourages creating first session
2. **No Search Results**: Suggests adjusting search terms
3. **Both** include contextual messaging and actions

### Responsive Design

- **Mobile (< 768px)**: 1 column, compact buttons
- **Tablet (768px - 1024px)**: 2 columns
- **Desktop (> 1024px)**: 3 columns
- Back button shows icon only on mobile, icon + "Sessions" text on desktop

## Testing Checklist

### Basic Functionality

- [x] Session list loads on initial open
- [x] Current user data fetches correctly
- [x] User avatar displays properly
- [x] Create new session button works
- [x] Session cards display all information
- [x] Select session switches to chat view
- [x] Back to sessions button returns to list
- [x] Delete session removes it from list

### Search Functionality

- [x] Search by screen path works
- [x] Search by user name works
- [x] Search by email works
- [x] Search is case-insensitive
- [x] Empty search shows all sessions
- [x] Search results update in real-time

### Data Persistence

- [x] Sessions persist across page refreshes
- [x] Session metadata updates automatically
- [x] User attribution is preserved
- [x] Last modified time updates correctly
- [x] File count updates as files change

### Edge Cases

- [x] No sessions - shows empty state
- [x] User not loaded - prevents session creation
- [x] Delete current session - returns to list
- [x] Long screen paths - truncate properly
- [x] Missing avatar - shows initials fallback

## Benefits

### For Users

1. **Organization**: All projects in one place
2. **History**: Easy to find and resume past work
3. **Clarity**: See exactly what each session is for
4. **Collaboration**: Know who created each screen
5. **Efficiency**: Quick search to find specific projects

### For Teams

1. **Accountability**: Every session has a creator
2. **Transparency**: See who's building what
3. **Sharing**: Easy to understand others' work
4. **Tracking**: Monitor project progress
5. **Management**: Better oversight of development

## Future Enhancements

### Potential Improvements

1. **Session Sharing**: Share sessions with team members
2. **Session Templates**: Save sessions as templates
3. **Session Tags**: Categorize sessions with tags
4. **Session Comments**: Add notes to sessions
5. **Session History**: Track detailed change history
6. **Team View**: Filter sessions by team/department
7. **Session Search**: Advanced filters (date range, file type)
8. **Session Export**: Export session data/chat history
9. **Session Favorites**: Star important sessions
10. **Session Statistics**: Analytics on session usage

### Technical Improvements

1. **Backend Storage**: Move from localStorage to database
2. **Real-time Sync**: Multi-device session synchronization
3. **Conflict Resolution**: Handle concurrent edits
4. **Session Versioning**: Save session snapshots
5. **Backup/Restore**: Cloud backup of sessions

## Migration Guide

### For Existing Users

Old sessions (from before this feature) will continue to work but won't appear in the session list. To migrate:

1. **Automatic**: Next time user creates a session, old session ID is migrated
2. **Manual**: User can create a new session and the system will track it properly

### Data Migration Script

```typescript
// Run this once to migrate existing session IDs
const oldSessionId = localStorage.getItem('ai-builder-session-id')
if (oldSessionId && !localStorage.getItem('ai-builder-sessions')) {
  const migrated: SessionMetadata = {
    sessionId: oldSessionId,
    screenPath: null,
    resourceUrl: null,
    createdAt: new Date().toISOString(),
    lastModified: new Date().toISOString(),
    fileCount: 0,
    createdBy: currentUser,
    description: 'Migrated session'
  }
  localStorage.setItem('ai-builder-sessions', JSON.stringify([migrated]))
}
```

## Files Modified

1. **New Files**:
   - `src/business-apps/platform/apps/ai-builder/types/session.ts` - Type definitions
   - `src/business-apps/platform/apps/ai-builder/components/SessionList.tsx` - Session list component

2. **Modified Files**:
   - `src/business-apps/platform/apps/ai-builder/AIBuilder.tsx` - Integration and logic

## Dependencies

- **@newwork/nw-design-system**: UI components (Avatar, Button, Card, Input)
- **lucide-react**: Icons (Plus, Clock, FileCode, Search, Trash2, Folder, ArrowLeft)
- **React**: State management and effects
- **GraphQL**: User data fetching

## Related Documentation

- [AI Builder Publish Error Handling](./ai-builder-publish-error-handling.md)
- [AI Builder UI Improvements](./ai-builder-ui-improvements.md)
- [AI Builder Publish Fix](./ai-builder-publish-fix.md)
