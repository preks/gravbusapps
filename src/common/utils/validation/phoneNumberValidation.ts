import { getCountryCallingCode, isValidPhoneNumber, type CountryCode } from 'libphonenumber-js'

export const normalizeLocalPhoneNumber = (value: string): string => {
  return value.replace(/\D/g, '').replace(/^0+/, '')
}

export const normalizePhoneNumber = (value: string): string => {
  const trimmed = value.trim()
  const hasInternationalPrefix = trimmed.startsWith('+')
  const digits = trimmed.replace(/\D/g, '')
  const normalizedDigits = hasInternationalPrefix ? digits : digits.replace(/^0+/, '')

  if (!normalizedDigits) {
    return ''
  }

  return hasInternationalPrefix ? `+${normalizedDigits}` : normalizedDigits
}

export const buildPhoneNumberWithCallingCode = (localNumber: string, callingCode?: string | number): string => {
  const normalizedLocalNumber = normalizeLocalPhoneNumber(localNumber)

  if (!normalizedLocalNumber) {
    return ''
  }

  if (!callingCode) {
    return normalizedLocalNumber
  }

  return `+${callingCode}${normalizedLocalNumber}`
}

export const buildPhoneNumberWithCountryCode = (localNumber: string, countryCode: CountryCode | ''): string => {
  if (!countryCode) {
    return ''
  }

  try {
    return buildPhoneNumberWithCallingCode(localNumber, getCountryCallingCode(countryCode))
  } catch {
    return ''
  }
}

export const isValidPhoneNumberForCountry = (localNumber: string, countryCode: CountryCode | ''): boolean => {
  const phoneNumber = buildPhoneNumberWithCountryCode(localNumber, countryCode)

  if (!phoneNumber) {
    return false
  }

  try {
    return isValidPhoneNumber(phoneNumber, countryCode)
  } catch {
    return false
  }
}

export const isValidPhoneNumberWithMetadata = (value: string): boolean => {
  const phoneNumber = normalizePhoneNumber(value)

  if (!phoneNumber.startsWith('+')) {
    return false
  }

  try {
    return isValidPhoneNumber(phoneNumber)
  } catch {
    return false
  }
}
