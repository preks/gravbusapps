// Public API for the reusable address-autocomplete module.
//
// Usage:
//   import { AddressAutocomplete } from '@/business-apps/hr/core/components/address-autocomplete'
//
// For the typical case, only the component export is needed. The service exports
// (getAutocompleteSuggestions, reverseGeocode, mapGeoapifyToFormValues, getMapTileUrl)
// are re-exported so consumers can call Geoapify directly if they need coordinates
// without rendering the full map UI.

export { default as AddressAutocomplete } from './AddressAutocomplete'
export type { AddressAutocompleteProps, AddressAutocompleteFieldNames } from './AddressAutocomplete'
export { DEFAULT_ADDRESS_AUTOCOMPLETE_FIELD_NAMES } from './AddressAutocomplete'

export {
  getAutocompleteSuggestions,
  reverseGeocode,
  mapGeoapifyToFormValues,
  getMapTileUrl
} from './addressAutocompleteService'
export type {
  AddressComponents,
  AddressSuggestion,
  ReverseGeocodeResult,
  MappedFormValues
} from './addressAutocompleteService'
