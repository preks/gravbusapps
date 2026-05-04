import { GraphQLClient } from '@/common/network/graphql/GraphQLClient'
import { GET_EMPLOYEE_SITE_LOCATION, GET_EMPLOYEE_HOME_ADDRESS } from '../../queries/employeeLocationQueries'
import { env } from '@/common/env/EnvUtils'

/**
 * Geo location service — clock-in proximity detection.
 *
 * Design (post April-2026 rewrite):
 *   • Home and office coordinates are stored on their respective entities
 *     (`EmployeeAddress.latitude/longitude`, `SiteLocation.latitude/longitude`).
 *     They are written by the change-address / change-site-location forms via the
 *     Geoapify autocomplete component, which only fills them when a tool action is
 *     used — so the stored coords are always trustworthy.
 *   • Clock-in fetches those stored coords + the device's current position and runs a
 *     Haversine distance check. Threshold is dynamic: max(GPS accuracy * 2, 100m).
 *   • If a side is missing coords (legacy data, or backfill not done), that side is
 *     simply excluded from the comparison and `homeHasCoords` / `officeHasCoords`
 *     surface the missing state to the UI (which shows a "needs review" warning).
 *
 * What this service intentionally does NOT do anymore:
 *   • Forward-geocoding home / office address text via Nominatim (slow, rate-limited,
 *     fragile on diacritics / inconsistent formatting).
 *   • Reverse-geocoding the device coords for human-readable display (no consumer needs
 *     it; the location card only cares about the resolved Home / Office / Remote enum).
 *   • Token-overlap text-similarity fallback (was a band-aid for failed geocodes; with
 *     stored coords on both sides there's nothing to fall back from).
 */

export interface GeoCoords {
  lat: number
  lng: number
}

export interface OfficeAndGeoLocationResult {
  officeLocation: any | null
  homeAddress: any | null
  position?: {
    coords: GeoCoords
    accuracy: number
  }
  /** True when the home address has stored latitude+longitude. False when missing or legacy. */
  homeHasCoords: boolean
  /** True when the office siteLocation has stored latitude+longitude. False when missing —
   * i.e. legacy SiteLocation rows that were never resaved through the change-site-location
   * form, so they still lack the new lat/lng columns. */
  officeHasCoords: boolean
  comparisons?: {
    homeDistanceMeters?: number
    officeDistanceMeters?: number
    thresholdMeters: number
    isNearHome: boolean
    isNearOffice: boolean
  }
}

/**
 * Lightweight preflight: fetch only the home + office coordinate availability for the
 * given employee. Used by the location card to decide whether to show the
 * "address needs review" warning before the user even attempts to clock in. Does NOT
 * request the device's geolocation — that prompt is reserved for the actual clock-in
 * action so users don't see a permission popup just by opening the page.
 */
export interface EmployeeLocationCoordsAvailability {
  homeCoords: GeoCoords | null
  officeCoords: GeoCoords | null
  homeHasCoords: boolean
  officeHasCoords: boolean
}

export const fetchEmployeeLocationCoords = async (
  graphqlClient: GraphQLClient,
  employeeId: string
): Promise<EmployeeLocationCoordsAvailability> => {
  const [homeCoords, officeCoords] = await Promise.all([
    fetchHomeCoords(graphqlClient, employeeId),
    fetchOfficeCoords(graphqlClient, employeeId)
  ])
  return {
    homeCoords,
    officeCoords,
    homeHasCoords: homeCoords !== null,
    officeHasCoords: officeCoords !== null
  }
}

/**
 * Full clock-in geo flow: fetch stored home + office coords, request the device
 * position, and compute the proximity flags. Used by the clock-in handler in
 * `useTimeTrackingData` to derive the `attendanceLocation` enum that gets persisted
 * with the time entry.
 */
