# Video Flicker Fixes

This document covers two separate video flicker issues and their solutions.

---

## Issue 1: Mute/Unmute Video Flash (FIXED)

### The Problem

When any participant (including yourself) mutes or unmutes their microphone, video feeds flash briefly (10-60ms black screen). This affects both:

- **Remote participants**: Their video flashes when they mute/unmute
- **Local video (your own)**: Your video flashes when you mute/unmute

This creates a jarring experience during normal call interactions.

### Root Cause

The issue had two parts affecting both remote and local video streams:

#### Part A: Remote Participants

In the remote participant track update logic (lines ~723-804 in `GroupCallModalRtk.tsx`):

1. When a participant mutes/unmutes, their `audioTrack?.id` changes or becomes null
2. The effect detects `audioTrackChanged = true`
3. The code resets the **entire video element** even though only audio changed:
   ```typescript
   // ❌ BAD - Resets video when only audio changed
   if (videoTrackChanged || audioTrackChanged) {
     videoElement.srcObject = null // ← Video disappears!
     setTimeout(() => {
       videoElement.srcObject = newStream // ← Video reappears (flash!)
     }, 10)
   }
   ```

#### Part B: Local Video (Your Own Stream)

Two issues caused local video flashing:

1. **In `useRealtimeKitMedia.ts`**: When you mute/unmute, the hook created a completely new `MediaStream` object:

   ```typescript
   // ❌ BAD - New stream object on every track change
   useEffect(() => {
     const stream = new MediaStream() // ← New object!
     if (audioTrack) stream.addTrack(audioTrack)
     if (videoTrack) stream.addTrack(videoTrack)
     setLocalStream(stream) // ← Causes re-render
   }, [audioTrack, videoTrack])
   ```

2. **In `GroupCallModalRtk.tsx`**: The local video attachment effect replaced the entire `srcObject` when the stream changed:
   ```typescript
   // ❌ BAD - Full replacement on any change
   useEffect(() => {
     videoElement.srcObject = localStream // ← Resets video
   }, [localStream, audioTrack, videoTrack])
   ```

### The Solution

#### For Remote Participants

Update only the changed track(s) in the existing MediaStream:

```typescript
// ✅ GOOD - Update only changed tracks
if (audioTrackChanged) {
  const stream = videoElement.srcObject as MediaStream
  stream.getAudioTracks().forEach(track => stream.removeTrack(track))
  if (peer.audioTrack) stream.addTrack(peer.audioTrack)
}

if (videoTrackChanged) {
  const stream = videoElement.srcObject as MediaStream
  stream.getVideoTracks().forEach(track => stream.removeTrack(track))
  if (cameraVideoTrack) stream.addTrack(cameraVideoTrack)
}
```

#### For Local Video

**1. Optimize `useRealtimeKitMedia.ts`** - Reuse the same MediaStream instance:

```typescript
// ✅ GOOD - Update existing stream instead of creating new one
setLocalStream(prevStream => {
  if (!prevStream) {
    // Create new stream only if we don't have one
    const newStream = new MediaStream()
    if (videoTrack) newStream.addTrack(videoTrack)
    if (audioTrack) newStream.addTrack(audioTrack)
    return newStream
  }

  // Update tracks in existing stream
  const existingAudioTrack = prevStream.getAudioTracks()[0]
  if (existingAudioTrack?.id !== audioTrack?.id) {
    if (existingAudioTrack) prevStream.removeTrack(existingAudioTrack)
    if (audioTrack) prevStream.addTrack(audioTrack)
  }

  // Return same stream reference (updated in place)
  return prevStream
})
```

**2. Optimize `GroupCallModalRtk.tsx`** - Track IDs instead of stream reference:

