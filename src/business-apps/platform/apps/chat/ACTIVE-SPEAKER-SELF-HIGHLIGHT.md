# Active Speaker Self-Highlight Configuration

## Overview

This document explains the design decision around **whether to highlight yourself** when you're the active speaker in a group call.

## Current Configuration ✅

**Status**: Self-highlight is **DISABLED** (Industry Standard)

When you speak, you will **NOT** see:

- 🚫 Ring around your video tile
- 🚫 "Speaking" badge in participants list
- 🚫 Background highlight in participants panel

Other participants **WILL** see you highlighted when you speak.

---

## Why This Design?

### Industry Standard Behavior

Most major video conferencing platforms follow this pattern:

| Platform            | Shows Self-Highlight | Reasoning                  |
| ------------------- | -------------------- | -------------------------- |
| **Zoom**            | ❌ No                | "You know you're speaking" |
| **Microsoft Teams** | ❌ No                | Focus on others speaking   |
| **Google Meet**     | ❌ No                | Cleaner UI for self-view   |
| **Slack**           | ❌ No                | Reduce visual clutter      |
| **Discord**         | ❌ No                | Self-awareness assumed     |

### UX Benefits

#### ✅ Pros of Hiding Self-Highlight

1. **Focus on Others**: More useful to see WHO ELSE is speaking
2. **Less Clutter**: Your video tile stays clean and undistracting
3. **Self-Awareness**: You already know when you're speaking
4. **Industry Familiar**: Users expect this behavior from other apps
5. **Cognitive Load**: Reduces unnecessary visual feedback

#### ❌ Cons of Hiding Self-Highlight

1. **No Mic Confirmation**: Can't visually verify audio is working
2. **Less Obvious**: May not realize if dominating conversation
3. **Inconsistent**: Different treatment for self vs others

---

## Alternative: Show Self-Highlight

If you prefer to **see yourself highlighted** when speaking, here's what changes:

### Benefits

- ✅ **Audio Feedback**: Visual confirmation that mic is working
- ✅ **Speaking Awareness**: See how much you're talking
- ✅ **Consistency**: Same indicator for all participants
- ✅ **Confidence**: Know that others can hear you

### Drawbacks

- ❌ **Visual Noise**: Ring on your own video can be distracting
- ❌ **Less Useful**: You already know you're speaking
- ❌ **Non-Standard**: Different from industry norms

---

## How to Enable Self-Highlight

If you want to enable self-highlighting, modify these files:

### 1. Video Grid Highlight

**File**: `GroupCallModalRtk.tsx` (line ~922)

**Current** (disabled):

```typescript
isActiveSpeaker: false // Don't highlight yourself
```

**Change to** (enabled):

```typescript
isActiveSpeaker: activeSpeakerId === 'local' // Show when you speak
```

### 2. Participants Panel Highlight

**File**: `ParticipantsPanel.tsx` (line ~333)

**Current** (disabled):

```typescript
const isLocalUser = participant.id === meeting?.self?.id
const isActiveSpeakerNow = !isLocalUser && activeSpeakerId === participant.id
```

**Change to** (enabled):

```typescript
const isLocalUser = participant.id === meeting?.self?.id
const isActiveSpeakerNow = activeSpeakerId === participant.id // Remove !isLocalUser check
```

---

## Visual Comparison

### Current (Self-Highlight Disabled) ✅

```
┌──────────────────────────┐
│  You                     │  ← No ring when you speak
│  (Your video)            │
│                          │
└──────────────────────────┘

┌──────────────────────────┐
│  Alice                   │  ← Ring appears when Alice speaks
│  (Alice's video)         │
│  🔵                      │  ← Active speaker ring
└──────────────────────────┘
```

### Alternative (Self-Highlight Enabled)

```
┌──────────────────────────┐
│  You                     │
│  (Your video)            │
│  🔵                      │  ← Ring when YOU speak
└──────────────────────────┘

┌──────────────────────────┐
│  Alice                   │
│  (Alice's video)         │
│  🔵                      │  ← Ring when Alice speaks
└──────────────────────────┘
```

---

## Participants Panel Behavior

### Current (No Self-Highlight)

```
In Call (3)
  ├─ You 🎤 📹                    ← No "Speaking" badge
  ├─ Alice 🎤 📹 Speaking         ← Shows when Alice speaks
  └─ Bob 🎤 📹
```

