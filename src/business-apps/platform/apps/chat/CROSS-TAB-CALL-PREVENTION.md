# Cross-Tab Call Ringing Prevention

## The Problem

When a group call invitation arrives via WebSocket, it's received by **all open tabs** of the same user. Without cross-tab coordination, the incoming call dialog would appear and ring in every single tab, creating a terrible user experience.

**Example scenario:**

- User has 3 tabs open
- Someone starts a group call
- Without this mechanism: All 3 tabs show the incoming call dialog and play the ringtone simultaneously
- With this mechanism: Only tabs where the user is NOT already in a call will ring

## How It Works

The solution uses **localStorage as a cross-tab communication channel** to coordinate which tab should ring.

### Overview Diagram

```
Tab 1 (User answers call)                Tab 2 (Silent)                    Tab 3 (Silent)
│                                         │                                 │
├─ Receives invite via WebSocket         ├─ Receives same invite           ├─ Receives same invite
├─ Checks localStorage                   ├─ Checks localStorage            ├─ Checks localStorage
│  └─ No active call found               │  └─ No active call found       │  └─ No active call found
├─ ✅ Shows incoming call dialog         ├─ ✅ Shows incoming call dialog ├─ ✅ Shows incoming call dialog
├─ 🔔 Plays ringtone                     ├─ 🔔 Plays ringtone             ├─ 🔔 Plays ringtone
│                                         │                                 │
├─ User clicks "Accept"                  │                                 │
├─ Joins the call                        │                                 │
├─ 📝 Writes to localStorage:            │                                 │
│    {userId, roomId, timestamp}         │                                 │
│                                         │                                 │
├─ ⏱️ Heartbeat starts (1s interval)     ├─ 👂 Detects storage change     ├─ 👂 Detects storage change
│    Updates localStorage timestamp      ├─ ❌ Dismisses incoming dialog  ├─ ❌ Dismisses incoming dialog
│                                         ├─ 🔇 Stops ringtone             ├─ 🔇 Stops ringtone
│                                         │                                 │
│                                         │   (New invite arrives)          │
│                                         ├─ Receives new invite            │
│                                         ├─ Checks localStorage            │
│                                         │  └─ Active call detected!       │
│                                         ├─ ❌ Ignores invite (no ring)   │
```

## Key Components

### 1. localStorage Structure

**Key:** `chat_active_call`

**Value (JSON):**

```typescript
{
  userId: string,      // The user's ID who is in the call
  roomId: string,      // The conversation/room ID of the active call
  timestamp: number    // Unix timestamp in milliseconds (Date.now())
}
```

**Expiration:** Data is considered "active" if timestamp is within the last **5 seconds**.

### 2. Helper Functions

Located in both:

- `hooks/useGroupCall.ts` (old mesh implementation)
- `hooks/useRealtimeKitGroupCall.ts` (new RealtimeKit implementation)

#### `isInCallInAnotherTab(currentUserId: string): boolean`

**Purpose:** Check if this user is currently in a call in another tab

**Logic:**

1. Read from localStorage using key `chat_active_call`
2. Parse the JSON data
3. Check if `userId` matches the current user
4. Check if timestamp is within last 5 seconds (still active)
5. Return `true` if both conditions are met

**Why 5 seconds?** This accounts for:

- Network delays
- Tab switching time
- Heartbeat update intervals (1 second)
- Safe margin for edge cases

#### `setActiveCallInStorage(userId: string, roomId: string): void`

**Purpose:** Mark that this tab has an active call

**Logic:**

1. Create JSON object with `userId`, `roomId`, and current `timestamp`
2. Write to localStorage using key `chat_active_call`
3. Silent fail on storage errors (private browsing mode, quota exceeded)

#### `clearActiveCallFromStorage(): void`

**Purpose:** Remove the active call marker when call ends

**Logic:**

1. Remove the `chat_active_call` key from localStorage
2. Silent fail on storage errors

### 3. Critical Checkpoints

#### ✅ Checkpoint 1: Invite Handler (MOST IMPORTANT)

**Location:** WebSocket event listener for incoming invites

