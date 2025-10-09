// General address formatting utilities
// Supports { lines: [] } JSON (Investments) and simple formatting needs

export interface AddressLine {
  lines: string[]
}

// Build { lines: [...] } from free-form strings
export const buildAddressLine = (lines: string[]): AddressLine | null => {
  const cleaned = (lines || []).map(s => (s == null ? '' : String(s)).trim()).filter(s => s.length > 0)
  return cleaned.length ? { lines: cleaned } : null
}

// Compose a single formatted address string
export const formatAddress = (params: {
  addressLine?: AddressLine | null
  locality?: string
  postalCode?: string
  region?: string
  country?: string
}): string => {
  const address: string[] = []

  // address lines first
  ;(params.addressLine?.lines || [])
    .map(s => (s == null ? '' : String(s).trim()))
    .filter(s => s.length > 0)
    .forEach(s => address.push(s))

  // postalCode, locality
  const localityLine = [params.postalCode, params.locality]
    .map(s => (s || '').trim())
    .filter(s => s.length > 0)
    .join(', ')
  if (localityLine) address.push(localityLine)

  // region, country
  const regionCountryLine = [params.region, params.country]
    .map(s => (s || '').trim())
    .filter(s => s.length > 0)
    .join(', ')
  if (regionCountryLine) address.push(regionCountryLine)

  return address.join('\n')
}
