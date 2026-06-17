import type { BankAccountFormValues } from './types'

const IBAN_LENGTH_BY_COUNTRY: Record<string, number> = {
  AL: 28,
  AD: 24,
  AT: 20,
  AZ: 28,
  BH: 22,
  BE: 16,
  BA: 20,
  BR: 29,
  BG: 22,
  CR: 22,
  HR: 21,
  CY: 28,
  CZ: 24,
  DK: 18,
  DO: 28,
  EE: 20,
  FO: 18,
  FI: 18,
  FR: 27,
  GE: 22,
  DE: 22,
  GI: 23,
  GR: 27,
  GL: 18,
  GT: 28,
  HU: 28,
  IS: 26,
  IE: 22,
  IL: 23,
  IT: 27,
  JO: 30,
  KZ: 20,
  XK: 20,
  KW: 30,
  LV: 21,
  LB: 28,
  LI: 21,
  LT: 20,
  LU: 20,
  MK: 19,
  MT: 31,
  MR: 27,
  MU: 30,
  MC: 27,
  MD: 24,
  ME: 22,
  NL: 18,
  NO: 15,
  PK: 24,
  PS: 29,
  PL: 28,
  PT: 25,
  QA: 29,
  RO: 24,
  SM: 27,
  SA: 24,
  RS: 22,
  SK: 24,
  SI: 19,
  ES: 24,
  SE: 24,
  CH: 21,
  TN: 24,
  TR: 26,
  AE: 23,
  GB: 22,
  VG: 24
}

export const normalizeBankIdentifier = (value: unknown): string => {
  return String(value ?? '')
    .replace(/[\s-]/g, '')
    .toUpperCase()
}

export const normalizeDigits = (value: unknown): string => {
  return String(value ?? '').replace(/\D/g, '')
}

export const formatIbanForDisplay = (value: unknown): string => {
  return normalizeBankIdentifier(value)
    .replace(/(.{4})/g, '$1 ')
    .trim()
}

export const getCountryCodeFromCatalogId = (countryId?: string | null): string | null => {
  const countryCode =
    String(countryId ?? '')
      .split(':')
      .pop()
      ?.toUpperCase() ?? ''

  return /^[A-Z]{2}$/.test(countryCode) ? countryCode : null
}

const getIbanRemainder = (iban: string): number => {
  const rearranged = `${iban.slice(4)}${iban.slice(0, 4)}`

  return rearranged.split('').reduce((remainder, character) => {
    const numericValue = /[A-Z]/.test(character) ? String(character.charCodeAt(0) - 55) : character

    return numericValue.split('').reduce((innerRemainder, digit) => {
      return (innerRemainder * 10 + Number(digit)) % 97
    }, remainder)
  }, 0)
}

export interface IbanValidationResult {
  isValid: boolean
  message?: string
  warning?: string
}

export const validateIban = (value: unknown, selectedCountryId?: string | null): IbanValidationResult => {
  const iban = normalizeBankIdentifier(value)

  if (!iban) {
    return { isValid: false, message: 'The IBAN field is required. Please enter an IBAN.' }
  }

  if (!/^[A-Z]{2}\d{2}[A-Z0-9]+$/.test(iban)) {
    return { isValid: false, message: 'IBAN must start with a country code and two check digits.' }
  }

  const ibanCountryCode = iban.slice(0, 2)
  const expectedLength = IBAN_LENGTH_BY_COUNTRY[ibanCountryCode]

  if (expectedLength && iban.length !== expectedLength) {
    return {
      isValid: false,
      message: `Expected ${expectedLength} characters for ${ibanCountryCode} IBAN, found ${iban.length}.`
    }
  }

  if (getIbanRemainder(iban) !== 1) {
    return { isValid: false, message: 'IBAN checksum failed.' }
  }

  const selectedCountryCode = getCountryCodeFromCatalogId(selectedCountryId)
  const warning =
    selectedCountryCode && selectedCountryCode !== ibanCountryCode
      ? `Selected country is ${selectedCountryCode}, but IBAN starts with ${ibanCountryCode}.`
      : undefined

  return { isValid: true, warning }
}

export const validateUsRoutingNumber = (value: unknown): boolean => {
  const routingNumber = normalizeDigits(value)

  if (!/^\d{9}$/.test(routingNumber)) {
    return false
  }

  const digits = routingNumber.split('').map(Number)
  const checksum =
    3 * (digits[0] + digits[3] + digits[6]) +
    7 * (digits[1] + digits[4] + digits[7]) +
    (digits[2] + digits[5] + digits[8])

  return checksum % 10 === 0
}