**File:** `useRealtimeKitGroupCall.ts` ~line 945

```typescript
const handleInvite = (data: any) => {
  // ... other checks ...

  // 🚨 CRITICAL: This check MUST happen before setIncomingInvite()
  if (currentUser && isInCallInAnotherTab(currentUser.id)) {
    rtkDebug.log('[RTK] Ignoring invite - user is in call in another tab')
    return // Don't show dialog, don't ring
  }

  // Only reached if not in call in another tab
  setIncomingInvite({...}) // Shows dialog and triggers ringtone
}
```

**Why critical?** This is the ONLY place that prevents the dialog from appearing in the first place.

#### ✅ Checkpoint 2: Mark Active on Join

**Location:** `joinCall()` function after successful join

**File:** `useRealtimeKitGroupCall.ts` ~line 691

```typescript
// Save to localStorage
preferences.saveActiveCall(currentUser.id, roomId)

// 🚨 CRITICAL: Mark active call for cross-tab detection
setActiveCallInStorage(currentUser.id, roomId)
```

**Why critical?** Without this, other tabs won't know this tab joined a call.

#### ✅ Checkpoint 3: Clear on Leave

**Location:** `leaveCall()` function after cleanup

**File:** `useRealtimeKitGroupCall.ts` ~line 865

```typescript
// Clear localStorage
preferences.clearActiveCall()

// 🚨 CRITICAL: Clear active call for cross-tab detection
clearActiveCallFromStorage()
```

**Why critical?** Without this, future invites will be blocked even after leaving the call.

#### ✅ Checkpoint 4: Heartbeat

**Location:** useEffect that runs while call is active

**File:** `useRealtimeKitGroupCall.ts` ~line 1115

```typescript
useEffect(() => {
  if (callState.status !== 'connected' || !currentUser || !callState.roomId) return

  // Update immediately
  setActiveCallInStorage(currentUser.id, callState.roomId)

  // 🚨 CRITICAL: Update every second to keep timestamp fresh
  const interval = setInterval(() => {
    if (currentUser && callState.roomId) {
      setActiveCallInStorage(currentUser.id, callState.roomId)
    }
  }, 1000)

  return () => clearInterval(interval)
}, [callState.status, callState.roomId, currentUser])
```

**Why critical?** The 5-second expiration window needs fresh timestamps. Without the heartbeat, the marker would expire after 5 seconds even though the call is still active.

#### ✅ Checkpoint 5: Storage Event Listener

**Location:** useEffect that listens for storage changes

**File:** `useRealtimeKitGroupCall.ts` ~line 1135

```typescript
useEffect(() => {
  const handleStorageChange = (event: StorageEvent) => {
    if (event.key !== ACTIVE_CALL_KEY) return

    // 🚨 CRITICAL: Dismiss incoming invite when another tab joins
    if (event.newValue && incomingInvite && currentUser) {
      try {
        const data = JSON.parse(event.newValue)
        if (data.userId === currentUser.id && Date.now() - data.timestamp < 5000) {
          rtkDebug.log('[RTK] User joined call in another tab, dismissing incoming invite')
          setIncomingInvite(null) // Closes dialog and stops ringtone
        }
      } catch {
        // Ignore parse errors
      }
    }
  }

  window.addEventListener('storage', handleStorageChange)
  return () => window.removeEventListener('storage', handleStorageChange)
}, [incomingInvite, currentUser])
```

**Why critical?** This provides instant feedback when user accepts a call in one tab - all other tabs immediately dismiss their incoming call dialogs and stop ringing.

## Implementation Checklist

When implementing cross-tab call prevention, ensure ALL of these are present:

- [ ] Helper functions defined at module level (before the hook)
- [ ] `isInCallInAnotherTab()` check in invite handler (BEFORE setIncomingInvite)
- [ ] `setActiveCallInStorage()` called when joining a call
- [ ] `clearActiveCallFromStorage()` called when leaving a call
- [ ] Heartbeat effect that updates localStorage every 1 second while in call
- [ ] Storage event listener that dismisses incoming invites when another tab joins
- [ ] All dependencies in useEffect arrays are correct

