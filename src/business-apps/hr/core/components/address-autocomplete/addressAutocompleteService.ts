import { env } from '@/common/env/EnvUtils'

/**
 * Provider-agnostic shape returned to the UI layer.
 * Keeping this stable lets us swap Geoapify for LocationIQ / self-hosted later by editing only this file.
 */
export interface AddressComponents {
  houseNumber?: string
  street?: string
  line1?: string
  line2?: string
  postalCode?: string
  city?: string
  region?: string
  regionCode?: string
  /** Some providers return the administrative unit we care about (e.g. Romanian județe)
   * in a separate `county` field. Kept as a fallback to try when state/region doesn't match. */
  county?: string
  countyCode?: string
  countryCode?: string
  countryName?: string
}

export interface AddressSuggestion {
  id: string
  label: string
  lat: number
  lng: number
  components: AddressComponents
}

export interface ReverseGeocodeResult {
  formattedAddress: string
  lat: number
  lng: number
  components: AddressComponents
}

const GEOAPIFY_BASE = 'https://api.geoapify.com/v1/geocode'
const GEOAPIFY_TILE_URL = 'https://maps.geoapify.com/v1/tile/osm-bright/{z}/{x}/{y}.png?apiKey={apiKey}'
const OSM_TILE_URL = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png'

/**
 * Resolves the Geoapify API key from `NEXT_PUBLIC_GEOAPIFY_API_KEY`. Returns undefined
 * when the key is missing or still set to a placeholder template, so callers can fall
 * back gracefully (e.g. tile renderer drops to OpenStreetMap; autocomplete returns no
 * suggestions). Restrict the key to allowed hostnames in the Geoapify dashboard so it
 * remains low-impact if leaked from a public bundle.
 */
const getApiKey = (): string | undefined => {
  const key = env('NEXT_PUBLIC_GEOAPIFY_API_KEY')
  if (!key || key.startsWith('PASTE_')) return undefined
  return key
}

/**
 * Returns the map tile URL template for Leaflet. Falls back to OpenStreetMap's
 * public tile server if no Geoapify key is configured (attribution required).
 */
export const getMapTileUrl = (): { url: string; attribution: string } => {
  const apiKey = getApiKey()
  if (apiKey) {
    return {
      url: GEOAPIFY_TILE_URL.replace('{apiKey}', apiKey),
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://www.geoapify.com/">Geoapify</a>'
    }
  }
  return {
    url: OSM_TILE_URL,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
  }
}

interface GeoapifyProperties {
  formatted?: string
  housenumber?: string
  street?: string
  address_line1?: string
  postcode?: string
  city?: string
  state?: string
  state_code?: string
  county?: string
  county_code?: string
  country_code?: string
  country?: string
  lat?: number
  lon?: number
  place_id?: string
}

interface GeoapifyFeature {
  properties?: GeoapifyProperties
  geometry?: { coordinates?: [number, number] }
}

/**
 * Geoapify returns either `results` (flat properties) or `features` (GeoJSON-style wrappers)
 * depending on endpoint/format. Normalize both shapes into a unified `GeoapifyFeature[]`.
 */
const extractFeatures = (data: { results?: GeoapifyProperties[]; features?: GeoapifyFeature[] }): GeoapifyFeature[] => {
  if (Array.isArray(data.results)) {
    return data.results.map(props => ({ properties: props }))
  }
  if (Array.isArray(data.features)) {
    return data.features
  }
  return []
}

/**
 * Build the structured street address lines from Geoapify properties.
 *
 * Geoapify's `address_line1` is the provider's preferred display first line. For
 * named buildings/POIs (e.g. "Bloc C7") it may contain only the building name,
 * while the actual street and house number are exposed separately. Keep the first
 * form line as the canonical street+number, and move provider extra text to line 2.
 */