const normalizeBankAccountValues = (values: BankAccountFormValues): BankAccountFormValues => ({
  ...values,
  iban: normalizeBankIdentifier(values.iban),
  swift: normalizeBankIdentifier(values.swift),
  routingNumber: normalizeDigits(values.routingNumber),
  accountNumber: normalizeBankIdentifier(values.accountNumber)
})

export const buildBankAccountPayload = (params: {
  values: any
  existingAccount: any | null
  employeeId: string
}): any => {
  const { existingAccount, employeeId } = params
  const values = normalizeBankAccountValues(params.values)
  const hasExisting = Boolean(existingAccount)
  return hasExisting
    ? {
        event: 'pse_submit',
        employeeId,
        bankAccount: {
          id: existingAccount?.id,
          version: existingAccount?.version,
          employeeId,
          countryRef: values.countryId || '',
          currencyRef: values.currencyId || '',
          bankName: values.bankName || '',
          accountHolder: values.accountHolder || '',
          employeeAddress: values.countryId === 'Country:v1:US' ? values.employeeAddressId || null : null,
          routingNumberType: values.routingNumberTypeId || '',
          routingNumber: values.routingNumber || '',
          accountType: values.accountType || '',
          accountNumber: values.accountNumber || '',
          iban: values.iban || '',
          swift: values.swift || '',
          notes: values.comment || '',
          catalogAccountNumber: '',
          locked: '',
          accountNumberType: ''
        },
        oldBankAccount: {
          id: existingAccount?.id,
          version: existingAccount?.version,
          employeeId,
          countryRef: existingAccount?.country?.id || '',
          currencyRef: existingAccount?.currency?.id || '',
          bankName: existingAccount?.bankName || '',
          accountHolder: existingAccount?.accountHolder || '',
          employeeAddress: existingAccount?.employeeAddressId || null,
          routingNumberType: existingAccount?.routingNumberType || '',
          routingNumber: existingAccount?.routingNumber || '',
          accountType: existingAccount?.accountType || '',
          accountNumber: existingAccount?.accountNumber || '',
          iban: existingAccount?.iban || '',
          swift: existingAccount?.swift || '',
          notes: existingAccount?.notes || '',
          catalogAccountNumber: '',
          locked: '',
          accountNumberType: existingAccount?.accountNumberType || ''
        }
      }
    : {
        event: 'pse_submit',
        employeeId,
        bankAccount: {
          employeeId,
          countryRef: values.countryId || '',
          currencyRef: values.currencyId || '',
          bankName: values.bankName || '',
          accountHolder: values.accountHolder || '',
          employeeAddress: values.countryId === 'Country:v1:US' ? values.employeeAddressId || null : null,
          routingNumberType: values.routingNumberTypeId || '',
          routingNumber: values.routingNumber || '',
          accountType: values.accountType || '',
          accountNumber: values.accountNumber || '',
          iban: values.iban || '',
          swift: values.swift || '',
          notes: values.comment || '',
          catalogAccountNumber: '',
          locked: '',
          accountNumberType: ''
        },
        oldBankAccount: {}
      }
}

export const isUnchangedExistingBankAccount = (form: any, initialFormValues: any | null, isUS: boolean): boolean => {
  if (!initialFormValues) return false
  try {
    const v = normalizeBankAccountValues(form.getValues() as BankAccountFormValues)
    const initialValues = normalizeBankAccountValues(initialFormValues as BankAccountFormValues)
    const normalizeBase = (x: any) => ({
      countryId: x?.countryId || null,
      currencyId: x?.currencyId || null,
      bankName: String(x?.bankName || ''),
      accountType: String(x?.accountType || ''),
      accountHolder: String(x?.accountHolder || ''),
      comment: String(x?.comment || '')
    })
    const current = isUS
      ? {
          ...normalizeBase(v),
          routingNumberTypeId: v?.routingNumberTypeId || null,
          accountNumber: String(v?.accountNumber || ''),
          routingNumber: String(v?.routingNumber || ''),
          employeeAddressId: v?.employeeAddressId || null
        }
      : {
          ...normalizeBase(v),
          iban: String(v?.iban || ''),
          swift: String(v?.swift || '')
        }
    const initial = isUS
      ? {
          ...normalizeBase(initialValues),
          routingNumberTypeId: initialValues?.routingNumberTypeId || null,
          accountNumber: String(initialValues?.accountNumber || ''),
          routingNumber: String(initialValues?.routingNumber || ''),
          employeeAddressId: initialValues?.employeeAddressId || null
        }
      : {
          ...normalizeBase(initialValues),
          iban: String(initialValues?.iban || ''),
          swift: String(initialValues?.swift || '')
        }
    return JSON.stringify(current) === JSON.stringify(initial)
  } catch {
    return false
  }
}
