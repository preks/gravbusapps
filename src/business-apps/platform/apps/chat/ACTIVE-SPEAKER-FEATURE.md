# Active Speaker Detection Feature

## Overview

The Active Speaker Detection feature provides real-time identification of who is currently speaking in a group call. This enhances the user experience by:

- Automatically highlighting the active speaker
- Prioritizing speaker video in the grid layout
- Showing the active speaker in minimized call views
- Sorting participants based on speaking activity

## Technology

- **SDK**: Cloudflare Realtime Kit
- **Event**: `activeSpeaker` event from `meeting.participants`
- **Hook**: `useRealtimeKitActiveSpeaker.ts`

## Current Implementation

### 1. Hook: `useRealtimeKitActiveSpeaker`

**Location**: `src/business-apps/platform/apps/chat/hooks/useRealtimeKitActiveSpeaker.ts`

**Returns**:

```typescript
{
  activeSpeakerId: string | null       // Current active speaker's peer ID
  activeSpeakerHistory: string[]       // Last 10 speakers (most recent first)
}
```

**Features**:

- Subscribes to RTK's `activeSpeaker` event
- Tracks current speaker's peer ID
- Maintains history of recent speakers (max 10)
- Automatic cleanup on unmount

**Usage**:

```typescript
const { activeSpeakerId, activeSpeakerHistory } = useRealtimeKitActiveSpeaker({
  meeting
})
```

### 2. Integration Points

#### A. Video Grid Sorting (`GroupCallModalRtk.tsx`)

**Purpose**: Prioritizes active speaker in the video grid

**Sorting Order**:

1. Focused screen share (if any)
2. Local user
3. Active speaker ⭐
4. Recent speakers (by history)
5. Other participants
6. Additional screen shares

**Code Reference**: Lines 965-993

#### B. Video Tile Visual Indicator (`ParticipantVideoTile.tsx`)

**Purpose**: Shows visual feedback for who's speaking

**Visual Effect**:

- Static colored ring around video tile
- 4px ring width
- 2px offset from video edge
- Uses primary theme color

**Code Reference**: Lines 206-210

```typescript
className={`... ${
  isActiveSpeaker ? 'gba:ring-4 gba:ring-primary gba:ring-offset-2 gba:ring-offset-background' : ''
}`}
```

#### C. Participants Panel (`ParticipantsPanel.tsx`)

**Purpose**: Highlights and sorts participants by speaking activity

**Features**:

- Active speaker sorted to top (after local user)
- Light background highlight (`gba:bg-primary/10`)
- Speaker history affects sort order

**Code Reference**: Lines 139-150, 274-279

#### D. Minimized Call View (`GroupCallModalRtk.tsx`)

**Purpose**: Shows active speaker's video in minimized floating window

**Features**:

- **Debounced switching** (800ms delay)
- Prevents rapid video flickering
- Fallback to first participant if no active speaker
- Automatic video stream switching

**Configuration**:

```typescript
// Debounce delay (ms) - adjust for responsiveness vs stability
const DEBOUNCE_DELAY = 800 // Current: 0.8 seconds

// Options:
// 500ms  - Very responsive, might flicker
// 800ms  - Balanced (current setting)
// 1000ms - Stable, slightly delayed
// 1500ms - Very stable, less responsive
```

**Code Reference**: Lines 1325-1360

## Configuration

### Debounce Timing

The minimized view uses debouncing to prevent video flickering when multiple people speak in quick succession.

**Location**: `GroupCallModalRtk.tsx` line 1339

**Current Value**: 800ms

**Adjust the value based on your needs**:

```typescript
activeSpeakerTimeoutRef.current = setTimeout(() => {
  setDebouncedActiveSpeaker(activeSpeakerId)
}, 800) // ← Change this value
```

**Recommendations**:

- **Lower** (300-600ms): More responsive, good for fast-paced conversations
- **Medium** (800-1200ms): Balanced, works for most scenarios
- **Higher** (1500-2500ms): Very stable, good for formal meetings

### Speaker History Length

**Location**: `useRealtimeKitActiveSpeaker.ts` line 68

**Current Value**: 10 speakers

```typescript
return [speakerId, ...filtered].slice(0, 10) // ← Change this number
```

## Potential Future Enhancements

### 1. Spotlight Mode / Speaker View

**Description**: Show only the active speaker in a large view, with other participants in thumbnails

**Implementation Ideas**:

- Add layout toggle button: Grid / Speaker View / Spotlight
- Auto-switch to spotlight when presenting
- Pin/unpin specific speakers

**Use Cases**:

- Presentations
- Lectures
- Webinars
- Town halls

### 2. Audio Visualizations

**Description**: Visual feedback showing audio levels and speaking activity

**Ideas**:

- Waveform animation around active speaker's avatar
- Volume bars next to participant names
- Pulsing microphone icon
- Speaking indicator badge

**Benefits**:

- Better feedback for muted participants
- Visual confirmation of audio transmission
- Accessibility improvement

### 3. Speaker Analytics

**Description**: Track and display speaking statistics during/after calls

**Metrics to Track**:

- Total speaking time per participant
- Speaking frequency (times speaker became active)
- Average speaking duration
- Speaking time percentage
- Turn-taking balance

**Use Cases**:

- Meeting effectiveness analysis
- Engagement tracking
- Moderation insights
- Team collaboration metrics

### 4. Smart Layout Auto-Switching

**Description**: Automatically adjust layout based on speaking patterns

**Behaviors**:

- Switch to spotlight when one person dominates
- Switch to grid when conversation is balanced
- Enlarge active speaker's tile temporarily
- Pin frequently speaking participants