```typescript
// ✅ GOOD - Track individual track IDs, update dynamically
const localVideoTrackIdRef = useRef<string | null>(null)
const localAudioTrackIdRef = useRef<string | null>(null)

useEffect(() => {
  const videoTrackChanged = localVideoTrackIdRef.current !== currentVideoTrackId
  const audioTrackChanged = localAudioTrackIdRef.current !== currentAudioTrackId

  if (videoTrackChanged) {
    // Update only video track
    const stream = videoElement.srcObject as MediaStream
    stream.getVideoTracks().forEach(t => stream.removeTrack(t))
    if (videoTrack) stream.addTrack(videoTrack)
    localVideoTrackIdRef.current = currentVideoTrackId
  }

  if (audioTrackChanged) {
    // Update only audio track
    const stream = videoElement.srcObject as MediaStream
    stream.getAudioTracks().forEach(t => stream.removeTrack(t))
    if (audioTrack) stream.addTrack(audioTrack)
    localAudioTrackIdRef.current = currentAudioTrackId
  }
}, [meeting?.self?.videoTrack, meeting?.self?.audioTrack])
```

**Why this works:**

- MediaStream supports dynamic track addition/removal without resetting the video element
- Only the changed track is updated (audio or video), not both
- Same MediaStream instance is reused, preventing unnecessary re-renders
- Video playback continues uninterrupted when only audio changes
- Browser doesn't need to re-establish rendering context

### Testing the Fix

**Before Fix:**

1. Start a video call with 2+ participants
2. Have remote participant mute/unmute → Their video flashes
3. Mute/unmute yourself → Your own video flashes

**After Fix:**

1. Start a video call with 2+ participants
2. Have remote participant mute/unmute → Video continues smoothly
3. Mute/unmute yourself → Your video continues smoothly
4. Expected: No video flashing in any scenario

### Fallback Safety

Both fixes include try-catch fallbacks. If dynamic track update fails (rare edge case), they fall back to the full stream replacement method:

```typescript
try {
  // Update individual tracks...
} catch (error) {
  // Fallback to full stream replacement
  videoElement.srcObject = null
  setTimeout(() => {
    videoElement.srcObject = newStream
  }, 10)
}
```

---

## Issue 2: Minimized View Active Speaker Flicker (FIXED)

### The Problem

When a call is minimized, the video feed was flickering/resetting every ~500ms when the active speaker changed. This created a terrible user experience with constant video interruptions.

## Root Cause

The issue was caused by unnecessary re-renders triggered by active speaker detection updates:

### The Chain of Events

1. **Active Speaker Detection** runs every ~800ms (via RTK SDK)
2. **Debounced Update** happens every ~500ms (via `useRealtimeKitActiveSpeaker` hook)
3. **State Update** `debouncedActiveSpeaker` state changes
4. **useMemo Recalculation** `firstRemotePeer` recalculates (line ~1357)
5. **remotePeers Array Recreation** `useRealtimeKitSelector` creates new array reference
6. **Effect Triggers** Minimized video effect runs (was at line ~1410)
7. **Video Reset** Even with same peer, setting `srcObject` causes flicker

### The Core Issue

The minimized video useEffect was depending on `remotePeers`:

```typescript
// ❌ BAD - Causes flicker
useEffect(() => {
  const rtkPeer = remotePeers.find(p => p.id === firstRemotePeerId)
  // ... set video stream
}, [callState.isMinimized, firstRemotePeerId, firstRemoteVideoTrackId, remotePeers])
//                                                                        ^^^^^^^^^^
//                                                                        PROBLEM!
```

**Why this is bad:**

- `remotePeers` comes from `useRealtimeKitSelector`
- Selector creates NEW array on EVERY SDK state change
- SDK updates frequently (active speaker, track updates, etc.)
- New array reference → effect runs → `srcObject` reset → flicker

## The Solution

### 1. Track Only Stable IDs

Instead of depending on object references, track only immutable identifiers:

```typescript
// ✅ GOOD - Stable IDs
const firstRemotePeerId = useMemo(() => {
  return firstRemotePeer?.id || null
}, [firstRemotePeer?.id]) // Only changes when ID actually changes

const firstRemoteVideoTrackId = useMemo(() => {
  return (firstRemotePeer as RealtimeKitPeer | null)?.videoTrack?.id || null
}, [(firstRemotePeer as RealtimeKitPeer | null)?.videoTrack?.id])
```

