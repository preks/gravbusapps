/**
 * Centralized country and validation logic for Change Tax Details.
 * German-specific rules run only when isEmployeeInGermany (country code DE).
 * Romanian CNP validation runs when isEmployeeInRomania (country code RO).
 */

export const COUNTRY_CODE_GERMANY = 'DE'
export const COUNTRY_CODE_ROMANIA = 'RO'

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

/**
 * True when the employee's working-condition country is Romania (code "RO").
 */
export function isEmployeeInRomania(countryCode: string | null | undefined): boolean {
  return (
    String(countryCode || '')
      .trim()
      .toUpperCase() === COUNTRY_CODE_ROMANIA
  )
}

/**
 * Validates Romanian CNP (Cod Numeric Personal) - 13 digits with check digit.
 */
export function validateCNP(cnp: string): boolean {
  if (!/^\d{13}$/.test(cnp)) return false
  const controlKey = '279146358279'
  let sum = 0
  for (let i = 0; i < 12; i++) {
    sum += Number.parseInt(cnp[i], 10) * Number.parseInt(controlKey[i], 10)
  }
  let controlDigit = sum % 11
  if (controlDigit === 10) controlDigit = 1
  return controlDigit === Number.parseInt(cnp[12], 10)
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
    const n = Number.parseInt(digits[i], 10)
    let v = (summand + n) % 10
    if (v === 0) v = 10
    summand = (v * 2) % 11
  }
  let check = 11 - summand
  if (check === 10) check = 0
  return check === Number.parseInt(digits[10], 10)
}

export type GetMessage = (key: string, fallback: string) => string
export interface GermanSsnValidationContext {
  isGermany?: boolean
  isRomania?: boolean
  employeeGender?: string | null
  employeeBirthDate?: string | null
  employeeBirthName?: string | null
  employeeLastName?: string | null
}

/**
 * Tax Number (Steuernummer): when Germany, accept state schema (10/11 digits, often with slashes)
 * or unified federal 13-digit schema. See German state-specific vs. 13-stellige Bundesschema.
 */
export function validateTaxNumber(value: string, isGermany: boolean, getMessage: GetMessage): string | true {
  const raw = String(value || '').trim()
  if (!raw) return true
  if (!isGermany) return true
  const digits = raw.replace(/\D/g, '')
  const validLengths = [10, 11, 13]
  if (!validLengths.includes(digits.length)) {
    return getMessage(
      'invalid-tax-number-text',
      'Please enter a valid German Tax Number (10, 11 or 13 digits, e.g. 313/876/56432) or leave empty.'
    )
  }
  return true
}

/** Tax ID: German 11-digit + check digit only when isGermany. Returns error string or true. */
export function validateTaxId(value: string, isGermany: boolean, getMessage: GetMessage): string | true {
  const digits = String(value || '').replace(/\D/g, '')
  if (!isGermany) return true
  if (digits.length !== 11) {
    return getMessage(
      'invalid-tax-identification-number-text',
      'Please enter a valid 11-digit German Tax Identification Number.'
    )
  }
  if (!isValidGermanTaxIdCheckDigit(digits)) {
    return getMessage(
      'invalid-tax-identification-number-text',
      'Please enter a valid 11-digit German Tax Identification Number.'
    )
  }
  return true
}

const SSN_INVALID_MSG_KEY = 'invalid-social-security-number-text'
const SSN_INVALID_MSG_FALLBACK = 'Please enter a valid German pension insurance number (e.g., 89 010299 B 123).'
const SSN_BIRTH_DATE_MISSING_MSG_KEY = 'ssn-birth-date-missing-text'
const SSN_BIRTH_DATE_MISSING_MSG_FALLBACK =
  'Cannot validate Social Security Number: this employee has no birth date stored.'
const SSN_BIRTH_DATE_MISMATCH_MSG_KEY = 'ssn-birth-date-mismatch-text'
const SSN_BIRTH_DATE_MISMATCH_MSG_FALLBACK =
  "Social Security Number birth date does not match the employee's stored birth date."
