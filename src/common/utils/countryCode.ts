import type { CountryCode } from 'libphonenumber-js'

const COUNTRY_CODE_PATTERN = /^[A-Z]{2}$/

export const toCountryCode = (value: unknown): CountryCode | '' => {
  if (typeof value !== 'string') {
    return ''
  }

  const countryCode = value.trim().toUpperCase()
  return COUNTRY_CODE_PATTERN.test(countryCode) ? (countryCode as CountryCode) : ''
}

export const countryCodeFromCatalogRef = (countryRef: unknown): CountryCode | '' => {
  if (typeof countryRef !== 'string') {
    return ''
  }

  return toCountryCode(countryRef.split(':').pop())
}