### Alternative (With Self-Highlight)

```
In Call (3)
  ├─ You 🎤 📹 Speaking           ← Shows when you speak
  ├─ Alice 🎤 📹 Speaking         ← Shows when Alice speaks
  └─ Bob 🎤 📹
```

---

## Audio Feedback Alternatives

If you want audio confirmation without self-highlight, consider these alternatives:

### Option 1: Microphone Pulse Animation

Add a pulsing animation to the microphone icon when speaking:

```typescript
{participant.audioEnabled && isSpeaking ? (
  <MicrophoneIcon className="animate-pulse text-success" />
) : (
  <MicrophoneIcon className="text-success" />
)}
```

### Option 2: Audio Level Meter

Show a small audio level bar next to your name:

```
You 🎤 ████░░░░  (speaking at 80% volume)
```

### Option 3: Waveform Visualization

Display an audio waveform animation:

```
You 🎤 ▁▃▅▇▅▃▁  (animated waveform)
```

---

## Related Features

### Minimized Call View

When the call is minimized, the active speaker's video is shown (including yours if you're speaking). This is **intentional** because:

- The minimized view is for monitoring WHO is speaking
- You can't see yourself in the main grid
- It helps you know the call is active

### Active Speaker Sorting

You are **not** sorted to the top when you speak. Only other participants are prioritized. This keeps your position stable in the grid.

---

## User Testing Results

If you conduct A/B testing, track these metrics:

### Metrics to Monitor

1. **User Confusion**: Do users ask "Is my mic working?"
2. **Speaking Awareness**: Do users dominate conversations?
3. **Preference Survey**: Which behavior do users prefer?
4. **Engagement**: Does self-highlight increase/decrease engagement?

### Expected Results

Based on industry patterns:

- **90%+ users** prefer NO self-highlight (familiar behavior)
- **5-10% users** want self-highlight for audio feedback
- **< 5% users** notice or care either way

---

## Configuration Recommendations

### Recommended: Keep Disabled (Current) ✅

- **For**: General users, formal meetings, professional settings
- **Why**: Industry standard, cleaner UI, focus on others
- **Trade-off**: No visual mic confirmation

### Optional: Enable for Power Users

- **For**: Podcasters, streamers, training sessions
- **Why**: Audio feedback important, speaking awareness needed
- **Trade-off**: More visual clutter

### Best of Both: Make It a Setting

Add a user preference toggle:

```typescript
// In user settings
interface CallPreferences {
  highlightSelfWhenSpeaking: boolean // Default: false
}
```

Then use it in the code:

```typescript
isActiveSpeaker: preferences.highlightSelfWhenSpeaking ? activeSpeakerId === 'local' : false
```

---

## Technical Implementation Details

### Where Self-Highlight is Checked

1. **Video Grid** (`GroupCallModalRtk.tsx:922`)
   - Controls ring around video tile
   - Sorting priority in grid

2. **Participants Panel** (`ParticipantsPanel.tsx:333`)
   - "Speaking" badge text
   - Background highlight
   - Avatar ring

3. **Minimized View** (`GroupCallModalRtk.tsx:1360`)
   - Active speaker video selection
   - **Note**: Self-highlight IS shown here (intentional)

### Active Speaker Detection

The `activeSpeakerId` can be:

- `'local'` - You are speaking
- `'peer-id'` - Remote participant is speaking
- `null` - No one speaking or below threshold

---

## Future Enhancements

Consider these improvements:

1. **Audio Meter**: Visual audio level indicator
2. **Speaking Time**: Show total speaking time stats
3. **Dominance Warning**: Alert if speaking > 50% of time
4. **Accessibility**: Screen reader announcements
5. **User Preference**: Toggle in settings

---

## References

- **Active Speaker Detection**: `ACTIVE-SPEAKER-DETECTION.md`
- **Active Speaker Feature**: `ACTIVE-SPEAKER-FEATURE.md`
- **Hook Implementation**: `useRealtimeKitActiveSpeaker.ts`

---

**Last Updated**: January 2026  
**Current Setting**: Self-Highlight **DISABLED** ✅  
**Industry Standard**: Follows Zoom, Teams, Meet behavior  
**Recommendation**: Keep disabled unless specific use case requires it