### 5. Enhanced Minimized View

**Description**: Improve the minimized call experience

**Ideas**:

- Show multiple speakers (2x2 grid)
- Picture-in-picture browser API integration
- Hover to see all participants
- Click active speaker to focus on them

### 6. Active Speaker Notifications

**Description**: Alert users when important people start speaking

**Features**:

- Desktop notifications when specific participants speak
- Toast messages in-app
- Sound alerts (optional)
- VIP speaker tracking

**Use Cases**:

- Executive meetings
- Customer calls
- Support scenarios

### 7. Recording Focus

**Description**: Optimize call recordings based on active speaker

**Features**:

- Auto-zoom on active speaker in recording
- Higher quality for active speaker's stream
- Picture-in-picture recording layout
- Speaker-focused transcription

### 8. Background Blur/Effects Control

**Description**: Automatically enhance active speaker's video

**Ideas**:

- Apply background blur to active speaker
- Enhance lighting/quality
- Face tracking and centering
- Professional mode toggle

### 9. Speaker Queue Management

**Description**: Manage speaking order in structured meetings

**Features**:

- Raise hand to speak queue
- Auto-unmute when it's someone's turn
- Speaking timer/limits
- Moderator controls for speaker order

### 10. AI-Powered Features

**Description**: Use ML/AI to enhance speaking experience

**Ideas**:

- Noise suppression for active speaker
- Echo cancellation improvements
- Auto-captions for active speaker
- Speaking pattern recognition
- Meeting insights generation

## Debugging

### Enable Debug Logs

Active speaker events are logged via `rtkDebug` utility:

```typescript
rtkDebug.log('[RTK Active Speaker] 🎙️ Active speaker changed:', {
  speakerId,
  peerId: participant?.peerId,
  volume: participant?.volume,
  participantName: participant?.name
})
```

**To view logs**: Open browser console and filter for `[RTK Active Speaker]`

### Common Issues

#### Issue: Active speaker not detected

**Causes**:

- Meeting not properly initialized
- Participants don't have audio tracks
- Browser permissions not granted

**Debug**:

1. Check if `meeting.participants` exists
2. Verify audio tracks are enabled
3. Check console for listener attachment messages

#### Issue: Too much flickering

**Solution**: Increase debounce delay (line 1339 in `GroupCallModalRtk.tsx`)

#### Issue: Too slow to respond

**Solution**: Decrease debounce delay (line 1339 in `GroupCallModalRtk.tsx`)

#### Issue: Active speaker indicator stuck

**Causes**:

- Event listener not cleaning up properly
- Speaker left but event didn't clear

**Debug**:

1. Check if unmount cleanup is running
2. Verify event listener is being removed
3. Check participant leave handling

## Testing

### Manual Testing Checklist

- [ ] Active speaker ring appears on video tiles
- [ ] Active speaker is sorted to top of grid
- [ ] Participants panel highlights active speaker
- [ ] Minimized view shows active speaker's video
- [ ] Video switches smoothly (no flickering)
- [ ] Speaker history maintains recent speakers
- [ ] Visual indicator removed when speaker stops
- [ ] Multiple rapid speakers handled gracefully
- [ ] Works with audio-only participants
- [ ] Works with screen sharing active

### Testing Scenarios

1. **Single Speaker**: One person talks continuously
   - ✅ Their video should be highlighted
   - ✅ Should appear first in grid
   - ✅ Should show in minimized view

2. **Rapid Switching**: Multiple people talking in quick succession
   - ✅ Should not flicker excessively
   - ✅ Debounce should prevent rapid switches
   - ✅ History should track all speakers

3. **No Audio**: Silent call with no speakers
   - ✅ Should show first participant in minimized view
   - ✅ No indicators should show
   - ✅ No errors in console

4. **Screen Share + Speaking**: Someone shares screen while speaking
   - ✅ Screen share should remain visible
   - ✅ Speaker ring should appear on video tile
   - ✅ Sorting should prioritize screen share

## Technical Details

### Event Structure

The RTK `activeSpeaker` event provides:

```typescript
{
  peerId: string      // RTK peer ID
  id?: string        // Alternative ID
  userId?: string    // User ID
  volume?: number    // Speaking volume level
  name?: string      // Participant name
}
```

### Performance Considerations

- **History Limit**: Capped at 10 to prevent memory growth
- **Debouncing**: Reduces re-renders in minimized view
- **Memoization**: Grid sorting uses `useMemo` for performance
- **Event Cleanup**: Proper listener removal prevents memory leaks

### Browser Compatibility

Active speaker detection requires:

- ✅ WebRTC support
- ✅ MediaStream API
- ✅ Audio track analysis
- ✅ Modern browsers (Chrome 90+, Firefox 88+, Safari 15+)

## References

- **RTK Documentation**: [Cloudflare Realtime Kit](https://developers.cloudflare.com/calls/)
- **Hook Implementation**: `hooks/useRealtimeKitActiveSpeaker.ts`
- **Video Grid**: `components/GroupCallModalRtk.tsx`
- **Video Tile**: `components/call/ParticipantVideoTile.tsx`
- **Participants Panel**: `components/call/ParticipantsPanel.tsx`
- **Debug Guide**: `README-DEBUG.md`

## Contributing

When enhancing the active speaker feature:

1. **Test thoroughly** with multiple participants
2. **Consider performance** impact on large calls
3. **Maintain backwards compatibility** with existing APIs
4. **Update this documentation** with new features
5. **Add debug logging** for troubleshooting
6. **Handle edge cases** (no audio, rapid switching, etc.)

---

**Last Updated**: January 2026  
**Version**: 1.0  
**Status**: Production Ready ✅