const SSN_BIRTH_NAME_MISSING_MSG_KEY = 'ssn-birth-name-missing-text'
const SSN_BIRTH_NAME_MISSING_MSG_FALLBACK =
  'Cannot validate Social Security Number: this employee has no birth name or last name stored.'
const SSN_BIRTH_NAME_MISMATCH_MSG_KEY = 'ssn-birth-name-mismatch-text'
const SSN_BIRTH_NAME_MISMATCH_MSG_FALLBACK =
  "Social Security Number birth-name letter does not match the employee's birth name (or last name fallback)."
const SSN_CHECK_DIGIT_MSG_KEY = 'ssn-check-digit-invalid-text'
const SSN_CHECK_DIGIT_MSG_FALLBACK = 'Social Security Number check digit is invalid.'
const CNP_INVALID_MSG_KEY = 'invalid-cnp-text'
const CNP_INVALID_MSG_FALLBACK = 'Please enter a valid 13-digit Romanian CNP (Cod Numeric Personal).'

function toDdMmYy(value: string): string | null {
  const v = String(value || '').trim()
  if (!v) return null

  const isoMatch = /^(\d{4})-(\d{2})-(\d{2})/.exec(v)
  if (isoMatch) {
    const [, yyyy, mm, dd] = isoMatch
    return `${dd}${mm}${yyyy.slice(2)}`
  }

  const deMatch = /^(\d{2})[./-](\d{2})[./-](\d{4})$/.exec(v)
  if (deMatch) {
    const [, dd, mm, yyyy] = deMatch
    return `${dd}${mm}${yyyy.slice(2)}`
  }

  return null
}

function getFirstSsnLetter(value: string | null | undefined): string | null {
  const raw = String(value || '').trim()
  if (!raw) return null

  const normalized = raw
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()

  const m = /[A-Z]/.exec(normalized)
  return m?.[0] ?? null
}

function calculateGermanSsnCheckDigit(compact: string): number | null {
  const birthLetter = compact[8]?.toUpperCase()
  if (!birthLetter || !/^[A-Z]$/.test(birthLetter)) return null

  const codePoint = birthLetter.codePointAt(0)
  if (codePoint == null) return null
  const letterCode = String(codePoint - 64).padStart(2, '0') // A=01 ... Z=26
  const expanded = `${compact.substring(0, 8)}${letterCode}${compact.substring(9, 11)}`
  if (!/^\d{12}$/.test(expanded)) return null

  const digits = expanded.split('').map(d => Number.parseInt(d, 10))
  const weights = [2, 1, 2, 1, 2, 1, 2, 1, 2, 1, 2, 1]
  let total = 0

  for (let i = 0; i < digits.length; i++) {
    const product = digits[i] * weights[i]
    total += Math.floor(product / 10) + (product % 10)
  }

  return total % 10
}

function validateSsnBirthDate(
  compact: string,
  getMessage: GetMessage,
  context?: GermanSsnValidationContext
): string | true {
  const storedBirthDate = toDdMmYy(String(context?.employeeBirthDate || ''))
  if (!storedBirthDate) {
    return getMessage(SSN_BIRTH_DATE_MISSING_MSG_KEY, SSN_BIRTH_DATE_MISSING_MSG_FALLBACK)
  }

  const ssnBirthDate = compact.substring(2, 8)
  return storedBirthDate === ssnBirthDate
    ? true
    : getMessage(SSN_BIRTH_DATE_MISMATCH_MSG_KEY, SSN_BIRTH_DATE_MISMATCH_MSG_FALLBACK)
}

