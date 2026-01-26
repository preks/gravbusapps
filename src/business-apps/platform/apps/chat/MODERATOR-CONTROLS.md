# Moderator Controls - Muting Participants

This feature allows meeting hosts/moderators to control participants' audio in group calls using Cloudflare Realtime Kit's host permissions.

## Features

### 1. **Mute Individual Participant**

- Click the three-dot menu (⋮) next to any participant in the Participants Panel
- Select "Mute participant"
- The participant's microphone will be disabled immediately
- Success/error toast notification is shown

### 2. **Mute All Participants**

- Click the "Mute All" button in the Participants Panel header
- All participants' microphones will be disabled at once
- Participants must manually unmute themselves to speak again
- Success/error toast notification is shown

## Implementation

### RTK API Methods Used

```typescript
// Mute single participant
const participant = meeting.participants.joined.get(participantId)
participant.disableAudio()

// Mute all participants
meeting.participants.disableAllAudio()
```

### Permission Checks

The feature requires `meeting.permissions.host.canMuteAudio` to be `true`. If the permission is missing, users will see an error toast: "You do not have permission to mute other participants".

### Files Modified

#### Frontend (gravity-business-apps)

1. **`components/GroupCallModalRtk.tsx`**
   - Added `handleMuteParticipant()` - Uses RTK `participant.disableAudio()`
   - Added `handleMuteAll()` - Uses RTK `meeting.participants.disableAllAudio()`
   - Permission checks for `canMuteAudio`
   - Toast notifications for success/error feedback
   - Imports `toast` from design system

2. **`components/call/ParticipantsPanel.tsx`**
   - Added "Mute All" button in header (only shown when participants are present)
   - Changed dropdown text from "Request to mute" to "Mute participant"
   - Added `onMuteAll` prop to interface
   - Uses `SpeakerXIcon` from Phosphor icons

3. **`hooks/useRealtimeKitWebSocket.ts`**
   - Removed old WebSocket-based mute request listeners (no longer needed)
   - Removed `onMuteRequested` from interface

4. **`hooks/useRealtimeKitGroupCall.ts`**
   - Removed `onMuteRequested` callback propagation (no longer needed)
   - Simplified interface

5. **`Chat.tsx`**
   - Removed `onMuteRequested` callback (no longer needed)
   - Removed toast notification for mute requests (handled in modal now)

#### Backend (chat-service)

No backend changes required! The muting is handled directly via RTK's P2P/SFU infrastructure.

The old WebSocket-based backend handler (`@SubscribeMessage('group-call:request-mute')`) can be removed as it's no longer used.

## User Experience

### Before (Request-Based):

1. User A clicks "Request to mute" on User B
2. WebSocket event sent to backend
3. Backend forwards to User B
4. User B sees toast: "User A requested you to mute"
5. User B decides whether to mute
   ❌ Not immediate, relies on user compliance

### After (Direct Control):

1. User A clicks "Mute participant" on User B
2. RTK immediately disables User B's audio
3. Toast shows: "Muted User B"
   ✅ Immediate control, actual moderation

## Testing

### 1. Single Participant Mute

```
1. Start a group call with 2+ participants
2. Open Participants Panel
3. Click ⋮ menu next to another participant
4. Click "Mute participant"
5. Verify:
   - Toast: "Muted {name}"
   - Participant's audio is disabled
   - Participant's mic icon shows muted state
```

### 2. Mute All

```
1. Start a group call with 2+ participants
2. Open Participants Panel
3. Click "Mute All" button in header
4. Verify:
   - Toast: "Muted all participants"
   - All participants' audio is disabled
   - All participants show muted state
```

### 3. Permission Check

```
1. Join as non-host participant
2. Open Participants Panel
3. Try to mute someone
4. Verify:
   - Toast: "You do not have permission to mute other participants"
   - No audio changes occur
```

## Console Logs

When debugging, look for these logs:

```javascript
// Success
[MUTE] Successfully muted participant: { participantId, participantName }
[MUTE ALL] Successfully muted all participants: {count}

// Errors
[MUTE] No meeting or participants available
[MUTE] Participant not found: {participantId}
[MUTE] No permission to mute participants (canMuteAudio is false)
[MUTE] Failed to mute participant: {error}
```

## Architecture Notes

### Why Direct RTK Control?

1. **Immediate**: No round-trip to backend, instant feedback
2. **Reliable**: RTK handles the WebRTC track disabling at SFU level
3. **Permission-Based**: RTK's built-in host permissions system
4. **Simpler**: No custom WebSocket events or backend orchestration

### RTK Host Permissions

Cloudflare Realtime Kit provides a permissions system where hosts can:

- Mute audio: `participant.disableAudio()` / `meeting.participants.disableAllAudio()`
- Disable video: `participant.disableVideo()`
- Remove participants: `participant.kick()`
- Pin/unpin participants

These controls work at the SFU (Selective Forwarding Unit) level, meaning the media server stops forwarding the participant's audio track to all recipients.

### Participant Re-enabling Audio

When a participant is muted by a moderator via `disableAudio()`, they can manually unmute themselves again if they have permission. This is by design - it's a "polite push" rather than a hard lock.

If you need to **prevent** a participant from unmuting (hard mute), you would need to:

1. Set role-based permissions when adding participants
2. Use `viewer` role instead of `participant` role
3. Or implement custom permission logic in the backend

## Future Enhancements

Potential additions:

- **Video control**: Disable video for specific participants
- **Kick participant**: Remove disruptive users from the call
- **Host transfer**: Transfer host permissions to another participant
- **Permission levels**: Fine-grained control (can mute but not kick, etc.)
- **Audit log**: Track moderation actions for compliance