export const fetchOfficeAndGeoLocation = async (
  graphqlClient: GraphQLClient,
  employeeId: string
): Promise<OfficeAndGeoLocationResult> => {
  const [homeRecord, officeRecord, position] = await Promise.all([
    fetchHomeAddressRaw(graphqlClient, employeeId),
    fetchOfficeRaw(graphqlClient, employeeId),
    getDevicePosition()
  ])

  const homeCoords = extractCoords(homeRecord)
  const officeCoords = extractCoords(officeRecord)

  const result: OfficeAndGeoLocationResult = {
    officeLocation: officeRecord,
    homeAddress: homeRecord,
    position: position ?? undefined,
    homeHasCoords: homeCoords !== null,
    officeHasCoords: officeCoords !== null
  }

  if (!position) return result

  const thresholdMeters = Math.max(position.accuracy * 2, 100)
  const homeDistanceMeters = homeCoords ? haversineDistanceMeters(position.coords, homeCoords) : undefined
  const officeDistanceMeters = officeCoords ? haversineDistanceMeters(position.coords, officeCoords) : undefined

  result.comparisons = {
    homeDistanceMeters,
    officeDistanceMeters,
    thresholdMeters,
    isNearHome: typeof homeDistanceMeters === 'number' && homeDistanceMeters <= thresholdMeters,
    isNearOffice: typeof officeDistanceMeters === 'number' && officeDistanceMeters <= thresholdMeters
  }

  return result
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

const fetchHomeAddressRaw = async (graphqlClient: GraphQLClient, employeeId: string): Promise<any | null> => {
  try {
    const result = await graphqlClient.request<any>(GET_EMPLOYEE_HOME_ADDRESS, { employeeId })
    return result?.Employee?.[0]?.addresses?.[0] ?? null
  } catch (e) {
    console.error('Failed to fetch home address', e)
    return null
  }
}

const fetchOfficeRaw = async (graphqlClient: GraphQLClient, employeeId: string): Promise<any | null> => {
  try {
    const result = await graphqlClient.request<any>(GET_EMPLOYEE_SITE_LOCATION, { employeeId })
    return result?.Employee?.[0]?.employeePosition?.siteLocation ?? null
  } catch (e) {
    console.error('Failed to fetch office location', e)
    return null
  }
}

const fetchHomeCoords = async (graphqlClient: GraphQLClient, employeeId: string): Promise<GeoCoords | null> =>
  extractCoords(await fetchHomeAddressRaw(graphqlClient, employeeId))

const fetchOfficeCoords = async (graphqlClient: GraphQLClient, employeeId: string): Promise<GeoCoords | null> =>
  extractCoords(await fetchOfficeRaw(graphqlClient, employeeId))

/**
 * Pull `{ lat, lng }` off a raw GraphQL record (home address or site location). Both
 * shapes carry the coords as top-level `latitude` / `longitude` numbers when present.
 * Returns null when either coordinate is missing or non-finite — partial coords are
 * treated as no coords (no point comparing against a single axis).
 */
const extractCoords = (record: any | null): GeoCoords | null => {
  if (!record) return null
  const lat = typeof record.latitude === 'number' ? record.latitude : null
  const lng = typeof record.longitude === 'number' ? record.longitude : null
  if (lat === null || lng === null) return null
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null
  return { lat, lng }
}

/**
 * Get the device's current position. Tries high-accuracy GPS first; if that fails or
 * yields a very poor fix (>500m), falls back to Google's IP-based geolocation API
 * when configured. Returns null if both fail (e.g. user denied permission and no key).
 */
const getDevicePosition = async (): Promise<{ coords: GeoCoords; accuracy: number } | null> => {
  if (!('geolocation' in navigator)) return await tryGoogleGeolocation()

  try {
    const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: true,
        timeout: 5000,
        maximumAge: 0
      })
    })
    const browserPosition = {
      coords: { lat: pos.coords.latitude, lng: pos.coords.longitude },
      accuracy: pos.coords.accuracy
    }

    if (browserPosition.accuracy > 500) {
      const google = await tryGoogleGeolocation()
      if (google && google.accuracy < browserPosition.accuracy) return google
    }

    return browserPosition
  } catch (e) {
    console.error('Failed to obtain browser geo location', e)
    return await tryGoogleGeolocation()
  }
}

/**
 * Optional fallback. Requires NEXT_PUBLIC_GOOGLE_GEOLOCATION_API_KEY to be configured;
 * returns null otherwise. IP-based, so accuracy is typically a few hundred meters —
 * only useful when the browser GPS fix is missing or worse than the IP estimate.
 */
const tryGoogleGeolocation = async (): Promise<{ coords: GeoCoords; accuracy: number } | null> => {
  const apiKey = env('NEXT_PUBLIC_GOOGLE_GEOLOCATION_API_KEY')
  if (!apiKey) return null

  try {
    const endpoint = `https://www.googleapis.com/geolocation/v1/geolocate?key=${encodeURIComponent(apiKey)}`
    const resp = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ considerIp: true })
    })
    if (!resp.ok) return null
    const data = await resp.json()
    const lat = data?.location?.lat
    const lng = data?.location?.lng
    const accuracy = data?.accuracy
    if (typeof lat === 'number' && typeof lng === 'number' && typeof accuracy === 'number') {
      return { coords: { lat, lng }, accuracy }
    }
    return null
  } catch {
    return null
  }
}

/**
 * Great-circle distance between two coordinates in meters. Standard Haversine formula —
 * accurate to within a fraction of a percent at human-scale distances, which is far
 * better than the GPS uncertainty we're comparing against anyway.
 */
const haversineDistanceMeters = (a: GeoCoords, b: GeoCoords): number => {
  const toRad = (deg: number) => (deg * Math.PI) / 180
  const R = 6371000
  const dLat = toRad(b.lat - a.lat)
  const dLon = toRad(b.lng - a.lng)
  const lat1 = toRad(a.lat)
  const lat2 = toRad(b.lat)

  const sinDLat = Math.sin(dLat / 2)
  const sinDLon = Math.sin(dLon / 2)

  const h = sinDLat * sinDLat + Math.cos(lat1) * Math.cos(lat2) * sinDLon * sinDLon
  const c = 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h))
  return R * c
}
