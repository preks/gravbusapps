/**
 * Call Utility Functions
 *
 * Shared utility functions for call components
 */

/**
 * Format call duration in HH:MM:SS or MM:SS format
 * @param seconds - Duration in seconds
 * @returns Formatted duration string
 */
export const formatDuration = (seconds: number): string => {
  const hrs = Math.floor(seconds / 3600)
  const mins = Math.floor((seconds % 3600) / 60)
  const secs = seconds % 60

  if (hrs > 0) {
    return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

/**
 * Get initials from a full name
 * @param name - Full name
 * @returns Initials (1-2 characters)
 */
export const getInitials = (name: string): string => {
  if (!name) return '?'
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) {
    return parts[0].charAt(0).toUpperCase()
  }
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase()
}

/**
 * Check if a video track is a screen share based on its label
 * @param track - MediaStreamTrack to check
 * @returns True if track appears to be a screen share
 */
export const isVideoTrackScreenShare = (track: MediaStreamTrack): boolean => {
  if (!track || track?.kind !== 'video') return false
  const label = track.label.toLowerCase()
  return label.includes('screen') || label.includes('window') || label.includes('tab') || label.includes('display')
}

/**
 * Extract MediaStreamTracks from various collection types
 * (Array, Map, Set, or iterable object)
 * @param collection - Collection that may contain tracks
 * @returns Array of MediaStreamTracks
 */
export const extractTracksFromCollection = (collection: any): MediaStreamTrack[] => {
  const tracks: MediaStreamTrack[] = []

  if (!collection) return tracks

  // Handle Array
  if (Array.isArray(collection)) {
    return collection.filter((t: any): t is MediaStreamTrack => t instanceof MediaStreamTrack)
  }

  // Handle Map
  if (collection instanceof Map) {
    return Array.from(collection.values()).filter((t: any): t is MediaStreamTrack => t instanceof MediaStreamTrack)
  }

  // Handle Set
  if (collection instanceof Set) {
    return Array.from(collection).filter((t: any): t is MediaStreamTrack => t instanceof MediaStreamTrack)
  }

  // Handle plain object
  if (typeof collection === 'object') {
    const values = Object.values(collection)
    return values.filter((t: any): t is MediaStreamTrack => t instanceof MediaStreamTrack)
  }

  return tracks
}
