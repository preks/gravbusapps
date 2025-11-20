/**
 * Avatar utility functions
 * Copied from EveryBox utils
 */

/**
 * Get initials from a full name or first/last name
 * @param nameOrFirstName - Full name or first name
 * @param lastName - Last name (optional)
 * @returns Two-letter initials (e.g., "JD" for John Doe)
 */
export const getInitials = (nameOrFirstName?: string, lastName?: string): string => {
  if (!nameOrFirstName) return '?'

  // If lastName is provided, use first letter of each
  if (lastName) {
    const first = nameOrFirstName[0] || ''
    const last = lastName[0] || ''
    return `${first}${last}`.toUpperCase()
  }

  // If it's a full name, split and get first letter of first two words
  const nameParts = nameOrFirstName.trim().split(/\s+/)
  if (nameParts.length >= 2) {
    return `${nameParts[0][0]}${nameParts[1][0]}`.toUpperCase()
  }

  // If it's a single name, use first two letters
  return nameOrFirstName.substring(0, 2).toUpperCase()
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
