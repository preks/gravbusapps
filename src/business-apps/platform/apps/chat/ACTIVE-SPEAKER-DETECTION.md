# Active Speaker Detection

This document describes the active speaker detection feature implemented using Cloudflare Realtime Kit.

## Overview

The active speaker detection feature highlights the currently speaking participant and prioritizes them in the UI. It provides three main enhancements:

1. **Visual Highlight** - Animated border around active speaker's video tile
2. **Auto-Focus in Grid** - Active speaker moves to top-left position in video grid
3. **Participant Panel Sorting** - Active speakers sorted to top of participants list

## Architecture

### Hook: `useRealtimeKitActiveSpeaker`

**Location**: `src/business-apps/platform/apps/chat/hooks/useRealtimeKitActiveSpeaker.ts`

**Purpose**: Subscribes to RTK's `activeSpeaker` event and maintains speaker state.

**State Managed**:

- `activeSpeakerId`: Current active speaker's RTK peer ID
- `activeSpeakerHistory`: Array of recent speakers (last 10, most recent first)

**Event Subscription**:

```typescript
meeting.participants.on('activeSpeaker', handleActiveSpeaker)
```

The hook listens to Cloudflare RTK's built-in active speaker detection, which uses audio level analysis to determine who is speaking.

### Integration: `useRealtimeKitGroupCall`

**Changes**:

1. Imports and instantiates `useRealtimeKitActiveSpeaker` hook
2. Passes `meeting` object to the hook
3. Returns `activeSpeakerId` and `activeSpeakerHistory` in hook return value

**Return Interface**:

```typescript
{
  activeSpeakerId?: string | null
  activeSpeakerHistory?: string[]
  // ... other properties
}
```

### Type Definitions: `useGroupCall.ts`

**Interface Update**:

```typescript
export interface UseGroupCallReturn {
  activeSpeakerId?: string | null // Current active speaker ID (RTK only)
  activeSpeakerHistory?: string[] // Recent speakers for sorting (RTK only)
  // ... other properties
}
```

## UI Components

### 1. Video Tile Highlighting (`ParticipantVideoTile.tsx`)

**Visual Effects**:

- Primary color ring around active speaker's tile
- Pulse animation for attention
- Applied to both video and avatar tiles

**Implementation**:

```typescript
<div
  className={`... ${
    isActiveSpeaker ? 'gba:ring-4 gba:ring-primary gba:ring-offset-2 gba:ring-offset-background' : ''
  }`}
  style={isActiveSpeaker ? { animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite' } : undefined}
>
```

### 2. Grid Sorting (`GroupCallModalRtk.tsx`)

**Sort Priority** (in `gridItems` useMemo):

1. Focused screen share (if any)
2. Local participant (you)
3. Active speaker
4. Recent speakers (by history order)
5. Other participants
6. Non-focused screen shares

**Implementation Details**:

- `isActiveSpeaker` flag added to grid item type
- Items sorted before pagination
- Active speaker always visible on first page
- Sorting preserves screen share priority

### 3. Participants Panel Sorting (`ParticipantsPanel.tsx`)

**Visual Indicators**:

- Active speaker row highlighted with `gba:bg-primary/10`
- Avatar has ring: `gba:ring-2 gba:ring-primary gba:ring-offset-2`
- "Speaking" badge next to name

**Sort Order**:

```typescript
// In activeParticipants selector
1. Local user (you) - always first
2. Active speaker - second
3. Recent speakers - by history order
4. Others - alphabetically
```

**Implementation**:

```typescript
const isActiveSpeakerNow = activeSpeakerId === participant.id

<div className={`... ${isActiveSpeakerNow ? 'gba:bg-primary/10' : ''}`}>
  <Avatar className={isActiveSpeakerNow ? 'gba:ring-2 gba:ring-primary gba:ring-offset-2' : ''}>
  {isActiveSpeakerNow && (
    <span className="gba:ml-2 gba:text-xs gba:text-primary gba:font-semibold">
      Speaking
    </span>
  )}
</div>
```

## Data Flow

```
Cloudflare RTK Audio Analysis
          ↓
'activeSpeaker' event emitted
          ↓
useRealtimeKitActiveSpeaker hook
          ↓
useRealtimeKitGroupCall hook
          ↓
Chat.tsx (passes props)
          ↓
GroupCallModalRtk.tsx
          ↓
├─ VideoGrid (sorted gridItems with isActiveSpeaker flag)
│  └─ ParticipantVideoTile (visual highlight)
└─ ParticipantsPanel (sorted list with "Speaking" badge)
```

## Usage

The feature is fully automatic once a call is active. No user interaction required.

**How It Works**:

1. User joins a call using Realtime Kit
2. RTK analyzes audio levels across participants
3. When someone speaks, RTK emits `activeSpeaker` event
4. Our hook updates state
5. UI re-renders with:
   - Highlighted video tile
   - Speaker moved to top-left
   - "Speaking" badge in participants panel

## Testing

### Manual Testing Steps

1. **Join a call** with multiple participants
2. **Speak** and observe:
   - Your tile gets highlighted border
   - "Speaking" badge appears next to your name
3. **Wait for another participant to speak**:
   - Their tile gets highlighted
   - They move to position 2 in grid (after you)
   - They appear at position 2 in participants list (after you)
4. **Multiple speakers alternating**:
   - History builds up
   - Recent speakers stay near top
   - Visual feedback updates in real-time

### Debug Logging

All active speaker events are logged with `rtkDebug.log`:

```typescript
[RTK Active Speaker] 🎙️ Active speaker changed: {
  speakerId,
  participantName,
  customParticipantId
}
```

Check console logs prefixed with `[RTK Active Speaker]` for event tracking.

## Performance Considerations

1. **State Updates**: Only updates when active speaker changes (not every audio frame)
2. **History Limit**: Capped at 10 recent speakers to prevent memory growth
3. **Memoization**: Grid sorting uses `useMemo` with proper dependencies
4. **Re-renders**: Components re-render only when `activeSpeakerId` or `activeSpeakerHistory` change

## Browser Compatibility

Active speaker detection relies on Cloudflare Realtime Kit's built-in audio level analysis, which works across all modern browsers that support WebRTC:

- ✅ Chrome/Edge 80+
- ✅ Firefox 75+
- ✅ Safari 14+
- ✅ Opera 67+

## Future Enhancements

Potential improvements:

1. Add audio waveform visualization for active speaker
2. Configurable sensitivity for speaker detection
3. "Dominant speaker" mode (longer speaking time = priority)
4. Speaking time statistics per participant
5. Optional audio level indicators for all participants

## Related Files

- `src/business-apps/platform/apps/chat/hooks/useRealtimeKitActiveSpeaker.ts` - Core hook
- `src/business-apps/platform/apps/chat/hooks/useRealtimeKitGroupCall.ts` - Integration
- `src/business-apps/platform/apps/chat/hooks/useGroupCall.ts` - Type definitions
- `src/business-apps/platform/apps/chat/components/GroupCallModalRtk.tsx` - Grid sorting
- `src/business-apps/platform/apps/chat/components/call/ParticipantVideoTile.tsx` - Visual highlight
- `src/business-apps/platform/apps/chat/components/call/ParticipantsPanel.tsx` - Panel sorting
- `src/business-apps/platform/apps/chat/Chat.tsx` - Props wiring

## References

- [Cloudflare Realtime Kit Documentation](https://developers.cloudflare.com/calls/)
- [WebRTC Audio Level API](https://www.w3.org/TR/webrtc-stats/#dom-rtcaudiosourcestats-audiolevel)