function validateSsnBirthName(
  compact: string,
  getMessage: GetMessage,
  context?: GermanSsnValidationContext
): string | true {
  const ssnBirthNameLetter = compact[8]?.toUpperCase()
  const storedBirthNameLetter = getFirstSsnLetter(context?.employeeBirthName)
  const storedLastNameLetter = getFirstSsnLetter(context?.employeeLastName)
  const expectedLetter = storedBirthNameLetter || storedLastNameLetter

  if (!expectedLetter) {
    return getMessage(SSN_BIRTH_NAME_MISSING_MSG_KEY, SSN_BIRTH_NAME_MISSING_MSG_FALLBACK)
  }

  return ssnBirthNameLetter === expectedLetter
    ? true
    : getMessage(SSN_BIRTH_NAME_MISMATCH_MSG_KEY, SSN_BIRTH_NAME_MISMATCH_MSG_FALLBACK)
}

function validateSsnCheckDigit(compact: string, getMessage: GetMessage): string | true {
  const expectedCheckDigit = calculateGermanSsnCheckDigit(compact)
  const providedCheckDigit = Number.parseInt(compact[11], 10)
  if (expectedCheckDigit == null || Number.isNaN(providedCheckDigit) || expectedCheckDigit !== providedCheckDigit) {
    return getMessage(SSN_CHECK_DIGIT_MSG_KEY, SSN_CHECK_DIGIT_MSG_FALLBACK)
  }
  return true
}

function validateSsnGenericRules(
  compact: string,
  getMessage: GetMessage,
  context?: GermanSsnValidationContext
): string | true {
  const region = compact.substring(0, 2)
  if (!DE_SSN_VALID_REGION_CODES.has(region)) return getMessage(SSN_INVALID_MSG_KEY, SSN_INVALID_MSG_FALLBACK)

  const dd = Number.parseInt(compact.substring(2, 4), 10)
  const mm = Number.parseInt(compact.substring(4, 6), 10)
  if (dd < 1 || dd > 31 || mm < 1 || mm > 12) {
    return getMessage(SSN_INVALID_MSG_KEY, SSN_INVALID_MSG_FALLBACK)
  }

  if (!context?.employeeGender) return true

  const genderDigits = Number.parseInt(compact.substring(9, 11), 10)
  const validMale = genderDigits >= 0 && genderDigits <= 49
  const validFemale = genderDigits >= 50 && genderDigits <= 99
  if (context.employeeGender === 'male' && !validMale) {
    return getMessage(SSN_INVALID_MSG_KEY, SSN_INVALID_MSG_FALLBACK)
  }
  if (context.employeeGender !== 'male' && !validFemale) {
    return getMessage(SSN_INVALID_MSG_KEY, SSN_INVALID_MSG_FALLBACK)
  }
  return true
}

function validateGermanSSN(
  compact: string,
  getMessage: GetMessage,
  context?: GermanSsnValidationContext
): string | true {
  if (!/^\d{8}[A-Za-z]\d{3}$/.test(compact)) return getMessage(SSN_INVALID_MSG_KEY, SSN_INVALID_MSG_FALLBACK)
  const birthDateValidation = validateSsnBirthDate(compact, getMessage, context)
  if (birthDateValidation !== true) return birthDateValidation

  const birthNameValidation = validateSsnBirthName(compact, getMessage, context)
  if (birthNameValidation !== true) return birthNameValidation

  const checkDigitValidation = validateSsnCheckDigit(compact, getMessage)
  if (checkDigitValidation !== true) return checkDigitValidation

  return validateSsnGenericRules(compact, getMessage, context)
}

/** Social Security Number: German format when DE, Romanian CNP when RO. Returns error string or true. */
export function validateSocialSecurityNumber(
  value: string,
  getMessage: GetMessage,
  context?: GermanSsnValidationContext
): string | true {
  const raw = String(value || '').trim()
  const isRomania = context?.isRomania === true
  const isGermany = context?.isGermany === true
  if (isRomania) {
    const digits = raw.replace(/\s+/g, '')
    if (!digits) return true
    if (!validateCNP(digits)) return getMessage(CNP_INVALID_MSG_KEY, CNP_INVALID_MSG_FALLBACK)
    return true
  }
  if (!isGermany) return true
  const compact = raw.replace(/\s+/g, '')
  return validateGermanSSN(compact, getMessage, context)
}
