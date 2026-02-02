/**
 * Test Participant Seeding Utility
 *
 * Helper to generate mock participants for testing group call grid layouts.
 * Useful for testing different participant counts and configurations.
 */

import type { GroupCallParticipant } from '../services/groupWebrtcClient'

// Common test names for generating participants
const TEST_NAMES = [
  'Alice Johnson',
  'Bob Smith',
  'Charlie Brown',
  'Diana Prince',
  'Eve Wilson',
  'Frank Miller',
  'Grace Lee',
  'Henry Davis',
  'Ivy Chen',
  'Jack Taylor',
  'Kate Martinez',
  'Liam Anderson',
  'Mia Thompson',
  'Noah Garcia',
  'Olivia White',
  'Paul Rodriguez',
  'Quinn Jackson',
  'Rachel Kim',
  'Sam Wilson',
  'Tina Moore'
]

/**
 * Creates a mock MediaStreamTrack for testing
 * Returns a minimal mock object that satisfies the MediaStreamTrack interface
 */
function createMockTrack(kind: 'video' | 'audio'): MediaStreamTrack {
  // Create a minimal mock track object that satisfies the interface
  // This is sufficient for testing grid layout without requiring actual media streams
  return {
    id: `mock-${kind}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    kind,
    label: `Mock ${kind} Track`,
    enabled: true,
    muted: false,
    readyState: 'live' as MediaStreamTrackState,
    onended: null,
    onmute: null,
    onunmute: null,
    getSettings: () => ({}),
    getConstraints: () => ({}),
    getCapabilities: () => ({}),
    applyConstraints: () => Promise.resolve(),
    clone: function () {
      return this
    },
    stop: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => true
  } as MediaStreamTrack
}

/**
 * Generates a single mock participant
 */
function createMockParticipant(
  index: number,
  options?: {
    hasVideo?: boolean
    hasAudio?: boolean
    isMuted?: boolean
    name?: string
  }
): GroupCallParticipant {
  const { hasVideo = true, hasAudio = true, isMuted = false, name } = options || {}

  const participantName = name || TEST_NAMES[index % TEST_NAMES.length]
  const baseId = `test-participant-${index}`

  return {
    id: baseId,
    odId: `od-${baseId}`,
    odName: participantName,
    name: participantName, // Also set 'name' for SDK compatibility
    displayName: participantName, // Fallback for display
    userId: baseId, // Use same as id for test participants
    customParticipantId: baseId, // Use same as id for test participants
    avatarUrl: `https://api.dicebear.com/7.x/avataaars/svg?seed=${participantName}`,
    picture: `https://api.dicebear.com/7.x/avataaars/svg?seed=${participantName}`, // SDK uses 'picture'
    stream: undefined, // Will be created if needed
    isMuted: isMuted || !hasAudio,
    isVideoOff: !hasVideo,
    // GroupCallParticipant extensions
    peerConnection: undefined,
    connectionState: 'connected' as RTCPeerConnectionState,
    // Mock tracks (only create if needed for testing)
    videoTrack: hasVideo ? createMockTrack('video') : undefined,
    audioTrack: hasAudio ? createMockTrack('audio') : undefined,
    videoEnabled: hasVideo,
    audioEnabled: hasAudio && !isMuted
  }
}

/**
 * Seeds test participants for group call grid testing
 *
 * @param count - Number of participants to generate (default: 2)
 * @param options - Configuration options
 * @returns Array of mock GroupCallParticipant objects
 *
 * @example
 * ```tsx
 * // Generate 5 participants for testing
 * const testParticipants = seedTestParticipants(5)
 *
 * // Generate participants with specific configuration
 * const testParticipants = seedTestParticipants(3, {
 *   allHaveVideo: true,
 *   someMuted: true
 * })
 * ```
 */
export function seedTestParticipants(
  count: number = 2,
  options?: {
    /** Whether all participants should have video enabled */
    allHaveVideo?: boolean
    /** Whether some participants should be muted */
    someMuted?: boolean
    /** Whether some participants should have video disabled */
    someNoVideo?: boolean
    /** Custom names for participants (will cycle if count > names.length) */
    customNames?: string[]
  }
): GroupCallParticipant[] {
  const { allHaveVideo = true, someMuted = false, someNoVideo = false, customNames } = options || {}

  const names = customNames || TEST_NAMES
  const participants: GroupCallParticipant[] = []

  for (let i = 0; i < count; i++) {
    const nameIndex = i % names.length
    const shouldHaveVideo = allHaveVideo && (!someNoVideo || i % 3 !== 0)
    const shouldBeMuted = someMuted && i % 2 === 1

    participants.push(
      createMockParticipant(i, {
        hasVideo: shouldHaveVideo,
        hasAudio: true,
        isMuted: shouldBeMuted,
        name: names[nameIndex]
      })
    )
  }

  return participants
}

/**
 * Quick presets for common testing scenarios
 */
export const TestParticipantPresets = {
  /** 2 participants - minimal test */
  two: () => seedTestParticipants(2),

  /** 4 participants - small group */
  four: () => seedTestParticipants(4),

  /** 6 participants - medium group */
  six: () => seedTestParticipants(6),

  /** 9 participants - one page in grid */
  nine: () => seedTestParticipants(9),

  /** 12 participants - multiple pages */
  twelve: () => seedTestParticipants(12),

  /** Mixed states - some muted, some no video */
  mixed: () =>
    seedTestParticipants(6, {
      allHaveVideo: false,
      someMuted: true,
      someNoVideo: true
    }),

  /** All muted - audio-only call */
  allMuted: () =>
    seedTestParticipants(4, {
      allHaveVideo: true,
      someMuted: true
    }),

  /** All video off - avatar-only call */
  allVideoOff: () =>
    seedTestParticipants(4, {
      allHaveVideo: false,
      someMuted: false
    })
}
