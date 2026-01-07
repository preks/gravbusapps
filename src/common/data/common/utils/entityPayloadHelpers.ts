/**
 * Entity Payload Helpers
 * Shared utilities for filtering and transforming entity payloads (accounts, contacts, etc.)
 */

/**
 * Filter out communication channels with empty values
 * @param channels - Array of communication channels
 * @returns Filtered array or undefined if empty
 */
export function filterCommunicationChannels(channels: any[]): any[] | undefined {
  if (!channels || !Array.isArray(channels)) {
    return undefined
  }

  const filtered = channels.filter((channel: any) => channel.value && channel.value.trim() !== '')

  return filtered.length > 0 ? filtered : undefined
}

/**
 * Filter out empty address lines from addressLine object
 * @param addressLine - Address line object with lines array
 * @returns Filtered addressLine or undefined
 */
export function filterAddressLines(addressLine: any): any {
  if (!addressLine) {
    return undefined
  }

  if (typeof addressLine === 'object' && addressLine.lines) {
    const filledLines = addressLine.lines.filter(
      (line: string | null | undefined) => line !== null && line !== undefined && line.trim() !== ''
    )

    if (filledLines.length > 0) {
      return { lines: filledLines }
    }
  }

  return undefined
}

/**
 * Convert addressLine object to JSON string (for CRM)
 * @param addressLine - Address line object with lines array
 * @returns JSON string or undefined
 */
export function addressLineToString(addressLine: any): string | undefined {
  if (!addressLine) {
    return undefined
  }

  if (typeof addressLine === 'object' && addressLine.lines) {
    const filledLines = addressLine.lines.filter(
      (line: string | null | undefined) => line !== null && line !== undefined && line.trim() !== ''
    )

    if (filledLines.length > 0) {
      return JSON.stringify({ lines: filledLines })
    }
  }

  return undefined
}

/**
 * Check if address has any content
 * @param addr - Address object
 * @returns true if address has content
 */
export function hasAddressContent(addr: any): boolean {
  return !!(
    addr.addressLine ||
    (addr.postalCode && addr.postalCode.trim() !== '') ||
    (addr.locality && addr.locality.trim() !== '') ||
    addr.regionRef ||
    addr.countryRef
  )
}

/**
 * Filter and transform addresses array (generic version)
 * @param addresses - Array of addresses
 * @param transformAddressLine - Optional transformer for addressLine field
 * @returns Filtered addresses array or undefined
 */
export function filterAddresses(addresses: any[], transformAddressLine?: (addressLine: any) => any): any[] | undefined {
  if (!addresses || !Array.isArray(addresses)) {
    return undefined
  }

  const filtered = addresses
    .map((addr: any) => {
      const transformed = { ...addr }

      // Apply addressLine transformation if provided
      if (addr.addressLine !== undefined && addr.addressLine !== null) {
        if (transformAddressLine) {
          const transformedLine = transformAddressLine(addr.addressLine)
          if (transformedLine !== undefined) {
            transformed.addressLine = transformedLine
          } else {
            delete transformed.addressLine
          }
        }
      }

      return transformed
    })
    .filter(hasAddressContent)

  return filtered.length > 0 ? filtered : undefined
}
