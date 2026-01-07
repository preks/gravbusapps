export interface GeoAddressResponse {
  address?: Record<string, unknown>
  // Keep the full payload flexible for future use
  [key: string]: unknown
}

import { GraphQLClient } from '@/common/network/graphql/GraphQLClient'
import { GET_EMPLOYEE_SITE_LOCATION, GET_EMPLOYEE_HOME_ADDRESS } from '../../queries/employeeLocationQueries'
import { env } from '@/common/env/EnvUtils'

export interface GeoCoords {
  lat: number
  lng: number
}

export const getAddressFromCoords = async (lat: number, lng: number): Promise<GeoAddressResponse> => {
  const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`

  const response = await fetch(url, {
    headers: {
      // Nominatim requires a valid identifying User-Agent
      'User-Agent': 'GravityBusinessApps/1.0 (contact: support@newwork.ai)'
    }
  })

  return (await response.json()) as GeoAddressResponse
}

export const getGeoLocationReadable = async (): Promise<GeoAddressResponse | null> => {
  if (!('geolocation' in navigator)) {
    return null
  }

  const position = await new Promise<GeolocationPosition>((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true,
      timeout: 5000,
      maximumAge: 0
    })
  })

  const lat = position.coords.latitude
  const lng = position.coords.longitude

  return await getAddressFromCoords(lat, lng)
}

export interface OfficeAndGeoLocationResult {
  officeLocation: any | null
  homeAddress: any | null
  geoAddress: GeoAddressResponse | null
  position?: {
    coords: GeoCoords
    accuracy: number // meters
  }
  comparisons?: {
    officeDistanceMeters?: number
    homeDistanceMeters?: number
    thresholdMeters: number
    isNearOffice: boolean
    isNearHome: boolean
    homeTextMatchScore?: number
    officeTextMatchScore?: number
  }
}

/**
 * Fetch the employee office siteLocation via GraphQL and then resolve human-readable
 * geolocation from the browser. Accepts a configured GraphQL client to avoid
 * violating rules-of-hooks by constructing clients inside services.
 */
export const fetchOfficeAndGeoLocation = async (
  graphqlClient: GraphQLClient,
  employeeId: string
): Promise<OfficeAndGeoLocationResult> => {
  let officeLocation: any | null = null
  let homeAddress: any | null = null
  try {
    const result = await graphqlClient.request<any>(GET_EMPLOYEE_SITE_LOCATION, { employeeId })
    officeLocation = result?.Employee?.[0]?.employeePosition?.siteLocation ?? null
  } catch (e) {
    // Leave officeLocation as null on failure
    console.error('Failed to fetch office location', e)
  }

  try {
    const result = await graphqlClient.request<any>(GET_EMPLOYEE_HOME_ADDRESS, { employeeId })
    homeAddress = result?.Employee?.[0]?.addresses?.[0] ?? null
  } catch (e) {
    // Leave homeAddress as null on failure
    console.error('Failed to fetch home address', e)
  }

  let geoAddress: GeoAddressResponse | null = null
  let position: { coords: GeoCoords; accuracy: number } | undefined
  try {
    // Get precise browser coordinates + accuracy first
    const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: true,
        timeout: 5000,
        maximumAge: 0
      })
    })
    position = {
      coords: { lat: pos.coords.latitude, lng: pos.coords.longitude },
      accuracy: pos.coords.accuracy
    }

    // Reverse geocode to human-readable address
    geoAddress = await getAddressFromCoords(position.coords.lat, position.coords.lng)

    // If accuracy is poor, try Google Geolocation API and prefer the more accurate result
    if (position.accuracy > 500) {
      const googleResult = await tryGoogleGeolocation()
      if (googleResult && googleResult.accuracy < position.accuracy) {
        position = {
          coords: { lat: googleResult.lat, lng: googleResult.lng },
          accuracy: googleResult.accuracy
        }
        geoAddress = await getAddressFromCoords(googleResult.lat, googleResult.lng)
      }
    }
  } catch (e) {
    // geoAddress remains null on failure or permission errors
    console.error('Failed to obtain browser geo location', e)

    // Fallback to Google Geolocation API if available
    const googleResult = await tryGoogleGeolocation()
    if (googleResult) {
      position = {
        coords: { lat: googleResult.lat, lng: googleResult.lng },
        accuracy: googleResult.accuracy
      }
      geoAddress = await getAddressFromCoords(googleResult.lat, googleResult.lng)
    }
  }

  // Optional: attempt to geocode office/home addresses to coordinates and compare distances
  let comparisons: OfficeAndGeoLocationResult['comparisons']
  if (position) {
    const thresholdMeters = Math.max(position.accuracy * 2, 100) // dynamic threshold

    const [officeCoords, homeCoords] = await Promise.all([
      geocodeAddressToCoords(officeLocation),
      geocodeEmployeeAddressToCoords(homeAddress)
    ])

    const officeDistanceMeters =
      officeCoords && position ? haversineDistanceMeters(position.coords, officeCoords) : undefined
    const homeDistanceMeters = homeCoords && position ? haversineDistanceMeters(position.coords, homeCoords) : undefined

    // Fallback text similarity when geocoding fails or yields no coordinates
    const geoAddrString = buildGeoAddressString(geoAddress)
    const homeAddrString = buildHomeAddressString(homeAddress)
    const officeAddrString = buildOfficeAddressString(officeLocation)
    const homeTextMatchScore = textMatchScore(homeAddrString, geoAddrString)
    const officeTextMatchScore = textMatchScore(officeAddrString, geoAddrString)

    const textThreshold = 0.6

    comparisons = {
      officeDistanceMeters,
      homeDistanceMeters,
      thresholdMeters,
      isNearOffice:
        typeof officeDistanceMeters === 'number'
          ? officeDistanceMeters <= thresholdMeters
          : officeTextMatchScore >= textThreshold,
      isNearHome:
        typeof homeDistanceMeters === 'number'
          ? homeDistanceMeters <= thresholdMeters
          : homeTextMatchScore >= textThreshold,
      homeTextMatchScore,
      officeTextMatchScore
    }
  }

  return { officeLocation, homeAddress, geoAddress, position, comparisons }
}

/**
 * Try Google Geolocation API as a fallback or improvement if configured.
 * Requires NEXT_PUBLIC_GOOGLE_GEOLOCATION_API_KEY to be set.
 * Returns { lat, lng, accuracy } or null on failure.
 */
const tryGoogleGeolocation = async (): Promise<{ lat: number; lng: number; accuracy: number } | null> => {
  const apiKey = env('NEXT_PUBLIC_GOOGLE_GEOLOCATION_API_KEY')
  if (!apiKey) return null

  try {
    const endpoint = `https://www.googleapis.com/geolocation/v1/geolocate?key=${encodeURIComponent(apiKey)}`
    const body = {
      considerIp: true
      // wifiAccessPoints / cellTowers cannot be accessed from modern browsers due privacy; IP-based fallback used
    }
    const resp = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    })

    if (!resp.ok) {
      return null
    }
    const data = await resp.json()
    const lat = data?.location?.lat
    const lng = data?.location?.lng
    const accuracy = data?.accuracy
    if (typeof lat === 'number' && typeof lng === 'number' && typeof accuracy === 'number') {
      return { lat, lng, accuracy }
    }
    return null
  } catch {
    return null
  }
}

