/**
 * Utility functions for handling address data in CRM entities
 */

/**
 * Helper function to extract address string from various JSON formats
 *
 * @param addressLine - Can be:
 *   - string: return as-is
 *   - { lines: ["line1", "line2"] }: join with ", "
 *   - { address: "value" }: return address value
 *   - { address: '{"lines": ["value"]}' }: parse nested JSON
 *
 * @returns Clean address string or empty string if invalid
 */
export const extractAddressFromObject = (addressLine: any): string => {
  // Handle null/undefined or non-object types
  if (!addressLine || typeof addressLine !== 'object') {
    return typeof addressLine === 'string' ? addressLine : ''
  }

  // Standard format: { "lines": ["value"] } - PRIORITIZE THIS
  if (addressLine.lines && Array.isArray(addressLine.lines)) {
    return addressLine.lines.join(', ')
  }

  // Alternative format: { "address": "value" }
  if (addressLine.address) {
    // Handle corrupted double-encoded JSON
    if (typeof addressLine.address === 'string' && addressLine.address.startsWith('{')) {
      try {
        const parsed = JSON.parse(addressLine.address)
        if (parsed.lines && Array.isArray(parsed.lines)) {
          return parsed.lines.join(', ')
        }
      } catch (e) {
        // If parsing fails, return the raw string
        console.warn('Failed to parse nested JSON in addressLine.address:', e)
        return addressLine.address
      }
    }
    return addressLine.address
  }

  // If no known format, return empty string
  console.warn('Unknown addressLine format:', addressLine)
  return ''
}

/**
 * Extract the first address line from an addresses array
 *
 * @param addresses - Array of address objects
 * @returns First address line as string or empty string
 */
export const getFirstAddressLine = (addresses?: Array<{ addressLine?: any }>): string => {
  if (!addresses || addresses.length === 0) {
    return ''
  }

  return extractAddressFromObject(addresses[0].addressLine)
}
