import type { Lead } from '@/common/data/relations/types/leadTypes'

/**
 * Map address from Lead data to flat address fields format
 * Leads store address as flat fields (addressLine, postalCode, locality, etc.), not as arrays
 * Returns an object with addressLines array and other flat fields
 */
// Helper function to parse address line from string
const parseAddressLineFromString = (addressLine: string): string[] => {
  return addressLine
    .split(',')
    .map((line: string) => line.trim())
    .filter(Boolean)
}

// Helper function to parse address line from object
const parseAddressLineFromObject = (addressLine: { lines?: string[] }): string[] => {
  return addressLine?.lines?.filter((line: string) => line && line.trim()) ?? []
}

// Helper function to parse address line from array
const parseAddressLineFromArray = (addressLine: string[]): string[] => {
  return addressLine?.filter((line: string) => line && line.trim()) ?? []
}

// Helper function to map address line to address lines array
const mapAddressLineToArray = (addressLine: any): string[] => {
  if (!addressLine) return []
  if (typeof addressLine === 'string') {
    return parseAddressLineFromString(addressLine)
  }
  if (typeof addressLine === 'object' && addressLine?.lines) {
    return parseAddressLineFromObject(addressLine)
  }
  if (Array.isArray(addressLine)) {
    return parseAddressLineFromArray(addressLine)
  }
  return []
}

export function mapLeadAddresses(
  leadData:
    | Lead
    | {
        addressLine?: string | { lines?: string[] } | string[]
        postalCode?: string
        locality?: string
        region?: { id?: string }
        regionRef?: string
        country?: { id?: string }
        countryRef?: string
      }
): {
  addressLines: string[]
  postalCode?: string
  locality?: string
  regionRef?: string
  countryRef?: string
} {
  // Map addressLine to addressLines array
  const addressLines = mapAddressLineToArray(leadData.addressLine)

  return {
    addressLines: addressLines.length > 0 ? addressLines : [],
    postalCode: leadData.postalCode || undefined,
    locality: leadData.locality || undefined,
    regionRef: (leadData as Lead).region?.id || leadData.regionRef || undefined,
    countryRef: (leadData as Lead).country?.id || leadData.countryRef || undefined
  }
}
