import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import L from 'leaflet'
import { MapContainer, Marker, TileLayer, useMap } from 'react-leaflet'
// Import leaflet.css both as a side-effect (primary path, works in most bundlers) and as an
// inline string (fallback path via Vite's `?inline` loader). On our dev environment the
// side-effect import alone doesn't reach the page — the CSS either gets code-split into a
// chunk that never loads, or it's overridden by design-system/Tailwind resets. Injecting
// the stylesheet contents into a `<style>` block at the top of the component guarantees the
// rules are present regardless of CSS bundling behavior.
import 'leaflet/dist/leaflet.css'
import leafletCssInline from 'leaflet/dist/leaflet.css?inline'
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png'
import markerIcon from 'leaflet/dist/images/marker-icon.png'
import markerShadow from 'leaflet/dist/images/marker-shadow.png'
import { Button, FormItem, FormLabel, Input, useTranslation } from '@newwork/nw-design-system'
import { MapPinIcon, CrosshairIcon, SpinnerIcon } from '@phosphor-icons/react'
import translations from './_i18n'
// Scoped fallback for Leaflet control positioning. See the file header for the full story.
// Imported as a raw string (Vite `?inline`) and injected into a <style> block below so it
// can't get dropped by CSS code-splitting in production bundles.
import leafletControlStylesFallback from './styles/leaflet-controls-fallback.css?inline'
import {
  AddressSuggestion,
  forwardGeocode,
  getAutocompleteSuggestions,
  getMapTileUrl,
  mapGeoapifyToFormValues,
  reverseGeocode
} from './addressAutocompleteService'

// Leaflet ships marker images as separate assets; Vite bundles them via `?url` imports above.
// We build an explicit icon and pass it to <Marker icon={...}> so Leaflet's internal
// _getIconUrl prototype method (which computes broken relative paths) is bypassed entirely.
const defaultMarkerIcon = new L.Icon({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
})

/**
 * Names of the react-hook-form fields this component reads from and writes to.
 *
 * Defaults match the conventional NewWork address-form schema. Consumers whose
 * form uses different field names can override any subset — e.g.:
 *
 *   <AddressAutocomplete
 *     form={form}
 *     catalogs={catalogs}
 *     fieldNames={{ postalCode: 'zipCode', addressLines: 'streetLines' }}
 *   />
 *
 * `addressLines` must point to an array field — the component writes the provider's
 * formatted line to index 0 and preserves any remaining lines.
 */
export interface AddressAutocompleteFieldNames {
  countryId: string
  regionId: string
  addressLines: string
  postalCode: string
  city: string
  latitude: string
  longitude: string
}

export const DEFAULT_ADDRESS_AUTOCOMPLETE_FIELD_NAMES: AddressAutocompleteFieldNames = {
  countryId: 'countryId',
  regionId: 'regionId',
  addressLines: 'addressLines',
  postalCode: 'postalCode',
  city: 'city',
  latitude: 'latitude',
  longitude: 'longitude'
}

export interface AddressAutocompleteProps {
  /** react-hook-form instance. The component reads/writes fields named in `fieldNames`. */
  form: any
  /** Catalog data used to map Geoapify results to the form's IDs. */
  catalogs: { countries?: any[]; regions?: any[] }
  /** Override any subset of field names if your form schema differs from the defaults. */
  fieldNames?: Partial<AddressAutocompleteFieldNames>
  /** Height of the map area in pixels. Defaults to 220. */
  mapHeightPx?: number
  /**
   * Prefix for `data-testid` attributes on the rendered elements.
   * Defaults to `address-autocomplete`. Useful when multiple instances are on the same page.
   */
  testIdPrefix?: string
}

interface LatLng {
  lat: number
  lng: number
}

const DEFAULT_CENTER: LatLng = { lat: 50.1109, lng: 8.6821 } // Frankfurt — neutral EU default
const DEFAULT_ZOOM = 13
const FOCUSED_ZOOM = 16
const DEBOUNCE_MS = 1200

const FlyToMarker: React.FC<{ center: LatLng | null; zoom: number }> = ({ center, zoom }) => {
  const map = useMap()
  useEffect(() => {
    if (center) {
      map.flyTo([center.lat, center.lng], zoom, { duration: 0.5 })
    }
  }, [center?.lat, center?.lng, zoom, map])
  return null
}

