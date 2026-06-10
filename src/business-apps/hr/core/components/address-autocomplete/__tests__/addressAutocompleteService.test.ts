/**
 * Unit tests for `mapGeoapifyToFormValues`.
 *
 * These tests pin the catalog-resolution behavior of the address autocomplete
 * service so we don't regress the GeoApify -> form-values mapping. The most
 * important case is German city-states (Berlin, Hamburg, Bremen) where
 * GeoApify often omits the `state`/`state_code` properties because the city
 * IS the state — without a city-name fallback the Region field stays empty
 * and the user cannot submit the address change form.
 */

import { mapGeoapifyToFormValues } from '../addressAutocompleteService'

const germanyCountry = { id: 'Country:v1:DE' }
const usaCountry = { id: 'Country:v1:US' }

const germanRegions = [
  { id: 'Region:v1:DE-BE', alternativeCode: 'BE', code: 'DE-BE', value: 'Berlin', additionalValue2: 'Country:v1:DE' },
  { id: 'Region:v1:DE-HH', alternativeCode: 'HH', code: 'DE-HH', value: 'Hamburg', additionalValue2: 'Country:v1:DE' },
  { id: 'Region:v1:DE-HB', alternativeCode: 'HB', code: 'DE-HB', value: 'Bremen', additionalValue2: 'Country:v1:DE' },
  { id: 'Region:v1:DE-HE', alternativeCode: 'HE', code: 'DE-HE', value: 'Hesse', additionalValue2: 'Country:v1:DE' },
  { id: 'Region:v1:DE-BY', alternativeCode: 'BY', code: 'DE-BY', value: 'Bavaria', additionalValue2: 'Country:v1:DE' }
]

const catalogs = {
  countries: [germanyCountry, usaCountry],
  regions: germanRegions
}

describe('mapGeoapifyToFormValues', () => {
  it('resolves the region via state/state_code when GeoApify provides them (Hesse, DE)', () => {
    const result = mapGeoapifyToFormValues(
      {
        components: {
          line1: 'Bahnhofstraße 1',
          city: 'Frankfurt',
          postalCode: '60329',
          region: 'Hesse',
          regionCode: 'HE',
          countryCode: 'DE',
          countryName: 'Germany'
        },
        lat: 50.107,
        lng: 8.663
      },
      catalogs
    )

    expect(result.countryId).toBe('Country:v1:DE')
    expect(result.regionId).toBe('Region:v1:DE-HE')
  })

  it('resolves Berlin as a region when GeoApify omits state/state_code (city-state fallback)', () => {
    // Reproduces issue dbf5d4a3-48c5-42f9-84c2-753464e570ec:
    // Search "Leipziger Platz 2, Berlin" — Geoapify returns city="Berlin"
    // but no state/state_code, so the form's mandatory Region field stays empty.
    const result = mapGeoapifyToFormValues(
      {
        components: {
          line1: 'Leipziger Platz 2',
          city: 'Berlin',
          postalCode: '10117',
          region: undefined,
          regionCode: undefined,
          county: undefined,
          countyCode: undefined,
          countryCode: 'DE',
          countryName: 'Germany'
        },
        lat: 52.5096,
        lng: 13.3776
      },
      catalogs
    )

    expect(result.countryId).toBe('Country:v1:DE')
    expect(result.regionId).toBe('Region:v1:DE-BE')
  })

  it('resolves Hamburg as a region via city fallback', () => {
    const result = mapGeoapifyToFormValues(
      {
        components: {
          line1: 'Reeperbahn 1',
          city: 'Hamburg',
          postalCode: '20359',
          region: undefined,
          regionCode: undefined,
          countryCode: 'DE',
          countryName: 'Germany'
        },
        lat: 53.55,
        lng: 9.96
      },
      catalogs
    )

    expect(result.regionId).toBe('Region:v1:DE-HH')
  })

  it('does NOT use city fallback when state already resolves a different region', () => {
    // Sanity check: if Geoapify already provides a state, we trust it and never
    // re-resolve from the city — so a German address whose city happens to share
    // a name with another region must not be silently rerouted.
    const result = mapGeoapifyToFormValues(
      {
        components: {
          line1: 'Marienplatz 1',
          city: 'Munich',
          postalCode: '80331',
          region: 'Bavaria',
          regionCode: 'BY',
          countryCode: 'DE',
          countryName: 'Germany'
        },
        lat: 48.137,
        lng: 11.575
      },
      catalogs
    )

    expect(result.regionId).toBe('Region:v1:DE-BY')
  })

  it('returns regionId=null when neither state, county, nor city map to a known region', () => {
    const result = mapGeoapifyToFormValues(
      {
        components: {
          line1: 'Some Street 1',
          city: 'Mariehamn',
          postalCode: '22100',
          countryCode: 'FI',
          countryName: 'Finland'
        },
        lat: 60.097,
        lng: 19.934
      },
      catalogs
    )

    expect(result.countryId).toBeNull()
    expect(result.regionId).toBeNull()
    expect(result.city).toBe('Mariehamn')
  })
})
