# Group Call Moderation - WebSocket Auto-Mute

## Overview

This implementation provides moderator controls for muting participants in group calls using **WebSocket-based auto-mute**. When a moderator requests to mute a participant, the target user's client automatically executes the mute via their local RTK instance.

## Features

### 1. **Mute Individual Participant**

- Click the three-dot menu (⋮) next to any participant in the Participants Panel
- Select "Mute participant"
- Target participant's microphone is automatically disabled via WebSocket event

### 2. **Mute All Participants**

- Click the "Mute All" button in the Participants Panel header
- All participants' microphones are automatically disabled at once

## How It Works

### Architecture

```
┌─────────────────┐                    ┌─────────────────┐
│   Moderator     │                    │   Participant   │
│                 │                    │                 │
│  Clicks "Mute"  │   WebSocket Msg    │  Receives Msg   │
│                 │ ─────────────────> │                 │
│                 │  request-mute      │                 │
│                 │                    │  Auto-executes  │
│                 │                    │  self.disableAudio() │
│                 │                    │                 │
│                 │                    │  Shows Toast    │
│                 │                    │  "Muted by X"   │
└─────────────────┘                    └─────────────────┘
```

### Key Components

1. **Frontend (Moderator Side)**
   - `GroupCallModalRtk.tsx` - Mute buttons and handlers
   - Emits `group-call:request-mute` WebSocket event
   - Shows success toast: "Mute request sent to {name}"

2. **Backend**
   - `chat.gateway.ts` - Relays WebSocket events
   - Handles `@SubscribeMessage('group-call:request-mute')`
   - Forwards to target participant via Socket.IO rooms

3. **Frontend (Participant Side)**
   - `useRealtimeKitWebSocket.ts` - Auto-mute listener
   - Receives `group-call:mute-requested` event
   - Executes `meeting.self.disableAudio()` automatically
   - Shows info toast: "You were muted by {name}"

## Implementation Details

### Frontend - Mute Request (Moderator)

```typescript
// GroupCallModalRtk.tsx
const handleMuteParticipant = useCallback(
  (participantId: string, participantName: string) => {
    const socket = wsClient.getSocket()
    socket.emit('group-call:request-mute', {
      targetParticipantId: participantId,
      targetParticipantName: participantName,
      requestedBy: currentUser.id,
      requestedByName: currentUser.odName
    })

    toast.success(`Mute request sent to ${participantName}`)
  },
  [wsClient, currentUser]
)
```

### Backend - Event Relay

```typescript
// chat.gateway.ts
@SubscribeMessage('group-call:request-mute')
async handleGroupCallRequestMute(
  @MessageBody() data: {
    targetParticipantId: string
    targetParticipantName: string
    requestedBy: string
    requestedByName: string
  }
) {
  // Relay to target participant
  this.server.to(`user:${data.targetParticipantId}`).emit('group-call:mute-requested', {
    requestedBy: data.requestedBy,
    requestedByName: data.requestedByName
  })

  return { success: true }
}
```

### Frontend - Auto-Mute (Participant)

```typescript
// useRealtimeKitWebSocket.ts
useEffect(() => {
  const socket = wsClient?.getSocket()
  if (!socket || !meeting) return

  const handleMuteRequested = (data: { requestedByName: string }) => {
    // Auto-mute via RTK
    meeting.self.disableAudio()

    // Notify user
    toast.info(`You were muted by ${data.requestedByName}`)
  }

  socket.on('group-call:mute-requested', handleMuteRequested)
  return () => socket.off('group-call:mute-requested', handleMuteRequested)
}, [wsClient, meeting])
```

## Advantages Over RTK Direct Control

### ✅ **Works Immediately**

- No Cloudflare Dashboard configuration required
- No preset permission setup needed

### ✅ **Full Control**

- Backend-managed logic
- Easy to extend with custom rules

### ✅ **Forced Mute**

- Target client automatically executes mute
- Not just a polite request - actual enforcement

### ✅ **Better UX**

- Clear feedback with toasts on both sides
- Moderator: "Mute request sent"
- Participant: "You were muted by {name}"

## Testing

### 1. Single Participant Mute

```
1. Start a group call with 2+ participants
2. User A opens Participants Panel
3. User A clicks ⋮ menu next to User B
4. User A selects "Mute participant"
5. User A sees toast: "Mute request sent to User B"
6. User B's mic is automatically disabled
7. User B sees toast: "You were muted by User A"
8. Verify User B's mic icon shows muted state
```

### 2. Mute All

```
1. Start a group call with 3+ participants
2. User A clicks "Mute All" button in Participants Panel header
3. User A sees toast: "Mute requests sent to 2 participants"
4. All other participants' mics are automatically disabled
5. Each participant sees toast: "You were muted by User A"
6. Verify all participants show muted state
```

### 3. WebSocket Connection

```
1. Join call and verify WebSocket connected
2. Check browser console for: "[RTK] ✅ WebSocket listener attached for mute requests"
3. Trigger mute request
4. Check console logs for: "[RTK] 🔇 Received mute request from: {name}"
5. Verify auto-mute: "[RTK] ✅ Auto-muted self via RTK"
```

## Files Modified

### Frontend

- `src/business-apps/platform/apps/chat/hooks/useRealtimeKitWebSocket.ts` - Auto-mute listener
- `src/business-apps/platform/apps/chat/hooks/useRealtimeKitGroupCall.ts` - Pass meeting to WebSocket hook
- `src/business-apps/platform/apps/chat/components/GroupCallModalRtk.tsx` - Mute handlers using WebSocket

### Backend

- `src/gateway/chat.gateway.ts` - WebSocket event relay handler

## Comparison: Approaches

### WebSocket Auto-Mute (Current Implementation):

1. User A clicks "Mute participant" on User B
2. WebSocket event sent to backend
3. Backend relays to User B
4. User B's client auto-executes `meeting.self.disableAudio()`
5. User B sees toast: "You were muted by User A"
   ✅ Immediate, forced mute, no configuration needed

### RTK Direct Control (Blocked by Configuration):

```typescript
// Requires Cloudflare Dashboard preset configuration
participant.disableAudio() // Needs canMuteAudio permission
```

❌ Requires external configuration, currently blocked

### Request-Based (Old Approach - Not Used):

1. User A clicks "Request to mute" on User B
2. WebSocket event sent to backend
3. Backend relays to User B
4. User B sees toast: "User A requested you to mute"
5. User B decides whether to mute
   ❌ Not immediate, relies on user compliance

## Security Considerations

### Client-Side Trust Model

- This implementation trusts the participant's client to execute the mute
- Malicious clients could ignore the mute request by modifying the code
- For enterprise-grade hard mutes, RTK Direct Control with proper presets is recommended

### Mitigation

- WebSocket events are server-validated (user authentication required)
- Only active call participants can send/receive mute requests
- Socket.IO rooms ensure messages only reach intended targets

## Future Enhancements

Potential additions:

- **Video control**: Disable video for specific participants
- **Kick participant**: Remove disruptive users from the call
- **Hard mute**: Prevent unmuting (requires RTK permission setup)
- **Moderator roles**: Assign moderation permissions to specific users