## Common Pitfalls & How We Broke It Before

### ❌ Pitfall #1: Missing the Initial Check

**What broke:**

```typescript
const handleInvite = (data: any) => {
  // Missing: if (isInCallInAnotherTab(currentUser.id)) return

  setIncomingInvite({...}) // Always shows dialog
}
```

**Symptom:** All tabs ring simultaneously

**Fix:** Add the `isInCallInAnotherTab()` check BEFORE `setIncomingInvite()`

### ❌ Pitfall #2: Forgetting to Set Active Call

**What broke:**

```typescript
// In joinCall()
preferences.saveActiveCall(currentUser.id, roomId)
// Missing: setActiveCallInStorage(currentUser.id, roomId)
```

**Symptom:** First tab joins, but other tabs still show incoming dialog and ring

**Fix:** Call `setActiveCallInStorage()` right after joining

### ❌ Pitfall #3: No Heartbeat

**What broke:**

```typescript
// Missing the heartbeat effect entirely
// Or: Only calling setActiveCallInStorage() once on join
```

**Symptom:** After 5 seconds in a call, new invites start ringing in all tabs again

**Fix:** Implement the heartbeat effect that updates localStorage every 1 second

### ❌ Pitfall #4: Forgetting to Clear on Leave

**What broke:**

```typescript
// In leaveCall()
preferences.clearActiveCall()
// Missing: clearActiveCallFromStorage()
```

**Symptom:** After leaving a call, future call invites are blocked even though user is available

**Fix:** Call `clearActiveCallFromStorage()` when leaving

### ❌ Pitfall #5: No Storage Event Listener

**What broke:**

```typescript
// Missing the storage event listener entirely
```

**Symptom:** When user accepts a call in one tab, other tabs continue ringing until user manually closes them

**Fix:** Implement the storage event listener that auto-dismisses on cross-tab join

### ❌ Pitfall #6: Wrong Timing in Check

**What broke:**

```typescript
const handleInvite = (data: any) => {
  setIncomingInvite({...}) // Shows dialog

  // Too late! Dialog already shown
  if (isInCallInAnotherTab(currentUser.id)) {
    setIncomingInvite(null)
  }
}
```

**Symptom:** Brief flash of dialog/ringtone before dismissing

**Fix:** Check BEFORE setting the incoming invite

## Testing Guide

### Manual Test Scenarios

#### Test 1: Basic Multi-Tab Prevention

1. Open app in Tab A
2. Open app in Tab B
3. Start a call (from Tab C or another user)
4. **Expected:** Both tabs ring and show incoming dialog
5. Accept call in Tab A
6. **Expected:** Tab B immediately dismisses dialog and stops ringing

#### Test 2: Subsequent Invites During Active Call

1. Continue from Test 1 (Tab A in active call)
2. Start a NEW call (different conversation)
3. **Expected:**
   - Tab A: No dialog, no ring (already in a call)
   - Tab B: No dialog, no ring (cross-tab detection)

#### Test 3: After Leaving Call

1. Continue from Test 1 (Tab A in active call)
2. Leave the call in Tab A
3. Start a new call
4. **Expected:** Both tabs ring and show incoming dialog (user is available again)

#### Test 4: Stale Tab Recovery

1. Tab A joins a call
2. Close Tab A abruptly (crash simulation - no cleanup)
3. Wait 6 seconds (localStorage expires)
4. Start a new call
5. **Expected:** Tab B rings (stale localStorage entry expired)

#### Test 5: Private Browsing Mode

1. Open app in private/incognito mode
2. Start a call
3. **Expected:** Everything works (silent localStorage failures are handled)

### Debugging Tips

#### Enable Debug Logging

Look for these log messages:

```
[RTK] Ignoring invite - user is in call in another tab
[RTK] User joined call in another tab, dismissing incoming invite
```

#### Check localStorage in DevTools

1. Open DevTools → Application → Local Storage
2. Look for key: `chat_active_call`
3. Verify structure: `{userId, roomId, timestamp}`
4. Check timestamp is being updated every ~1 second during active call

#### Common Debug Checks