const buildAddressLines = (props: GeoapifyProperties): { line1?: string; line2?: string } => {
  const street = props.street?.trim()
  const houseNumber = props.housenumber?.trim()
  const addressLine1 = props.address_line1?.trim()
  const streetWithNumber = [street, houseNumber].filter(Boolean).join(' ')

  if (streetWithNumber) {
    if (addressLine1 && street) {
      const alreadyHasStreet = addressLine1.toLowerCase().includes(street.toLowerCase())
      return {
        line1: streetWithNumber,
        line2: alreadyHasStreet ? undefined : addressLine1
      }
    }

    return { line1: streetWithNumber }
  }

  return { line1: addressLine1 }
}

const featureToComponents = (props: GeoapifyProperties): AddressComponents => {
  const { line1, line2 } = buildAddressLines(props)

  return {
    houseNumber: props.housenumber,
    street: props.street,
    line1,
    line2,
    postalCode: props.postcode,
    city: props.city,
    region: props.state,
    regionCode: props.state_code ? props.state_code.toUpperCase() : undefined,
    county: props.county,
    countyCode: props.county_code ? props.county_code.toUpperCase() : undefined,
    countryCode: props.country_code ? props.country_code.toUpperCase() : undefined,
    countryName: props.country
  }
}

const featureToSuggestion = (feature: GeoapifyFeature, index: number): AddressSuggestion | null => {
  const props = feature.properties || {}
  const lat = typeof props.lat === 'number' ? props.lat : feature.geometry?.coordinates?.[1]
  const lng = typeof props.lon === 'number' ? props.lon : feature.geometry?.coordinates?.[0]
  if (typeof lat !== 'number' || typeof lng !== 'number') return null
  return {
    id: props.place_id || `${lat},${lng}:${index}`,
    label:
      props.formatted || [props.address_line1, props.postcode, props.city, props.country].filter(Boolean).join(', '),
    lat,
    lng,
    components: featureToComponents(props)
  }
}

/**
 * Fetch autocomplete suggestions from Geoapify.
 * Callers should debounce input and pass an AbortSignal to cancel stale requests.
 */
export const getAutocompleteSuggestions = async (
  text: string,
  options?: {
    limit?: number
    countryBias?: string // ISO-3166-1 alpha-2, e.g. 'de'
    lang?: string // e.g. 'en'
    signal?: AbortSignal
  }
): Promise<AddressSuggestion[]> => {
  const apiKey = getApiKey()
  if (!apiKey) return []
  const trimmed = (text || '').trim()
  if (trimmed.length < 3) return []

  const params = new URLSearchParams({
    text: trimmed,
    format: 'json',
    limit: String(options?.limit ?? 5),
    apiKey
  })
  if (options?.countryBias) params.set('filter', `countrycode:${options.countryBias.toLowerCase()}`)
  if (options?.lang) params.set('lang', options.lang)

  const response = await fetch(`${GEOAPIFY_BASE}/autocomplete?${params.toString()}`, { signal: options?.signal })
  if (!response.ok) return []
  const data = (await response.json()) as { results?: GeoapifyProperties[]; features?: GeoapifyFeature[] }

  const rawResults = extractFeatures(data)

  return rawResults
    .map((feature, idx) => featureToSuggestion(feature, idx))
    .filter((s): s is AddressSuggestion => s !== null)
}

/**
 * Forward-geocode a free-form address string to coordinates using Geoapify's
 * /search endpoint. Used as a visual fallback for the change-address map: when
 * an existing address record has no stored latitude/longitude (legacy data
 * pre-dating the structured Geoapify pick), we approximate its location from
 * the textual fields so the marker doesn't open at the default Frankfurt
 * center. The result is intentionally NOT written back to the form — it's a
 * display-only approximation; the user can confirm by dragging the pin or
 * picking a suggestion, both of which already write into the form.
 *
 * Returns null when geocoding fails, the API key is missing, or the input is
 * shorter than 3 characters.
 */