/**
 * Forces Leaflet to re-measure its container whenever it changes size.
 *
 * Fixes the "cropped tiles + invisible zoom controls" bug that happens when the
 * MapContainer mounts inside a Sheet/Dialog that's still animating open: Leaflet reads
 * the container as 0×0 (or too small) at init, lays out tiles+controls for that size,
 * and never recomputes. This is timing-sensitive — local dev usually avoids it, prod
 * builds on slower hosts hit it consistently.
 *
 * Belt-and-braces strategy: invalidate on a series of short timeouts (to cover modal
 * transitions of various durations), plus ResizeObserver on the container, plus a
 * window resize listener. All invalidateSize calls are idempotent and cheap.
 */
const InvalidateSizeOnResize: React.FC = () => {
  const map = useMap()
  useEffect(() => {
    const container = map.getContainer()
    const timeoutIds = [0, 100, 300, 750].map(delay => globalThis.setTimeout(() => map.invalidateSize(), delay))

    const onWindowResize = () => map.invalidateSize()
    window.addEventListener('resize', onWindowResize)

    let observer: ResizeObserver | null = null
    if (typeof ResizeObserver !== 'undefined') {
      observer = new ResizeObserver(() => map.invalidateSize())
      observer.observe(container)
    }

    return () => {
      timeoutIds.forEach(id => globalThis.clearTimeout(id))
      window.removeEventListener('resize', onWindowResize)
      observer?.disconnect()
    }
  }, [map])
  return null
}

