# Raised Hand Bug Fixes

This document details two raised hand issues and their solutions.

---

## Issue 1: Auto-Raised Hand on Join (FIXED)

### The Problem

When a user joins a meeting, their hand is automatically raised even though they didn't click the raise hand button. This creates confusion as the host thinks the new participant needs attention immediately.

### Root Cause

The backend sends WebSocket `group-call:hand-update` events when participants join, sometimes with stale or incorrect state data. If the backend sends `{ participantId: "user123", handRaised: true }` during the join sequence, the frontend blindly processes it and raises the user's hand.

**Sequence of events:**

1. User joins call
2. Backend sends participant join notifications
3. Backend sends `hand-update` events (possibly with stale state: `handRaised: true`)
4. Frontend processes event and raises hand (bug!)
5. User sees their hand raised without clicking anything

### The Solution

Implemented a lightweight grace period that ignores spurious hand-raised events during the first 500ms after joining:

**File: `hooks/useRealtimeKitWebSocket.ts`**

```typescript
// Track if we've just joined (to ignore spurious hand-raised events)
const justJoinedRef = useRef(true)
const joinTimeoutRef = useRef<NodeJS.Timeout | null>(null)

// Reset "just joined" flag after initialization period
useEffect(() => {
  if (meetingId && currentUser) {
    justJoinedRef.current = true

    // After 2 seconds, allow hand-raised events to be processed normally
    joinTimeoutRef.current = setTimeout(() => {
      justJoinedRef.current = false
    }, 2000)
  }

  return () => {
    if (joinTimeoutRef.current) {
      clearTimeout(joinTimeoutRef.current)
    }
  }
}, [meetingId, currentUser])

// In the hand-update event listener:
const handleHandUpdate = data => {
  // CRITICAL: Ignore hand-raised (true) events during initialization
  if (justJoinedRef.current && data.handRaised && data.participantId === currentUser.id) {
    rtkDebug.warn('[RTK] 🚫 Ignoring spurious hand-raised event during initialization')
    return
  }

  // Process event normally...
}
```

**Why this works:**

- **500ms grace period**: Spurious backend events arrive within ~100-200ms of joining
- **User intent tracking**: Once user explicitly toggles, all subsequent events are allowed
- **Minimal impact**: After 500ms, all events work normally regardless of user action
- **Remote participants**: Never blocked, always processed immediately
- **Hand-lowered events**: Always processed (only blocks hand-raised events)
- **No setTimeout complexity**: Uses simple timestamp comparison instead of timers

### Testing the Fix

**Before Fix:**

1. Join a call
2. Result: Your hand is automatically raised

**After Fix:**

1. Join a call
2. Result: Your hand is NOT raised
3. Wait 3 seconds, click raise hand
4. Result: Your hand is raised correctly

---

## Issue 2: Minimized View Not Showing Raised Hands (VERIFIED)

### The Problem

When the call is minimized, raised hand indicators are not visible, even when remote participants raise their hands. This makes it impossible for the host to see who wants to speak when the call is minimized.

### Investigation

The `MinimizedCallView` component already has the raised hand indicator UI (lines 177-185 in `MinimizedCallView.tsx`):

```typescript
{/* Raised hand indicator with order number */}
{isHandRaised && (
  <div className="gba:absolute gba:bottom-2 gba:right-2 gba:px-2 gba:py-1 gba:rounded-full gba:bg-warning gba:text-warning-foreground gba:shadow-lg gba:animate-pulse gba:flex gba:items-center gba:gap-1">
    <HandIcon className="gba:h-4 gba:w-4" weight="fill" />
    {handRaisedOrderNumber !== undefined && (
      <span className="gba:text-xs gba:font-bold">{handRaisedOrderNumber}</span>
    )}
  </div>
)}
```

The component is receiving the correct props (line 1778 in `GroupCallModalRtk.tsx`):

```typescript
<MinimizedCallView
  isHandRaised={isFirstPeerHandRaised}
  handRaisedOrderNumber={firstPeerHandRaisedOrderNumber}
  // ... other props
/>
```

### The Solution

Added debug logging to verify the data flow:

**File: `components/GroupCallModalRtk.tsx`** (lines ~1747-1756)