### 2. Look Up Peer from SDK Directly

Instead of depending on `remotePeers` array, look up the peer directly from the meeting SDK:

```typescript
// ✅ GOOD - Look up from SDK
useEffect(() => {
  if (!callState.isMinimized || !firstRemotePeerId || !meeting?.participants?.joined) {
    return
  }

  // Look up peer directly from SDK by ID
  const joined = meeting.participants.joined
  const allParticipants = Array.from(joined.values())
  const rtkPeer = allParticipants.find((p: any) => p.id === firstRemotePeerId)

  // ... rest of logic
}, [callState.isMinimized, firstRemotePeerId, firstRemoteVideoTrackId, buildStreamFromPeer, meeting])
//                                                                                        ^^^^^^^
//                                                                        Stable reference, NOT remotePeers!
```

**Why this works:**

- `meeting` object is stable (same reference throughout call)
- Effect only runs when actual IDs change, not on every SDK update
- No flicker from unnecessary re-renders

### 3. Check Before Setting srcObject

Even when the effect runs, check if we're setting the same stream:

```typescript
// ✅ GOOD - Compare track IDs before updating
const currentStream = videoElement.srcObject as MediaStream | null
const currentVideoTrackId = currentStream?.getVideoTracks()[0]?.id
const newVideoTrackId = stream.getVideoTracks()[0]?.id

if (currentVideoTrackId !== newVideoTrackId) {
  // Only update if track actually changed
  videoElement.srcObject = stream
  videoElement.play()
} else {
  console.log('[Minimized] Video stream already correct, skipping update')
}
```

## Implementation Details

### File Location

`src/business-apps/platform/apps/chat/components/GroupCallModalRtk.tsx`

### Key Code Sections

**Lines ~1378-1390:** Stable ID tracking

```typescript
const firstRemotePeerId = useMemo(...)
const firstRemoteVideoTrackId = useMemo(...)
```

**Lines ~1405-1450:** Minimized video effect with SDK lookup

### Critical Dependencies

The effect should ONLY depend on:

- ✅ `callState.isMinimized` - When minimize state changes
- ✅ `firstRemotePeerId` - When active speaker switches to different person
- ✅ `firstRemoteVideoTrackId` - When video track changes
- ✅ `buildStreamFromPeer` - Stable function (memoized with no deps)
- ✅ `meeting` - Stable object reference

Never depend on:

- ❌ `remotePeers` - New array on every SDK update
- ❌ `firstRemotePeer` - New object reference when speaker changes
- ❌ `debouncedActiveSpeaker` - Changes every 500ms

## Testing

### Manual Test Scenario

1. Start a video call with 2+ participants
2. Minimize the call window
3. Observe the video feed in the minimized window
4. Have participants speak (triggering active speaker changes)

**Expected:** Video should stay smooth, no flickering
**Before Fix:** Video flickered every ~500ms
**After Fix:** Video remains stable

### Debug Logging

Enable debug logs to verify the fix:

```javascript
enableRtkDebug()
```

Look for these console messages:

```
✅ Good (rare):
[Minimized] Updating video stream for peer: John (when peer actually changes)

✅ Good (frequent):
[Minimized] Video stream already correct, skipping update

❌ Bad (indicates problem):
[Minimized] Updating video stream for peer: John (when peer is SAME - means flicker!)
```

## Related Issues

### Similar Problems to Watch For

1. **Audio Element Updates** (lines ~1448-1520)
   - Also uses `remotePeers` but has `remoteAudioTrackIds` check
   - Monitor for similar flicker in audio

2. **Grid Layout Updates** (lines ~940-1000)
   - Uses `remotePeers` for rendering
   - Check if grid re-renders unnecessarily

3. **Active Speaker Visual Indicator**
   - Border highlights might flicker if not memoized properly

