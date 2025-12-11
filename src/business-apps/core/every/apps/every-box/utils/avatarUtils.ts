/**
 * Avatar utility functions for handling base64 image data
 */

/**
 * Convert base64 image data to Object URL for browser caching
 * @param base64Data - Base64 encoded image data (can include data URL prefix or raw base64)
 * @returns Object URL for the image, or undefined if conversion fails
 */
export const base64ToObjectURL = (base64Data: string): string | undefined => {
  try {
    // Skip if data is JSON or invalid
    if (!base64Data || base64Data.startsWith('{')) {
      return undefined
    }

    // Extract base64 data if it includes data URL prefix
    let base64 = base64Data
    if (base64Data.includes('base64,')) {
      base64 = base64Data.split('base64,')[1]
    }

    // Decode base64 to binary
    const binaryString = atob(base64)
    const bytes = new Uint8Array(binaryString.length)
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.codePointAt(i) ?? 0
    }

    // Create blob and generate Object URL
    const blob = new Blob([bytes], { type: 'image/jpeg' })
    return URL.createObjectURL(blob)
  } catch {
    return undefined
  }
}

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