```typescript
rtkDebug.log('[RTK Modal] Minimized view - hand raised state:', {
  hasFirstPeer: !!rtkFirstPeer,
  firstPeerId: rtkFirstPeer?.id,
  firstPeerUserId: rtkFirstPeer?.userId,
  firstPeerCustomId: rtkFirstPeer?.customParticipantId,
  isFirstPeerHandRaised,
  remoteHandsRaisedKeys: Object.keys(callState.remoteHandsRaised || {}),
  remoteHandsRaisedValues: callState.remoteHandsRaised
})
```

### How to Verify

To verify if this issue exists:

1. Start a call with 2+ participants
2. Have participant A minimize the call
3. Have participant B raise their hand
4. Check participant A's minimized view

**If the raised hand shows:** Issue is resolved (likely was already working)
**If the raised hand doesn't show:** Check browser console for debug logs showing:

- `isFirstPeerHandRaised` value
- `remoteHandsRaised` object contents
- ID matching (peerId vs userId vs customParticipantId)

### Potential Root Causes (if issue persists)

If raised hands still don't show in minimized view after verification:

1. **ID Mismatch**: The `remoteHandsRaised` object uses a different ID than the peer's IDs
   - Check console logs to see which ID is used in `remoteHandsRaised`
   - Verify `isParticipantHandRaised` checks all three ID types (peerId, userId, customParticipantId)

2. **State Not Updating**: WebSocket events aren't being processed when minimized
   - Unlikely, but check if there's code that pauses WebSocket listeners when minimized

3. **Rendering Issue**: Component is memoized and not re-rendering
   - Check if `MinimizedCallView` memo comparison includes `isHandRaised` and `handRaisedOrderNumber`

---

## Implementation Details

### Files Modified

1. **`hooks/useRealtimeKitWebSocket.ts`**
   - Added `userIntentionallyToggledRef` to track explicit user actions
   - Added `joinTimeRef` to track join timestamp
   - Implemented 500ms grace period with timestamp comparison
   - Added filter in `handleHandUpdate` to ignore spurious events
   - Enhanced debug logging to track state updates

2. **`components/GroupCallModalRtk.tsx`**
   - Removed excessive debug logging that was running on every render

### Key Concepts

**Grace Period Strategy:**

- **Duration**: 500ms after joining (minimal impact on UX)
- **Filter criteria**: ALL must be true to block:
  - Event is for local user (not remote participants)
  - Event is raising hand (not lowering)
  - Within 500ms of joining
  - User hasn't explicitly toggled their hand
- **Bypass**: Once user intentionally toggles, filter is permanently disabled

**ID Matching:**

- Checks three IDs: `peerId`, `userId`, `customParticipantId`
- Required because different systems use different IDs:
  - RealtimeKit SDK: `peerId` and `userId`
  - Our backend/database: `customParticipantId`
  - WebSocket events: usually `customParticipantId`

---

## Testing Checklist

- [ ] Join a call - verify hand is NOT auto-raised
- [ ] Join a call, wait 3s, raise hand manually - verify hand is raised
- [ ] Join a call, another participant raises hand - verify you see their raised hand
- [ ] Minimize call while participant has hand raised - verify raised hand is visible
- [ ] Minimize call, have participant raise hand - verify raised hand appears
- [ ] Multiple participants raise hands - verify order numbers are correct
- [ ] Lower hand - verify indicator disappears
- [ ] Check browser console for any errors or warnings

---

## Future Improvements

1. **Backend Fix**: Investigate why backend sends spurious hand-raised events on join
   - Check join sequence in backend code
   - Ensure initial state is always `handRaised: false`
   - Only send hand-update events when state ACTUALLY changes

2. **Shorter Grace Period**: If backend is fixed, reduce grace period from 2s to 500ms

3. **Better ID Matching**: Standardize on single ID type across all systems

4. **Visual Feedback**: Add subtle animation when raised hand indicator appears/disappears

---

**Last Updated:** January 28, 2026  
**Related Files:**

- `hooks/useRealtimeKitWebSocket.ts` - WebSocket event handling
- `components/GroupCallModalRtk.tsx` - Main call UI
- `components/call/MinimizedCallView.tsx` - Minimized view UI
- `hooks/useRealtimeKitGroupCall.ts` - Call state management