/**
 * Try to geocode a site location object (from EmployeePosition.siteLocation) to coordinates.
 */
const geocodeAddressToCoords = async (siteLocation: any | null): Promise<GeoCoords | null> => {
  if (!siteLocation) return null

  // Build a single-line address string using available fields
  const parts: string[] = []
  if (siteLocation.addressLine) parts.push(String(siteLocation.addressLine))
  if (siteLocation.postalCode) parts.push(String(siteLocation.postalCode))
  if (siteLocation.name) parts.push(String(siteLocation.name))
  if (siteLocation.regionRef) parts.push(String(siteLocation.regionRef))
  if (siteLocation.countryRef) parts.push(String(siteLocation.countryRef))

  const q = parts.filter(Boolean).join(', ')
  if (!q) return null

  return await geocodeQueryToCoords(q)
}

/**
 * Try to geocode an Employee address object to coordinates.
 * Expects fields similar to GET_EMPLOYEE_DATA.addresses: addressLine[], postalCode, locality, country { code|value }.
 */
const geocodeEmployeeAddressToCoords = async (address: any | null): Promise<GeoCoords | null> => {
  if (!address) return null

  const lines: string[] = Array.isArray(address.addressLine)
    ? address.addressLine.filter((l: unknown) => typeof l === 'string' && l.trim().length > 0)
    : []
  const parts: string[] = []
  if (lines.length) parts.push(lines.join(' '))
  if (address.postalCode) parts.push(String(address.postalCode))
  if (address.locality) parts.push(String(address.locality))
  const countryCode = address.country?.code || address.country?.value
  if (countryCode) parts.push(String(countryCode))

  const q = parts.filter(Boolean).join(', ')
  if (!q) return null

  return await geocodeQueryToCoords(q)
}

