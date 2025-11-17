import type { Lead } from '@/common/data/relations/types/leadTypes'

/**
 * Map address from Lead data to flat address fields format
 * Leads store address as flat fields (addressLine, postalCode, locality, etc.), not as arrays
 * Returns an object with addressLines array and other flat fields
 */
export function mapLeadAddresses(leadData: Lead | any): {
  addressLines: string[]
  postalCode?: string
  locality?: string
  regionRef?: string
  countryRef?: string
} {
  // Map addressLine to addressLines array
  const addressLines: string[] = leadData.addressLine
    ? typeof leadData.addressLine === 'string'
      ? leadData.addressLine
          .split(',')
          .map((line: string) => line.trim())
          .filter(Boolean)
      : typeof leadData.addressLine === 'object' && leadData.addressLine?.lines
        ? leadData.addressLine.lines.filter((line: string) => line && line.trim())
        : Array.isArray(leadData.addressLine)
          ? leadData.addressLine.filter((line: string) => line && line.trim())
          : []
    : []

  return {
    addressLines: addressLines.length > 0 ? addressLines : [],
    postalCode: leadData.postalCode || undefined,
    locality: leadData.locality || undefined,
    regionRef: leadData.region?.id || leadData.regionRef || undefined,
    countryRef: leadData.country?.id || leadData.countryRef || undefined
  }
}