```typescript
// In browser console during active call:
localStorage.getItem('chat_active_call')
// Should return: {"userId":"...","roomId":"...","timestamp":1234567890}

// Check if timestamp is fresh:
const data = JSON.parse(localStorage.getItem('chat_active_call'))
Date.now() - data.timestamp // Should be < 1500ms if heartbeat is working
```

## Migration Notes

### Old Implementation (useGroupCall.ts) vs New (useRealtimeKitGroupCall.ts)

Both implementations MUST have identical cross-tab prevention logic:

| Component        | Old (Mesh)         | New (RealtimeKit)  | Status       |
| ---------------- | ------------------ | ------------------ | ------------ |
| Helper functions | ✅ Lines 174-214   | ✅ Lines 27-67     | ✅ Identical |
| Invite check     | ✅ Line 1081       | ✅ Line 945        | ✅ Identical |
| Set on join      | ✅ Line 1242       | ✅ Line 691        | ✅ Identical |
| Clear on leave   | ✅ Line 757        | ✅ Line 865        | ✅ Identical |
| Heartbeat        | ✅ Lines 1240-1247 | ✅ Lines 1115-1129 | ✅ Identical |
| Storage listener | ✅ Lines 1251-1273 | ✅ Lines 1135-1156 | ✅ Identical |

**IMPORTANT:** When updating one implementation, update BOTH to maintain consistency.

## Architecture Decisions

### Why localStorage instead of BroadcastChannel?

**Reason:** localStorage is more widely supported and simpler to implement.

**Trade-off:** StorageEvent only fires in OTHER tabs, not the one that made the change. This is actually desirable for our use case.

### Why 5 seconds expiration?

**Reasons:**

- Network delays: WebSocket events might arrive with slight delays across tabs
- Tab switching: User might switch tabs during call setup
- Heartbeat reliability: 1-second heartbeat gives 5 updates within expiration window
- Safety margin: Handles edge cases where heartbeat might be delayed

**Too short (e.g., 2 seconds):** Risk of false negatives during slow networks
**Too long (e.g., 30 seconds):** Risk of blocking invites when tab crashes without cleanup

### Why heartbeat every 1 second?

**Reasons:**

- Keeps timestamp fresh within 5-second expiration window
- Low overhead (single localStorage write per second)
- Fast recovery if interval is delayed (multiple chances within expiration)

## Future Improvements

### Potential Enhancements

1. **BroadcastChannel Fallback:** Use BroadcastChannel API where available for instant communication
2. **Service Worker Coordination:** Handle cross-tab state in a service worker for more reliability
3. **IndexedDB Alternative:** Use IndexedDB for more storage space and structure
4. **Visibility API:** Automatically prioritize visible tabs for call acceptance
5. **Tab Leader Election:** Designate one tab as "leader" to handle all incoming calls

### Known Limitations

1. **No Cross-Browser Coordination:** If user has app open in Chrome and Firefox, both will ring
2. **No Cross-Device Coordination:** If user has app open on phone and desktop, both will ring
3. **Private Browsing Limitations:** Some browsers disable localStorage in private mode (gracefully handled)
4. **Tab Crash Recovery:** If tab crashes without cleanup, 5-second wait before recovery

## Related Files

- `hooks/useGroupCall.ts` - Old mesh implementation with cross-tab prevention
- `hooks/useRealtimeKitGroupCall.ts` - New RealtimeKit implementation with cross-tab prevention
- `hooks/useCall.ts` - 1:1 calls also use similar localStorage mechanism
- `components/IncomingGroupCallDialog.tsx` - The dialog that shows/rings when invite arrives

## Change History

| Date    | Change                                 | Reason                             |
| ------- | -------------------------------------- | ---------------------------------- |
| 2024-01 | Initial implementation in useGroupCall | Prevent multi-tab ringing          |
| 2024-01 | Added to useRealtimeKitGroupCall       | Missing in new implementation      |
| 2024-01 | This documentation created             | Broke it multiple times, need docs |

---

**Remember:** This mechanism is CRITICAL for user experience. Test thoroughly when making changes to call handling code!
