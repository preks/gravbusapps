# Transcription Integration - Frontend Implementation

## Overview

This document describes the frontend implementation for manual post-meeting transcription in RealtimeKit calls. Users can toggle transcription ON/OFF, and transcripts are automatically saved as notes after meetings end.

## Implementation Summary

### Phase 1: API Client (Completed)

**File**: `src/business-apps/platform/apps/chat/services/realtimeKitApiClient.ts`

Added `transcription_enabled` parameter to `createMeeting` method:

```typescript
async createMeeting(
  conversationId: string,
  callType: 'audio' | 'video' = 'video',
  displayName?: string,
  firstName?: string,
  lastName?: string,
  meetingName?: string,
  transcription_enabled?: boolean // NEW
): Promise<CreateMeetingResponse>
```

### Phase 2: Hook State Management (Completed)

**File**: `src/business-apps/platform/apps/chat/hooks/useRealtimeKitGroupCall.ts`

1. Added transcription state to `CallState` interface
2. Added `transcriptionEnabled: boolean` to initial state (default: false)
3. Added `toggleTranscription()` callback function
4. Pass transcription flag when calling `createMeeting` API
5. Return `transcriptionEnabled` and `toggleTranscription` from hook

### Phase 3: WebSocket Listener (Completed)

**File**: `src/business-apps/platform/apps/chat/hooks/useRealtimeKitGroupCall.ts`

Added WebSocket event listener for `transcript-ready` events:

**Note**: All meeting participants receive this notification automatically (not just the creator). The transcript is created by a background polling job and shared with all participants.

```typescript
useEffect(() => {
  if (!wsClient) return

  const socket = wsClient.getSocket()
  if (!socket) return

  const handleTranscriptReady = (data: { noteId: string; meetingId: string; meetingTitle: string }) => {
    toast.success('Meeting Transcript Ready', {
      description: `${data.meetingTitle} - Transcript has been saved and shared with all participants`,
      duration: 10000
    })

    console.log('View transcript at:', `/note-apps?noteId=${data.noteId}`)
  }

  socket.on('transcript-ready', handleTranscriptReady)

  return () => {
    socket.off('transcript-ready', handleTranscriptReady)
  }
}, [wsClient])
```

### Phase 4: UI Components (Completed)

#### CallControlsBar

**File**: `src/business-apps/platform/apps/chat/components/call/CallControlsBar.tsx`

Added optional transcription indicator:

- New prop: `transcriptionActive?: boolean`
- Visual indicator with pulsing microphone icon
- Shows "Recording" text when active

#### GroupCallModalRtk

**File**: `src/business-apps/platform/apps/chat/components/GroupCallModalRtk.tsx`

- Added `transcriptionEnabled` prop
- Passes to `CallControlsBar` to show recording indicator during call

#### Chat.tsx

**File**: `src/business-apps/platform/apps/chat/Chat.tsx`

- Destructured `transcriptionEnabled` and `toggleTranscription` from hook
- Passed `transcriptionEnabled` to `GroupCallModalRtk`

### Phase 5: Translations (Completed)

#### English (en-US.ftl)

```fluent
chat-call-enableTranscription = Enable Transcription
chat-call-transcriptionActive = Recording
chat-call-recording = Recording
chat-transcript-ready = Meeting Transcript Ready
chat-transcript-view = View Transcript
chat-transcript-saved = Your meeting transcript has been saved
```

#### German (de-DE.ftl)

```fluent
chat-call-enableTranscription = Transkription aktivieren
chat-call-transcriptionActive = Aufnahme
chat-call-recording = Aufnahme
chat-transcript-ready = Meeting-Transkript bereit
chat-transcript-view = Transkript anzeigen
chat-transcript-saved = Ihr Meeting-Transkript wurde gespeichert
```

### Phase 6: Type Definitions (Completed)

**File**: `src/business-apps/platform/apps/chat/hooks/useGroupCall.ts`

Updated `UseGroupCallReturn` interface:

```typescript
export interface UseGroupCallReturn {
  // ... existing fields ...
  transcriptionEnabled?: boolean
  toggleTranscription?: () => void
}
```

## How It Works

### User Flow

1. **Before Call**: User toggles transcription ON using `toggleTranscription()`
2. **Start Call**: `startCall()` passes `transcription_enabled: true` to backend
3. **During Call**: Recording indicator shows in call controls bar
4. **After Call**: Backend background job automatically processes transcript (2-10 minutes)
5. **Notification**: **All participants** receive toast notification when transcript is ready
6. **View**: Any participant can navigate to `/note-apps?noteId={noteId}` to view transcript
7. **Collaboration**: Transcript is owned by meeting creator and shared with all participants

### Technical Flow

```
User → toggleTranscription() → callState.transcriptionEnabled = true
  ↓
startCall() → apiClient.createMeeting(..., transcription_enabled: true)
  ↓
Backend → Cloudflare → Meeting created with transcription enabled
  ↓
Meeting ends → Cloudflare processes → Webhook delivered
  ↓
Backend saves note → Emits 'transcript-ready' via WebSocket
  ↓
Frontend listener → toast.success() → User notified
```

## Configuration

### Required Backend Setup

1. Backend webhook endpoint at `/webhooks/realtimekit/transcript`
2. Cloudflare webhook registered with RealtimeKit API
3. Document-service integration for note creation
4. WebSocket gateway emitting `transcript-ready` events

### Environment Variables

No frontend environment variables required. Backend needs:

- `CLOUDFLARE_REALTIME_API_TOKEN`
- `CLOUDFLARE_ACCOUNT_ID`
- `CLOUDFLARE_REALTIME_APP_ID`
- `DOCUMENT_SERVICE_URL`

## Testing

### Manual Testing Checklist

1. Open chat application
2. Call `toggleTranscription()` to enable transcription (default: OFF)
3. Start a group call
4. Verify recording indicator shows in call controls
5. Speak a few words during the call
6. End the call
7. Wait 1-2 minutes
8. Verify toast notification appears
9. Check browser console for note ID
10. Navigate to `/note-apps?noteId={id}` to verify transcript

### Debugging

Check browser console for:

```
[RTK] 📝 Transcript ready: { noteId, title, meetingId, meetingTitle }
[RTK] 📝 View transcript at: /note-apps?noteId=...
```

Check chat-service logs for:

```
[RealtimeKitWebhookController] Received transcript webhook
[RealtimeKitWebhookController] Transcript saved as note: {noteId}
```

## Known Limitations

### Current Implementation

1. **Toggle Location**: Transcription must be toggled BEFORE starting the call (cannot toggle during call)
2. **Navigation**: Toast shows note ID in console; manual navigation required
3. **Automatic Processing**: Background job polls every 5 minutes and creates transcript automatically
4. **All Participants**: All meeting participants receive the notification (not just creator)
5. **Shared Access**: Transcript is owned by creator and automatically shared with all participants
6. **No Manual Fetch**: No user action required; transcripts created automatically 2-10 minutes after meeting

### Implemented Features

✅ **All Participants Notified**: Everyone in the meeting receives notification (implemented)
✅ **Shared Access**: Transcript automatically shared with all participants (implemented)
✅ **Automatic Creation**: Background polling creates transcripts without user action (implemented)

### Future Enhancements

1. **Pre-Call Dialog**: Add modal with transcription toggle before starting call
2. **Toast Action Button**: Add clickable button in toast to open note directly (not just console log)
3. **Real-Time Display**: Show transcript during call (requires different approach)
4. **Retry Logic**: Queue notifications for offline users
5. **Edit Permissions**: Allow participants to edit transcript (currently comment-only)

## UI/UX Notes

### Transcription Indicator

The recording indicator appears in the call controls bar when transcription is active:

- Red pulsing microphone icon
- "Recording" text
- Positioned in left controls group
- Visible throughout the entire call

### Toast Notification

- **Title**: "Meeting Transcript Ready: {title}"
- **Description**: "Your transcript has been saved to notes"
- **Duration**: 10 seconds
- **Variant**: Success (green)

## Accessibility

- Recording indicator has semantic color (red for recording)
- Pulsing animation for visual attention
- Toast is screen reader accessible
- Keyboard navigation supported

## Security & Privacy

1. **Opt-In**: Transcription is OFF by default
2. **Visual Indicator**: Clear indicator when recording is active
3. **Per-Meeting**: Users decide for each meeting individually
4. **No Surprise Recording**: Never records without user explicitly enabling

## Integration Points

### Required Backend Events

**WebSocket Event**: `transcript-ready`

Sent to **all meeting participants** automatically by backend polling job.

```typescript
{
  noteId: string
  meetingId: string
  meetingTitle: string
}
```

**Note**: Backend creates the note owned by meeting creator and automatically shares it with all participants via document-service sharing API.

### API Endpoints

**POST /api/v1/realtimekit/meetings**

Request body:

```json
{
  "conversationId": "uuid",
  "callType": "video",
  "transcription_enabled": true
}
```

## Files Modified

1. `services/realtimeKitApiClient.ts` - API client
2. `hooks/useRealtimeKitGroupCall.ts` - State management + WebSocket
3. `hooks/useGroupCall.ts` - Type definitions
4. `components/GroupCallModalRtk.tsx` - Props interface
5. `components/call/CallControlsBar.tsx` - Recording indicator
6. `Chat.tsx` - Props wiring
7. `_i18n/en-US.ftl` - English translations
8. `_i18n/de-DE.ftl` - German translations

## Next Steps

### Adding Pre-Call Toggle UI

To allow users to toggle transcription before starting a call, add UI in one of these locations:

**Option A: Conversation Header**

Add a transcription toggle button next to the call buttons:

```tsx
<Button
  variant={transcriptionEnabled ? 'default' : 'outline'}
  size="icon"
  onClick={toggleTranscription}
  title={t('chat-call-enableTranscription')}
>
  <Mic className={transcriptionEnabled ? 'animate-pulse' : ''} />
</Button>
```

**Option B: Pre-Call Dialog**

Show a dialog before starting a group call with options:

- Call type (Audio/Video)
- Enable transcription toggle
- Meeting name

**Option C: Settings Menu**

Add transcription toggle to the conversation settings dropdown.

### Recommended: Pre-Call Dialog

For best UX, show a confirmation dialog when user clicks "Start Call":

1. Show meeting details (participants, call type)
2. Add transcription toggle
3. Confirm to start call

This ensures users make conscious decision about transcription before every call.

## Support

For issues:

1. Check browser console for transcript-ready events
2. Check chat-service logs for webhook delivery
3. Verify Cloudflare webhook is registered
4. Confirm tunnel is running (local dev)
5. Check document-service for note creation

## References

- Backend Implementation: `chat-service/docs/LOCAL_WEBHOOK_TESTING.md`
- Cloudflare Webhooks: https://docs.realtime.cloudflare.com/guides/capabilities/webhooks
- RealtimeKit Transcription: https://docs.realtime.cloudflare.com/guides/capabilities/audio/transcriptions