/**
 * Forward-geocode a free-text address query to coordinates using Nominatim.
 */
const geocodeQueryToCoords = async (q: string): Promise<GeoCoords | null> => {
  try {
    const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(q)}`
    const resp = await fetch(url, {
      headers: {
        'User-Agent': 'GravityBusinessApps/1.0 (contact: support@newwork.ai)'
      }
    })
    const data = await resp.json()
    const first = Array.isArray(data) && data.length > 0 ? data[0] : null
    if (!first) return null
    const lat = parseFloat(first.lat)
    const lng = parseFloat(first.lon)
    if (Number.isFinite(lat) && Number.isFinite(lng)) {
      return { lat, lng }
    }
    return null
  } catch {
    return null
  }
}

/**
 * Compute Haversine distance between two coordinates in meters.
 */
const haversineDistanceMeters = (a: GeoCoords, b: GeoCoords): number => {
  const toRad = (deg: number) => (deg * Math.PI) / 180
  const R = 6371000 // Earth radius in meters
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

/**
 * Build human-readable strings from objects for text comparison.
 */
const buildGeoAddressString = (geo: GeoAddressResponse | null): string => {
  const a: any = geo?.address || {}
  const parts = [a.road, a.house_number, a.suburb, a.city || a.town || a.village, a.postcode, a.state, a.country]
  return parts.filter(Boolean).join(' ')
}

const buildHomeAddressString = (addr: any | null): string => {
  if (!addr) return ''
  const lines: string[] = Array.isArray(addr.addressLine)
    ? addr.addressLine.filter((l: unknown) => typeof l === 'string' && l.trim().length > 0)
    : []
  const parts = [lines.join(' '), addr.locality, addr.postalCode, addr.country?.code || addr.country?.value]
  return parts.filter(Boolean).join(' ')
}

const buildOfficeAddressString = (siteLocation: any | null): string => {
  if (!siteLocation) return ''
  const parts = [
    siteLocation.addressLine,
    siteLocation.name,
    siteLocation.postalCode,
    siteLocation.regionRef,
    siteLocation.countryRef
  ]
  return parts.filter(Boolean).join(' ')
}

/**
 * Simple token-overlap score between two address strings (0..1).
 * Robust to punctuation, case, diacritics, and word order.
 */
const textMatchScore = (a: string, b: string): number => {
  const normalize = (s: string) =>
    (s || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // strip diacritics
      .replace(/[^a-z0-9]+/g, ' ')
      .trim()
  const toTokens = (s: string) =>
    Array.from(
      new Set(
        normalize(s)
          .split(' ')
          .filter(t => t.length >= 2)
      )
    )

  const at = toTokens(a)
  const bt = toTokens(b)
  if (at.length === 0 || bt.length === 0) return 0

  const bset = new Set(bt)
  let overlap = 0
  for (const t of at) {
    if (bset.has(t)) overlap++
  }
  return overlap / Math.min(at.length, bt.length)
}