const AddressAutocomplete: React.FC<AddressAutocompleteProps> = ({
  form,
  catalogs,
  fieldNames,
  mapHeightPx = 220,
  testIdPrefix = 'address-autocomplete'
}) => {
  const names = useMemo<AddressAutocompleteFieldNames>(
    () => ({ ...DEFAULT_ADDRESS_AUTOCOMPLETE_FIELD_NAMES, ...fieldNames }),
    [fieldNames]
  )

  const { t } = useTranslation(translations)
  const [query, setQuery] = useState('')
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [isSearching, setIsSearching] = useState(false)
  const [isLocating, setIsLocating] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const abortRef = useRef<AbortController | null>(null)
  const suppressNextSearchRef = useRef(false)
  // Flips true while applyAddressToForm is running. Preserved as defense-in-depth
  // even though the address fields are locked readonly (by the consumer form) when
  // the autocomplete is visible — if the consumer ever loosens that policy, any
  // watcher added here in the future will still correctly ignore our programmatic writes.
  const isAutofillingRef = useRef(false)
  const containerRef = useRef<HTMLDivElement | null>(null)

  const lat = form.watch(names.latitude) as number | null | undefined
  const lng = form.watch(names.longitude) as number | null | undefined
  // Free-form address fields used to compute the visual fallback marker when the
  // selected address has no stored lat/lng.
  const watchedAddressLines = form.watch(names.addressLines) as string[] | undefined
  const watchedPostalCode = form.watch(names.postalCode) as string | null | undefined
  const watchedCity = form.watch(names.city) as string | null | undefined
  const watchedCountryId = form.watch(names.countryId) as string | null | undefined

  // Approximated coords derived from the textual address fields. Used only when
  // the form's lat/lng are missing, so the user sees a sensible map view instead
  // of the default Frankfurt center. Never written back to the form (display-only).
  const [fallbackCoords, setFallbackCoords] = useState<LatLng | null>(null)
  // Remembers the last address signature we attempted to forward-geocode so we
  // don't re-fire the request on every render or unrelated form change.
  const fallbackAttemptedFor = useRef<string | null>(null)

  const formCoords: LatLng | null =
    typeof lat === 'number' && typeof lng === 'number' && Number.isFinite(lat) && Number.isFinite(lng)
      ? { lat, lng }
      : null

  // Real form coords always win over the approximation: the moment the user
  // picks a suggestion, drags the pin, or "Use my location" succeeds, lat/lng
  // are filled and we render that authoritative point instead of the fallback.
  const markerPosition: LatLng | null = formCoords ?? fallbackCoords

  const tile = useMemo(() => getMapTileUrl(), [])

  const searchPlaceholder = t('address-autocomplete-search-placeholder')
  const useMyLocationLabel = t('address-autocomplete-use-my-location')
  const pinHintLabel = t('address-autocomplete-pin-hint')
  const searchLabel = t('address-autocomplete-search-label')
  const noResultsLabel = t('address-autocomplete-no-results')

  // Close dropdown on outside click.
  useEffect(() => {
    const handler = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const applyAddressToForm = useCallback(
    (mapped: ReturnType<typeof mapGeoapifyToFormValues>) => {
      suppressNextSearchRef.current = true
      isAutofillingRef.current = true
      const prevCountryId = form.getValues(names.countryId) as string | null | undefined
      const countryChanging = Boolean(mapped.countryId && mapped.countryId !== prevCountryId)

      // When the country changes we MUST clear regionId first. Otherwise the region Select
      // briefly sees its prior value (a region id from the old country) against the new
      // country's freshly-filtered options list. Radix Select detects that mismatch and
      // emits a spurious onValueChange('') asynchronously, which then clobbers whatever
      // region we set below. Clearing first means the Select never sees an invalid state.
      // shouldValidate is intentionally false so the user doesn't see a red "required"
      // error flash during autofill.
      if (countryChanging) {
        form.setValue(names.regionId, null, { shouldDirty: false, shouldValidate: false })
      }

      if (mapped.countryId) {
        form.setValue(names.countryId, mapped.countryId, { shouldDirty: true, shouldValidate: true })
      }

      if (mapped.regionId) {
        form.setValue(names.regionId, mapped.regionId, { shouldDirty: true, shouldValidate: true })
      }

      const current = (form.getValues(names.addressLines) as string[]) || []
      const nextLines = [...current]
      nextLines[0] = mapped.line1
      form.setValue(names.addressLines, nextLines, { shouldDirty: true, shouldValidate: true })
      form.setValue(names.postalCode, mapped.postalCode, { shouldDirty: true, shouldValidate: true })
      form.setValue(names.city, mapped.city, { shouldDirty: true, shouldValidate: true })
      form.setValue(names.latitude, mapped.lat, { shouldDirty: true })
      form.setValue(names.longitude, mapped.lng, { shouldDirty: true })
      // Release the autofill guard after the current microtask/render flush so any watcher
      // effects that fire synchronously from the setValue chain above still see the flag set.
      setTimeout(() => {
        isAutofillingRef.current = false
      }, 0)
    },
    [form, names]
  )

  // ---------------------------------------------------------------------------
  // Fallback marker effect — approximate the location from textual fields when
  // the selected address has no stored lat/lng (legacy records pre-Geoapify).
  // The result is stored in local state only and never written back to the
  // form so submit semantics stay clean: the user must explicitly pick a
  // suggestion or drag the pin to commit a real coordinate.
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (formCoords) {
      // Real coords already on the form — nothing to approximate.
      // Clearing the fallback prevents a stale approximation from "shadowing"
      // the form coords if the user switches between addresses with and
      // without stored coords inside the same component instance.
      if (fallbackCoords) setFallbackCoords(null)
      return
    }

    const line1 = (watchedAddressLines?.[0] ?? '').trim()
    const cityStr = (watchedCity ?? '').trim()
    const postalStr = (watchedPostalCode ?? '').trim()
    const countryEntry = (catalogs.countries ?? []).find((c: any) => String(c?.id) === String(watchedCountryId))
    const countryName = String(countryEntry?.value ?? '').trim()
    const countryCode =
      String(watchedCountryId ?? '')
        .split(':')
        .pop() ?? ''

    // Need at least two of the textual parts to make a meaningful query.
    // Country + city is the minimum that produces a recognisable approximation.
    const queryParts = [line1, cityStr, postalStr, countryName].filter(Boolean)
    if (queryParts.length < 2) {
      if (fallbackCoords) setFallbackCoords(null)
      fallbackAttemptedFor.current = null
      return
    }

    const signature = queryParts.join('|')
    if (fallbackAttemptedFor.current === signature) return
    fallbackAttemptedFor.current = signature

    const controller = new AbortController()
    let cancelled = false
    const timeoutId = window.setTimeout(async () => {
      const result = await forwardGeocode(queryParts.join(', '), {
        countryBias: countryCode.length === 2 ? countryCode : undefined,
        signal: controller.signal
      })
      if (cancelled) return
      // null means geocoding failed — leave whatever fallback we had (or none)
      // alone so we don't blank a previously-good approximation due to a
      // transient network blip.
      if (result) setFallbackCoords(result)
    }, 350)

    return () => {
      cancelled = true
      controller.abort()
      window.clearTimeout(timeoutId)
    }
    // NOTE: `catalogs.countries` and `fallbackCoords` are intentionally excluded
    // from the dep array. The catalog identity changes on every parent render
    // but the lookup result is keyed on `watchedCountryId`, and reading
    // `fallbackCoords` only happens to decide whether to clear it (a cheap
    // setState equality check). Including either would re-fire the geocode on
    // every unrelated render.
  }, [formCoords, watchedAddressLines, watchedCity, watchedPostalCode, watchedCountryId])

  useEffect(() => {
    if (suppressNextSearchRef.current) {
      suppressNextSearchRef.current = false
      return
    }
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (abortRef.current) abortRef.current.abort()

    const trimmed = query.trim()
    if (trimmed.length < 3) {
      setSuggestions([])
      setIsSearching(false)
      return
    }

    setIsSearching(true)
    debounceRef.current = setTimeout(async () => {
      const controller = new AbortController()
      abortRef.current = controller
      try {
        // Intentionally do NOT pass countryBias. The autocomplete is the source of truth
        // for the full address (including country) — search stays global so the user can
        // type e.g. "Brasov" and land in Romania even if the Country select currently reads
        // "Germany". The picked suggestion then re-writes Country / Region / lines / etc.
        const results = await getAutocompleteSuggestions(trimmed, {
          limit: 5,
          signal: controller.signal
        })
        setSuggestions(results)
        // Always open the dropdown so the user gets feedback. When `results` is empty
        // the dropdown renders the localized "no results" message instead of suggestions.
        setIsOpen(true)
      } catch (err) {
        if ((err as any)?.name !== 'AbortError') {
          setSuggestions([])
          setIsOpen(true)
        }
      } finally {
        setIsSearching(false)
      }
    }, DEBOUNCE_MS)

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [query, form, names])

  const handlePickSuggestion = useCallback(
    (suggestion: AddressSuggestion) => {
      const mapped = mapGeoapifyToFormValues(suggestion, catalogs)
      applyAddressToForm(mapped)
      setQuery(suggestion.label)
      setSuggestions([])
      setIsOpen(false)
    },
    [catalogs, applyAddressToForm]
  )

  const handleReverseForCoords = useCallback(
    async (coords: LatLng) => {
      const result = await reverseGeocode(coords.lat, coords.lng)
      const mapped = mapGeoapifyToFormValues(result ?? { components: {}, ...coords }, catalogs)
      applyAddressToForm({ ...mapped, lat: coords.lat, lng: coords.lng })
      if (result?.formattedAddress) setQuery(result.formattedAddress)
    },
    [catalogs, applyAddressToForm]
  )

  const handleUseMyLocation = useCallback(() => {
    if (!('geolocation' in navigator)) return
    setIsLocating(true)

    // Try high accuracy first (better GPS fix). If it errors (e.g. cold start with no GPS lock),
    // fall back to a network/wifi-based position. Two-step pattern avoids the "first press
    // silently fails, second press works" problem.
    const runReverse = async (position: GeolocationPosition) => {
      await handleReverseForCoords({ lat: position.coords.latitude, lng: position.coords.longitude })
      setIsLocating(false)
    }

    const onHighAccuracyError = () => {
      navigator.geolocation.getCurrentPosition(runReverse, () => setIsLocating(false), {
        enableHighAccuracy: false,
        timeout: 15000,
        maximumAge: 300000
      })
    }

    navigator.geolocation.getCurrentPosition(runReverse, onHighAccuracyError, {
      enableHighAccuracy: true,
      timeout: 15000,
      maximumAge: 60000
    })
  }, [handleReverseForCoords])

  const markerEventHandlers = useMemo(
    () => ({
      dragend: (event: L.LeafletEvent) => {
        const marker = event.target as L.Marker
        const { lat: newLat, lng: newLng } = marker.getLatLng()
        void handleReverseForCoords({ lat: newLat, lng: newLng })
      }
    }),
    [handleReverseForCoords]
  )

  const initialCenter = markerPosition ?? DEFAULT_CENTER
  const initialZoom = markerPosition ? FOCUSED_ZOOM : DEFAULT_ZOOM

  return (
    <div ref={containerRef} className="gba:space-y-2" data-testid={testIdPrefix}>
      <FormItem>
        <FormLabel>{searchLabel}</FormLabel>
        <div className="gba:relative">
          <div className="gba:flex gba:gap-2">
            <div className="gba:flex-1 gba:relative">
              <Input
                value={query}
                placeholder={searchPlaceholder}
                onChange={e => {
                  setQuery(e.target.value)
                  setIsOpen(true)
                }}
                onFocus={() => {
                  if (suggestions.length > 0) setIsOpen(true)
                }}
                data-testid={`${testIdPrefix}-input`}
              />
              {isSearching && (
                <SpinnerIcon className="gba:w-4 gba:h-4 gba:absolute gba:right-3 gba:top-1/2 gba:-translate-y-1/2 gba:animate-spin gba:text-muted-foreground" />
              )}
            </div>
            <Button
              type="button"
              variant="outline"
              onClick={handleUseMyLocation}
              disabled={isLocating}
              data-testid={`${testIdPrefix}-use-my-location`}
              title={useMyLocationLabel}
            >
              {isLocating ? (
                <SpinnerIcon className="gba:w-4 gba:h-4 gba:animate-spin" />
              ) : (
                <CrosshairIcon className="gba:w-4 gba:h-4" />
              )}
              <span className="gba:sr-only">{useMyLocationLabel}</span>
            </Button>
          </div>

          {isOpen && (suggestions.length > 0 || (!isSearching && query.trim().length >= 3)) && (
            // TODO(a11y): when we promote the Find-address UI out of dev.enabled, implement the full
            // WAI-ARIA combobox+listbox pattern here (role="combobox"/aria-expanded/aria-controls/
            // aria-activedescendant on the input, role="listbox"/role="option" here, plus arrow-key
            // navigation). For now we keep a plain <ul> to satisfy SonarQube S6807 which flags the
            // listbox role in isolation. <select>/<datalist> are not viable alternatives because we
            // render custom items (pin icon, "No results" state) and load suggestions async.
            <ul
              className="gba:absolute gba:z-[1000] gba:left-0 gba:right-0 gba:mt-1 gba:rounded-md gba:border gba:bg-popover gba:text-popover-foreground gba:shadow-md gba:max-h-64 gba:overflow-auto"
              data-testid={`${testIdPrefix}-dropdown`}
            >
              {suggestions.length === 0 ? (
                <li className="gba:px-3 gba:py-2 gba:text-sm gba:text-muted-foreground">{noResultsLabel}</li>
              ) : (
                suggestions.map(s => (
                  <li
                    key={s.id}
                    className="gba:px-3 gba:py-2 gba:text-sm gba:cursor-pointer gba:hover:bg-accent gba:hover:text-accent-foreground"
                    onMouseDown={e => {
                      e.preventDefault()
                      handlePickSuggestion(s)
                    }}
                    data-testid={`${testIdPrefix}-option-${s.id}`}
                  >
                    <div className="gba:flex gba:items-start gba:gap-2">
                      <MapPinIcon className="gba:w-4 gba:h-4 gba:mt-0.5 gba:shrink-0" />
                      <span>{s.label}</span>
                    </div>
                  </li>
                ))
              )}
            </ul>
          )}
        </div>
      </FormItem>

      {/*
        Inline fallback styles for Leaflet. In our production dev build the side-effect
        import of `leaflet/dist/leaflet.css` doesn't reach the page (CSS chunking or
        cascade fight with design-system resets), so we also inject the stylesheet inline
        as a JS string via Vite's `?inline` loader. The scoped controls stylesheet below
        stays as an extra belt-and-braces layer.
      */}
      <style>{leafletCssInline}</style>
      <style>{leafletControlStylesFallback}</style>
      <div
        className="gba-leaflet-map gba:w-full gba:rounded-md gba:overflow-hidden gba:border"
        style={{ height: `${mapHeightPx}px` }}
        data-testid={`${testIdPrefix}-map-container`}
      >
        <MapContainer
          center={[initialCenter.lat, initialCenter.lng]}
          zoom={initialZoom}
          style={{ height: '100%', width: '100%' }}
          scrollWheelZoom={false}
        >
          <TileLayer url={tile.url} attribution={tile.attribution} />
          {markerPosition && (
            <Marker
              position={[markerPosition.lat, markerPosition.lng]}
              draggable
              icon={defaultMarkerIcon}
              eventHandlers={markerEventHandlers}
            />
          )}
          <FlyToMarker center={markerPosition} zoom={FOCUSED_ZOOM} />
          <InvalidateSizeOnResize />
        </MapContainer>
      </div>

      {markerPosition && (
        <p className="gba:text-xs gba:text-muted-foreground" data-testid={`${testIdPrefix}-pin-hint`}>
          {pinHintLabel}
        </p>
      )}
    </div>
  )
}

export default AddressAutocomplete
