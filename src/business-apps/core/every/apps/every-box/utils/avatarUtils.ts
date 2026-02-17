/**
 * Avatar utility functions for handling base64 image data
 */

/**
 * Convert base64 image data to a data URL (no memory leak, unlike ObjectURL)
 * @param base64Data - Base64 encoded image data (can include data URL prefix or raw base64)
 * @returns Data URL for the image, or undefined if conversion fails
 */
export const base64ToDataURL = (base64Data: string): string | undefined => {
  try {
    // Skip if data is JSON or invalid
    if (!base64Data || base64Data.startsWith('{')) {
      return undefined
    }

    // Already a data URL? Return as-is
    if (base64Data.startsWith('data:')) {
      return base64Data
    }

    // Strip any existing prefix and return as data URL
    const raw = base64Data.includes('base64,') ? base64Data.split('base64,')[1] : base64Data

    // Detect image format from base64 header bytes
    if (raw.startsWith('/9j/')) return `data:image/jpeg;base64,${raw}`
    if (raw.startsWith('iVBOR')) return `data:image/png;base64,${raw}`
    if (raw.startsWith('R0lGOD')) return `data:image/gif;base64,${raw}`

    // Default to JPEG
    return `data:image/jpeg;base64,${raw}`
  } catch {
    return undefined
  }
}

/**
 * @deprecated Use base64ToDataURL instead - ObjectURLs leak memory if not revoked
 */
export const base64ToObjectURL = base64ToDataURL

/**
 * Get initials from employee name
 * @param firstName - Employee's first name
 * @param lastName - Employee's last name
 * @returns Two-letter initials (e.g., "JD" for John Doe)
 */
export const getInitials = (firstName?: string, lastName?: string): string => {
  const first = firstName?.[0] || ''
  const last = lastName?.[0] || ''
  return `${first}${last}`.toUpperCase() || '?'
}

/**
 * Get display name from employee data
 * @param displayName - Employee's display name
 * @param firstName - Employee's first name
 * @param lastName - Employee's last name
 * @returns Formatted display name
 */
export const getDisplayName = (displayName?: string, firstName?: string, lastName?: string): string => {
  if (displayName) return displayName
  if (firstName || lastName) {
    return `${firstName || ''} ${lastName || ''}`.trim()
  }
  return 'Unknown'
}