export const forwardGeocode = async (
  query: string,
  options?: { countryBias?: string; lang?: string; signal?: AbortSignal }
): Promise<{ lat: number; lng: number } | null> => {
  const apiKey = getApiKey()
  if (!apiKey) return null
  const trimmed = (query || '').trim()
  if (trimmed.length < 3) return null

  const params = new URLSearchParams({
    text: trimmed,
    format: 'json',
    limit: '1',
    apiKey
  })
  if (options?.countryBias) params.set('filter', `countrycode:${options.countryBias.toLowerCase()}`)
  if (options?.lang) params.set('lang', options.lang)

  try {
    const response = await fetch(`${GEOAPIFY_BASE}/search?${params.toString()}`, { signal: options?.signal })
    if (!response.ok) return null
    const data = (await response.json()) as { results?: GeoapifyProperties[]; features?: GeoapifyFeature[] }
    const first = extractFeatures(data)[0]
    if (!first) return null
    const props = first.properties || {}
    const lat = typeof props.lat === 'number' ? props.lat : first.geometry?.coordinates?.[1]
    const lng = typeof props.lon === 'number' ? props.lon : first.geometry?.coordinates?.[0]
    if (typeof lat !== 'number' || typeof lng !== 'number') return null
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null
    return { lat, lng }
  } catch (err) {
    if ((err as any)?.name === 'AbortError') return null
    return null
  }
}

/**
 * Reverse-geocode coordinates to an address using Geoapify.
 * Used when the user drags the map pin or clicks "Use my location".
 */
export const reverseGeocode = async (
  lat: number,
  lng: number,
  options?: { lang?: string; signal?: AbortSignal }
): Promise<ReverseGeocodeResult | null> => {
  const apiKey = getApiKey()
  if (!apiKey) return null
  const params = new URLSearchParams({
    lat: String(lat),
    lon: String(lng),
    format: 'json',
    apiKey
  })
  if (options?.lang) params.set('lang', options.lang)

  const response = await fetch(`${GEOAPIFY_BASE}/reverse?${params.toString()}`, { signal: options?.signal })
  if (!response.ok) return null
  const data = (await response.json()) as { results?: GeoapifyProperties[]; features?: GeoapifyFeature[] }

  const first: GeoapifyFeature | null = extractFeatures(data)[0] ?? null
  if (!first) return null

  const props = first.properties || {}
  const resolvedLat = typeof props.lat === 'number' ? props.lat : lat
  const resolvedLng = typeof props.lon === 'number' ? props.lon : lng

  return {
    formattedAddress: props.formatted || '',
    lat: resolvedLat,
    lng: resolvedLng,
    components: featureToComponents(props)
  }
}

/**
 * Lowercase + strip diacritics + trim. Makes "Brașov" and "Brasov" compare equal.
 */
