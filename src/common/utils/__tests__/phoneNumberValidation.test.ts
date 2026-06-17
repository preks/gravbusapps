import {
  buildPhoneNumberWithCountryCode,
  isValidPhoneNumberForCountry,
  isValidPhoneNumberWithMetadata,
  normalizeLocalPhoneNumber,
  normalizePhoneNumber
} from '../validation/phoneNumberValidation'

describe('phoneNumberValidation', () => {
  it('strips formatting and leading zero from local phone numbers', () => {
    expect(normalizeLocalPhoneNumber('0176 123-456')).toBe('176123456')
  })

  it('builds an international number without the local trunk zero', () => {
    expect(buildPhoneNumberWithCountryCode('0176 12345678', 'DE')).toBe('+4917612345678')
  })

  it('normalizes standalone phone numbers before validation', () => {
    expect(normalizePhoneNumber('0176 12345678')).toBe('17612345678')
  })

  it('does not validate local numbers without country metadata', () => {
    expect(isValidPhoneNumberForCountry('0176 12345678', '')).toBe(false)
    expect(isValidPhoneNumberWithMetadata('0176 12345678')).toBe(false)
  })

  it('validates local numbers against the selected country metadata', () => {
    expect(isValidPhoneNumberForCountry('0722 123 456', 'RO')).toBe(true)
    expect(isValidPhoneNumberForCountry('0722 123', 'RO')).toBe(false)
  })

  it('validates international numbers against phone metadata when possible', () => {
    expect(isValidPhoneNumberWithMetadata('+40722123456')).toBe(true)
    expect(isValidPhoneNumberWithMetadata('+40722123')).toBe(false)
  })
})
