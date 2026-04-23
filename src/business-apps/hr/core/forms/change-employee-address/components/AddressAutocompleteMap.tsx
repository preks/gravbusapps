import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import L from 'leaflet'
import { MapContainer, Marker, TileLayer, useMap } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png'
import markerIcon from 'leaflet/dist/images/marker-icon.png'
import markerShadow from 'leaflet/dist/images/marker-shadow.png'
import { Button, FormItem, FormLabel, Input, useTranslation } from '@newwork/nw-design-system'
import { MapPinIcon, CrosshairIcon, SpinnerIcon } from '@phosphor-icons/react'
import translations from '../../../apps/employee-record/_i18n'
import {
  AddressSuggestion,
  getAutocompleteSuggestions,
  getMapTileUrl,
  mapGeoapifyToFormValues,
  reverseGeocode
} from '../services/addressAutocompleteService'

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

interface AddressAutocompleteMapProps {
  form: any
  catalogs: { countries?: any[]; regions?: any[] }
}

interface LatLng {
  lat: number
  lng: number
}

const DEFAULT_CENTER: LatLng = { lat: 50.1109, lng: 8.6821 } // Frankfurt — neutral EU default
const DEFAULT_ZOOM = 13
const FOCUSED_ZOOM = 16
const DEBOUNCE_MS = 300

const FlyToMarker: React.FC<{ center: LatLng | null; zoom: number }> = ({ center, zoom }) => {
  const map = useMap()
  useEffect(() => {
    if (center) {
      map.flyTo([center.lat, center.lng], zoom, { duration: 0.5 })
    }
  }, [center?.lat, center?.lng, zoom, map])
  return null
}

const AddressAutocompleteMap: React.FC<AddressAutocompleteMapProps> = ({ form, catalogs }) => {
  const { t } = useTranslation(translations)
  const [query, setQuery] = useState('')
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([])
  const [isOpen, setIsOpen] = useState(false)
  const [isSearching, setIsSearching] = useState(false)
  const [isLocating, setIsLocating] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const abortRef = useRef<AbortController | null>(null)
  const suppressNextSearchRef = useRef(false)
  // Flips true while applyAddressToForm is running so the field-change watcher below doesn't
  // interpret our own autofill writes as user edits (which would clear the search query).
  const isAutofillingRef = useRef(false)
  const containerRef = useRef<HTMLDivElement | null>(null)

  const lat = form.watch('latitude') as number | null | undefined
  const lng = form.watch('longitude') as number | null | undefined

  const markerPosition: LatLng | null =
    typeof lat === 'number' && typeof lng === 'number' && Number.isFinite(lat) && Number.isFinite(lng)
      ? { lat, lng }
      : null

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

  // When the user manually edits an address field, wipe the "Find address" query so the
  // search box doesn't show a stale formatted address that no longer reflects the form.
  // Our own autofill writes are skipped via isAutofillingRef.
  useEffect(() => {
    const isWatchedFieldChange = (name?: string): boolean => {
      if (!name) return false
      if (name === 'countryId' || name === 'regionId' || name === 'postalCode' || name === 'city') return true
      // addressLines is an array, RHF emits names like 'addressLines', 'addressLines.0', etc.
      if (name === 'addressLines' || name.startsWith('addressLines.')) return true
      return false
    }
    const subscription = form.watch((_values: unknown, info: { name?: string; type?: string }) => {
      if (isAutofillingRef.current) return
      if (!isWatchedFieldChange(info?.name)) return
      setQuery(current => (current ? '' : current))
    })
    return () => subscription.unsubscribe()
  }, [form])

  const applyAddressToForm = useCallback(
    (mapped: ReturnType<typeof mapGeoapifyToFormValues>) => {
      suppressNextSearchRef.current = true
      isAutofillingRef.current = true
      const prevCountryId = form.getValues('countryId') as string | null | undefined
      const countryChanging = Boolean(mapped.countryId && mapped.countryId !== prevCountryId)

      // When the country changes we MUST clear regionId first. Otherwise the region Select
      // briefly sees its prior value (a region id from the old country) against the new
      // country's freshly-filtered options list. Radix Select detects that mismatch and
      // emits a spurious onValueChange('') asynchronously, which then clobbers whatever
      // region we set below. Clearing first means the Select never sees an invalid state.
      // shouldValidate is intentionally false so the user doesn't see a red "required"
      // error flash during autofill.
      if (countryChanging) {
        form.setValue('regionId', null, { shouldDirty: false, shouldValidate: false })
      }

      if (mapped.countryId) {
        form.setValue('countryId', mapped.countryId, { shouldDirty: true, shouldValidate: true })
      }

      if (mapped.regionId) {
        form.setValue('regionId', mapped.regionId, { shouldDirty: true, shouldValidate: true })
      }

      const current = (form.getValues('addressLines') as string[]) || []
      const nextLines = [...current]
      nextLines[0] = mapped.line1
      form.setValue('addressLines', nextLines, { shouldDirty: true, shouldValidate: true })
      form.setValue('postalCode', mapped.postalCode, { shouldDirty: true, shouldValidate: true })
      form.setValue('city', mapped.city, { shouldDirty: true, shouldValidate: true })
      form.setValue('latitude', mapped.lat, { shouldDirty: true })
      form.setValue('longitude', mapped.lng, { shouldDirty: true })
      // Release the autofill guard after the current microtask/render flush so any watcher
      // effects that fire synchronously from the setValue chain above still see the flag set.
      setTimeout(() => {
        isAutofillingRef.current = false
      }, 0)
    },
    [form]
  )

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
        const countryBias = (() => {
          const countryId = form.getValues('countryId') as string | null | undefined
          if (!countryId) return undefined
          const parts = String(countryId).split(':')
          const code = parts[parts.length - 1]
          return code?.length === 2 ? code : undefined
        })()
        const results = await getAutocompleteSuggestions(trimmed, {
          limit: 5,
          countryBias,
          signal: controller.signal
        })
        setSuggestions(results)
        setIsOpen(results.length > 0)
      } catch (err) {
        if ((err as any)?.name !== 'AbortError') {
          setSuggestions([])
        }
      } finally {
        setIsSearching(false)
      }
    }, DEBOUNCE_MS)

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [query, form])

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
    <div ref={containerRef} className="gba:space-y-2" data-testid="address-autocomplete-map">
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
                data-testid="address-autocomplete-input"
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
              data-testid="address-autocomplete-use-my-location"
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
              data-testid="address-autocomplete-dropdown"
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
                    data-testid={`address-autocomplete-option-${s.id}`}
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

      <div
        className="gba:h-[220px] gba:w-full gba:rounded-md gba:overflow-hidden gba:border"
        data-testid="address-autocomplete-map-container"
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
        </MapContainer>
      </div>

      {markerPosition && (
        <p className="gba:text-xs gba:text-muted-foreground" data-testid="address-autocomplete-pin-hint">
          {pinHintLabel}
        </p>
      )}
    </div>
  )
}

export default AddressAutocompleteMap