const normalizeText = (value: string | undefined | null): string =>
  (value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()

/**
 * Try to find a catalog region entry given a provider-supplied code and/or name.
 *
 * Match order (first hit wins):
 * 1. Exact (case-insensitive) match on `alternativeCode` or `code`.
 * 2. Suffix match on `code` (handles `RO-BV` in catalog vs `BV` from Geoapify and vice versa).
 * 3. Normalized (diacritic-insensitive) match on `value` or `additionalValue1` (RO uses the latter).
 * 4. Normalized substring match — catches "Brasov" against "județul Brașov" style catalog entries.
 */
const findMatchingRegion = (
  regions: any[],
  regionCode: string | undefined,
  regionName: string | undefined
): string | null => {
  const codeUpper = regionCode?.toUpperCase()
  if (codeUpper) {
    const byExactCode = regions.find(
      r =>
        String(r?.alternativeCode || '').toUpperCase() === codeUpper ||
        String(r?.code || '').toUpperCase() === codeUpper
    )
    if (byExactCode) return byExactCode.id
    const bySuffixCode = regions.find(r => {
      const catalogCode = String(r?.code || '').toUpperCase()
      return catalogCode.endsWith(`-${codeUpper}`) || codeUpper.endsWith(`-${catalogCode}`)
    })
    if (bySuffixCode) return bySuffixCode.id
  }

  const nameNorm = normalizeText(regionName)
  if (nameNorm) {
    const byExactName = regions.find(
      r => normalizeText(r?.value) === nameNorm || normalizeText(r?.additionalValue1) === nameNorm
    )
    if (byExactName) return byExactName.id
    const bySubstring = regions.find(r => {
      const catalogValue = normalizeText(r?.value)
      const catalogAlt = normalizeText(r?.additionalValue1)
      return (
        (catalogValue && (catalogValue.includes(nameNorm) || nameNorm.includes(catalogValue))) ||
        (catalogAlt && (catalogAlt.includes(nameNorm) || nameNorm.includes(catalogAlt)))
      )
    })
    if (bySubstring) return bySubstring.id
  }

  return null
}

export interface MappedFormValues {
  countryId: string | null
  regionId: string | null
  line1: string
  line2: string
  postalCode: string
  city: string
  lat: number
  lng: number
}

/**
 * Convert a Geoapify suggestion / reverse-geocode result to the form's catalog IDs.
 *
 * The backend uses IDs like `Country:v1:DE` and regions whose `alternativeCode`
 * usually matches ISO state codes (e.g. `HE` for Hesse in Germany). When a region
 * match can't be found, regionId is returned as `null` so the user can pick it manually.
 */
export const mapGeoapifyToFormValues = (
  result: { components: AddressComponents; lat: number; lng: number },
  catalogs: { countries?: any[]; regions?: any[] }
): MappedFormValues => {
  const { components } = result
  const countryCode = components.countryCode
  const country = (catalogs.countries || []).find((c: any) => {
    const id = String(c?.id || '')
    return countryCode ? id.endsWith(`:${countryCode}`) : false
  })
  const countryId: string | null = country?.id || null

  let regionId: string | null = null
  if (countryId) {
    const regions = (catalogs.regions || []).filter((r: any) => {
      const parentCountryId = r?.additionalValue2 || r?.parentEntryId
      return parentCountryId ? parentCountryId === countryId : true
    })
    // Try state/region first (covers DE, US); if nothing matches, fall back to county/county_code
    // because providers like Geoapify put Romanian județe under `county`, not `state`.
    // As a last resort, fall back to the city name: in city-state regions (e.g. Berlin,
    // Hamburg, Bremen in DE; Vienna in AT) Geoapify often omits `state`/`state_code`
    // because the city *is* the federal state, but the catalog still has it as a region.
    // Without this fallback the mandatory Region field would stay empty and the user
    // could not submit the address change form.
    regionId =
      findMatchingRegion(regions, components.regionCode, components.region) ||
      findMatchingRegion(regions, components.countyCode, components.county) ||
      findMatchingRegion(regions, undefined, components.city)

    if (!regionId && process.env.NODE_ENV !== 'production') {
      // Keep a minimal diagnostic for future failure cases — dumps what Geoapify returned
      // and which catalog candidates were available. Dev-only, won't leak into production.

      console.warn(
        '[addressAutocomplete] No region match. Geoapify components:',
        {
          region: components.region,
          regionCode: components.regionCode,
          county: components.county,
          countyCode: components.countyCode,
          city: components.city,
          countryId
        },
        'Catalog regions for this country:',
        regions.map(r => ({
          id: r?.id,
          value: r?.value,
          code: r?.code,
          alternativeCode: r?.alternativeCode,
          additionalValue1: r?.additionalValue1
        }))
      )
    }
  }

  return {
    countryId,
    regionId,
    line1: components.line1 || [components.street, components.houseNumber].filter(Boolean).join(' ') || '',
    line2: components.line2 || '',
    postalCode: components.postalCode || '',
    city: components.city || '',
    lat: result.lat,
    lng: result.lng
  }
}