### Prevention Checklist

When working with minimized/PiP video:

- [ ] Never depend on `remotePeers` array in effects
- [ ] Always use stable IDs, not object references
- [ ] Compare current stream/track before updating srcObject
- [ ] Test with active speaker changes (multiple people talking)
- [ ] Enable debug logs and watch for frequent "Updating" messages

## Performance Impact

### Before Fix

- Effect runs: Every ~300-500ms (on every SDK update)
- Video resets: Every ~500ms (on active speaker debounce)
- CPU usage: High (constant stream rebuilding)
- User experience: Terrible (constant flicker)

### After Fix

- Effect runs: Only when peer ID or track ID actually changes
- Video resets: Only when switching to different participant
- CPU usage: Normal (minimal processing)
- User experience: Smooth (no flicker)

## Historical Context

This bug was introduced when:

- Active speaker detection was added (needed for highlighting)
- Minimized view needed to show active speaker
- Effect dependencies weren't carefully optimized

It persisted because:

- Testing focused on functionality, not flicker
- Effect ran frequently but "worked" (just with poor UX)
- Root cause was subtle (React re-render optimization)

## Future Improvements

Potential optimizations:

1. **Use requestAnimationFrame** for smoother updates
2. **Implement intersection observer** to pause updates when minimized window is off-screen
3. **Add video quality selector** for minimized view (lower resolution = less bandwidth)
4. **Cache built streams** instead of rebuilding on every effect run

## References

- RealtimeKit SDK Docs: https://developers.cloudflare.com/calls/
- React useEffect optimization: https://react.dev/reference/react/useEffect
- MediaStream API: https://developer.mozilla.org/en-US/docs/Web/API/MediaStream

---

## Implementation Details

### Files Modified

1. **`components/GroupCallModalRtk.tsx`**
   - Lines ~538-620: Local video track management (optimized)
   - Lines ~723-843: Remote participant track management (optimized)

2. **`hooks/useRealtimeKitMedia.ts`**
   - Lines ~361-432: Local stream creation and track updates (reuses MediaStream instance)

### Key Changes

- **Track ID tracking**: Use refs to track current track IDs instead of depending on stream references
- **Dynamic track updates**: Use `MediaStream.addTrack()` and `removeTrack()` instead of replacing `srcObject`
- **Stream reuse**: Return the same MediaStream reference (updated in place) to prevent re-renders
- **Fallback safety**: Try-catch blocks ensure graceful degradation if dynamic updates fail

## Combined Prevention Checklist

When working with video call components:

- [ ] Never reset `srcObject` when only audio tracks change
- [ ] Update individual tracks dynamically instead of replacing entire stream
- [ ] Reuse MediaStream instances instead of creating new ones
- [ ] Track individual track IDs with refs, not object references
- [ ] Never depend on `remotePeers` array in effects (use stable IDs)
- [ ] Always compare current track IDs before updating
- [ ] Test with mute/unmute actions (both audio and video, local and remote)
- [ ] Test with active speaker changes (multiple people talking)
- [ ] Test in both maximized and minimized views
- [ ] Enable debug logs and watch for frequent "Updating" messages

## Performance Impact

### Mute/Unmute Fix

- **Before Fix**: 10-60ms black flash on every mute/unmute action (local and remote)
- **After Fix**: Zero visual interruption, seamless track updates
- **Optimization**: Eliminated unnecessary MediaStream object creation (prevents GC pressure)

### Minimized View Fix

- **Before Fix**: Effect runs every ~300-500ms, video resets every ~500ms
- **After Fix**: Effect runs only when peer ID or track ID actually changes

---

**Last Updated:** January 28, 2026  
**Related Files:**

- `components/GroupCallModalRtk.tsx` - Main implementation
- `hooks/useRealtimeKitActiveSpeaker.ts` - Active speaker detection
- `hooks/useRealtimeKitMedia.ts` - Media track management
- `CROSS-TAB-CALL-PREVENTION.md` - Related localStorage coordination fix
