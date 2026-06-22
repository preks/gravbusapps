import {
  buildBankAccountPayload,
  filterRoutingNumberTypesByCountry,
  formatIbanForDisplay,
  isUnchangedExistingBankAccount,
  normalizeBankIdentifier,
  validateIban,
  validateUsRoutingNumber
} from './utils'

describe('change bank account utils', () => {
  it('formats IBAN values in groups of four', () => {
    expect(formatIbanForDisplay('DE55555555556661166')).toBe('DE55 5555 5555 6661 166')
  })

  it('normalizes bank identifiers', () => {
    expect(normalizeBankIdentifier(' de55 5555-5555 6661 166 ')).toBe('DE55555555556661166')
  })

  it('validates known valid IBAN values', () => {
    expect(validateIban('DE89 3704 0044 0532 0130 00', 'Country:v1:DE')).toEqual({ isValid: true })
  })

  it('rejects IBANs that do not match the selected country', () => {
    expect(validateIban('DE89 3704 0044 0532 0130 00', 'Country:v1:RO')).toEqual({
      isValid: false,
      message: 'Selected country is RO, but IBAN starts with DE.'
    })
  })

  it('prioritizes country mismatch before length and checksum validation', () => {
    expect(validateIban('DE55 5555', 'Country:v1:RO')).toEqual({
      isValid: false,
      message: 'Selected country is RO, but IBAN starts with DE.'
    })
  })

  it('rejects invalid IBAN lengths before checksum validation', () => {
    expect(validateIban('DE55555555556661166', 'Country:v1:DE')).toEqual({
      isValid: false,
      message: 'Expected 22 characters for DE IBAN, found 19.'
    })
  })

  it('validates US ABA routing numbers', () => {
    expect(validateUsRoutingNumber('021000021')).toBe(true)
    expect(validateUsRoutingNumber('021000022')).toBe(false)
  })

  it('filters routing number types by selected country parent entry', () => {
    const routingNumberTypes = [
      { id: 'BankRoutingNumberType:v1:ABA', value: 'ABA', parentEntryId: 'Country:v1:US' },
      { id: 'BankRoutingNumberType:v1:BSB', value: 'BSB', parentEntryId: 'Country:v1:AU' },
      { id: 'BankRoutingNumberType:v1:ACH', value: 'ACH', parentEntryId: 'Country:v1:US' }
    ]

    expect(filterRoutingNumberTypesByCountry(routingNumberTypes, 'Country:v1:US')).toEqual([
      routingNumberTypes[0],
      routingNumberTypes[2]
    ])
  })

  it('returns no routing number types when no country is selected', () => {
    expect(
      filterRoutingNumberTypesByCountry(
        [{ id: 'BankRoutingNumberType:v1:ABA', value: 'ABA', parentEntryId: 'Country:v1:US' }],
        null
      )
    ).toEqual([])
  })

  it('excludes routing number types without a matching country parent entry', () => {
    const routingNumberTypes = [
      { id: 'BankRoutingNumberType:v1:ABA', value: 'ABA', parentEntryId: 'Country:v1:US' },
      { id: 'BankRoutingNumberType:v1:LEGACY', value: 'Legacy' }
    ]

    expect(filterRoutingNumberTypesByCountry(routingNumberTypes, 'Country:v1:DE')).toEqual([])
  })

  it('submits normalized bank account values', () => {
    const payload = buildBankAccountPayload({
      values: {
        countryId: 'Country:v1:DE',
        currencyId: 'Currency:v1:EUR',
        bankName: 'Test Bank',
        accountHolder: 'Ada Lovelace',
        accountType: 'CHECKINGS',
        iban: 'DE89 3704 0044 0532 0130 00',
        swift: ' test de ff ',
        routingNumber: '021-000-021',
        accountNumber: ' 123 456 '
      },
      existingAccount: null,
      employeeId: 'employee-1'
    })

    expect(payload.bankAccount.iban).toBe('DE89370400440532013000')
    expect(payload.bankAccount.swift).toBe('TESTDEFF')
    expect(payload.bankAccount.routingNumber).toBe('021000021')
    expect(payload.bankAccount.accountNumber).toBe('123456')
  })

  it('preserves alphanumeric routing numbers for non-US routing countries', () => {
    const payload = buildBankAccountPayload({
      values: {
        countryId: 'Country:v1:IN',
        currencyId: 'Currency:v1:INR',
        bankName: 'Test Bank',
        accountHolder: 'Ada Lovelace',
        accountType: 'CHECKINGS',
        routingNumberTypeId: 'BankRoutingNumberType:v1:IFSC',
        routingNumber: ' hdfc 000 1234 ',
        accountNumber: ' 123 456 '
      },
      existingAccount: null,
      employeeId: 'employee-1'
    })

    expect(payload.bankAccount.routingNumber).toBe('HDFC0001234')
    expect(payload.bankAccount.accountNumber).toBe('123456')
  })

  it('ignores identifier spacing when checking if an existing account is unchanged', () => {
    const form = {
      getValues: () => ({
        countryId: 'Country:v1:DE',
        currencyId: 'Currency:v1:EUR',
        bankName: 'Test Bank',
        accountHolder: 'Ada Lovelace',
        accountType: 'CHECKINGS',
        comment: '',
        iban: 'DE89 3704 0044 0532 0130 00',
        swift: 'TEST DE FF'
      })
    }

    expect(
      isUnchangedExistingBankAccount(
        form,
        {
          countryId: 'Country:v1:DE',
          currencyId: 'Currency:v1:EUR',
          bankName: 'Test Bank',
          accountHolder: 'Ada Lovelace',
          accountType: 'CHECKINGS',
          comment: '',
          iban: 'DE89370400440532013000',
          swift: 'TESTDEFF'
        },
        false,
        false
      )
    ).toBe(true)
  })

  it('checks routing fields for non-US countries with routing number types', () => {
    const form = {
      getValues: () => ({
        countryId: 'Country:v1:IN',
        currencyId: 'Currency:v1:INR',
        bankName: 'Test Bank',
        accountHolder: 'Ada Lovelace',
        accountType: 'CHECKINGS',
        comment: '',
        routingNumberTypeId: 'BankRoutingNumberType:v1:IFSC',
        accountNumber: ' 123 456 ',
        routingNumber: ' hdfc 000 1234 '
      })
    }

    expect(
      isUnchangedExistingBankAccount(
        form,
        {
          countryId: 'Country:v1:IN',
          currencyId: 'Currency:v1:INR',
          bankName: 'Test Bank',
          accountHolder: 'Ada Lovelace',
          accountType: 'CHECKINGS',
          comment: '',
          routingNumberTypeId: 'BankRoutingNumberType:v1:IFSC',
          accountNumber: '123456',
          routingNumber: 'HDFC0001234'
        },
        true,
        false
      )
    ).toBe(true)
  })
})
