/**
 * Centralized country and validation logic for Change Tax Details.
 * German-specific rules run only when isEmployeeInGermany (country code DE).
 */

export const COUNTRY_CODE_GERMANY = 'DE'

/**
 * True when the employee's working-condition country is Germany (code "DE").
 */
export function isEmployeeInGermany(countryCode: string | null | undefined): boolean {
  return (
    String(countryCode || '')
      .trim()
      .toUpperCase() === COUNTRY_CODE_GERMANY
  )
}

/** Valid German pension insurance (Rentenversicherung) region codes: first two digits of SSN. */
export const DE_SSN_VALID_REGION_CODES = new Set<string>([
  '02',
  '03',
  '04',
  '08',
  '09',
  '10',
  '11',
  '12',
  '13',
  '14',
  '15',
  '16',
  '17',
  '18',
  '19',
  '20',
  '21',
  '23',
  '24',
  '25',
  '26',
  '28',
  '29',
  '38',
  '39',
  '40',
  '80',
  '81',
  '82',
  '89',
  ...Array.from({ length: 38 }, (_, i) => String(42 + i)) // 42–79
])

/** Validates German Tax ID (Steuerliche Identifikationsnummer) check digit (11th digit). */
export function isValidGermanTaxIdCheckDigit(digits: string): boolean {
  if (digits.length !== 11) return false
  let summand = 10
  for (let i = 0; i < 10; i++) {
    const n = parseInt(digits[i], 10)
    let v = (summand + n) % 10
    if (v === 0) v = 10
    summand = (v * 2) % 11
  }
  let check = 11 - summand
  if (check === 10) check = 0
  return check === parseInt(digits[10], 10)
}

export type GetMessage = (key: string, fallback: string) => string

/** Tax Number: German 13-digit validation only when isGermany. Returns error string or true. */
export function validateTaxNumber(value: string, isGermany: boolean, getMessage: GetMessage): string | true {
  const raw = String(value || '').trim()
  if (!raw) return true
  if (!isGermany) return true
  const digits = raw.replace(/[^0-9]/g, '')
  if (digits.length !== 13) {
    return getMessage(
      'lowcoder:change_tax_information.invalid_tax_number_text',
      'Please enter a valid 13-digit German Tax Number or leave empty.'
    )
  }
  return true
}

/** Tax ID: German 11-digit + check digit only when isGermany. Returns error string or true. */
export function validateTaxId(value: string, isGermany: boolean, getMessage: GetMessage): string | true {
  const digits = String(value || '').replace(/[^0-9]/g, '')
  if (!isGermany) return true
  if (digits.length !== 11) {
    return getMessage(
      'lowcoder:change_tax_information.invalid_tax_identification_number_text',
      'Please enter a valid 11-digit German Tax Identification Number.'
    )
  }
  if (!isValidGermanTaxIdCheckDigit(digits)) {
    return getMessage(
      'lowcoder:change_tax_information.invalid_tax_identification_number_text',
      'Please enter a valid 11-digit German Tax Identification Number.'
    )
  }
  return true
}

const SSN_INVALID_MSG_KEY = 'lowcoder:change_tax_information.invalid_social_security_number_text'
const SSN_INVALID_MSG_FALLBACK = 'Please enter a valid German pension insurance number (e.g., 89 010299 B 123).'

/** Social Security Number: German format (region, date, gender) only when isGermany. Returns error string or true. */
export function validateSocialSecurityNumber(
  value: string,
  isGermany: boolean,
  employeeGender: string | null,
  getMessage: GetMessage
): string | true {
  const raw = String(value || '').trim()
  if (!isGermany) return true
  const compact = raw.replace(/\s+/g, '')
  const basic = /^[0-9]{8}[A-Za-z][0-9]{3}$/.test(compact)
  if (!basic) return getMessage(SSN_INVALID_MSG_KEY, SSN_INVALID_MSG_FALLBACK)
  const region = compact.substring(0, 2)
  if (!DE_SSN_VALID_REGION_CODES.has(region)) return getMessage(SSN_INVALID_MSG_KEY, SSN_INVALID_MSG_FALLBACK)
  const dd = parseInt(compact.substring(2, 4), 10)
  const mm = parseInt(compact.substring(4, 6), 10)
  if (!(dd >= 1 && dd <= 31) || !(mm >= 1 && mm <= 12)) {
    return getMessage(SSN_INVALID_MSG_KEY, SSN_INVALID_MSG_FALLBACK)
  }
  if (employeeGender) {
    const genderDigits = parseInt(compact.substring(9, 11), 10)
    if (employeeGender === 'male') {
      if (!(genderDigits >= 0 && genderDigits <= 49)) return getMessage(SSN_INVALID_MSG_KEY, SSN_INVALID_MSG_FALLBACK)
    } else {
      if (!(genderDigits >= 50 && genderDigits <= 99)) return getMessage(SSN_INVALID_MSG_KEY, SSN_INVALID_MSG_FALLBACK)
    }
  }
  return true
}
