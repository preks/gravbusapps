import React, { useMemo, useEffect, useState, useRef } from 'react'
import { Input } from '@newwork/nw-design-system'
import { getTranslationFromI18nKeyAndLabel, getCurrentActiveUserLocale } from '@/common/utils/windowUtils'
import {
  parsePhoneNumberFromString,
  getCountryCallingCode,
  getCountries,
  type CountryCode,
  type CountryCallingCode
} from 'libphonenumber-js'
import { normalizeLocalPhoneNumber } from '@/common/utils/validation/phoneNumberValidation'
import { PhonePrefixCombobox } from '@/common/components/phone-prefix-combobox/PhonePrefixCombobox'

interface Country {
  code: CountryCode
  callingCode: CountryCallingCode
  name: string
}

interface PhoneInputProps {
  value: string
  onChange: (fullNumber: string) => void
  onValidationValueChange?: (localNumber: string, countryCode: CountryCode | '') => void
  onTouched?: () => void
  onBlur?: () => void
  error?: string
  touched?: boolean
  defaultCountryCode?: CountryCode | ''
  'data-testid'?: string
}

export const PhoneInput: React.FC<PhoneInputProps> = ({
  value,
  onChange,
  onValidationValueChange,
  onTouched,
  onBlur,
  error,
  touched,
  defaultCountryCode = '',
  'data-testid': dataTestId
}) => {
  const [selectedCountryCode, setSelectedCountryCode] = useState<CountryCode | ''>('')
  const [localNumber, setLocalNumber] = useState<string>('')
  const previousCountryRef = useRef<CountryCode | ''>('')
  const isManualCountryChangeRef = useRef<boolean>(false)
  const skipNextParseRef = useRef<boolean>(false)

  const countries = useMemo(() => {
    const countryList = getCountries()
    const locale = getCurrentActiveUserLocale() || 'en'
    const displayNames = new Intl.DisplayNames([locale], { type: 'region' })

    const mapped = countryList
      .map(country => {
        try {
          const callingCode = getCountryCallingCode(country)
          const countryName = displayNames.of(country.toUpperCase()) || country
          return {
            code: country,
            callingCode,
            name: countryName
          }
        } catch {
          return null
        }
      })
      .filter((c): c is Country => c !== null)

    return mapped.sort((a, b) => a.name.localeCompare(b.name, locale))
  }, [])

  useEffect(() => {
    if (skipNextParseRef.current) {
      skipNextParseRef.current = false
      return
    }

    const defaultCountry = countries.some(country => country.code === defaultCountryCode) ? defaultCountryCode : ''

    if (!value) {
      setSelectedCountryCode(defaultCountry)
      setLocalNumber('')
      return
    }

    if (countries.length === 0) {
      return
    }

    const parsed = parsePhoneNumberFromString(value)
    if (parsed && parsed.country) {
      setSelectedCountryCode(parsed.country)
      setLocalNumber(parsed.nationalNumber)
      return
    }

    if (value.startsWith('+')) {
      const valueWithoutPlus = value.substring(1).trim()

      const sortedCountries = [...countries].sort((a, b) => {
        const codeA = String(a.callingCode).length
        const codeB = String(b.callingCode).length
        return codeB - codeA
      })

      for (const country of sortedCountries) {
        const callingCode = String(country.callingCode)
        if (valueWithoutPlus.startsWith(callingCode)) {
          const remaining = valueWithoutPlus.substring(callingCode.length).trim()
          setSelectedCountryCode(country.code)
          setLocalNumber(remaining)
          return
        }
      }
    }

    setLocalNumber(value)
  }, [value, countries, defaultCountryCode])

  useEffect(() => {
    if (
      selectedCountryCode &&
      previousCountryRef.current &&
      selectedCountryCode !== previousCountryRef.current &&
      isManualCountryChangeRef.current
    ) {
      setLocalNumber('')
      skipNextParseRef.current = true
    }
    previousCountryRef.current = selectedCountryCode
    isManualCountryChangeRef.current = false
  }, [selectedCountryCode])

  useEffect(() => {
    onValidationValueChange?.(localNumber, selectedCountryCode)
  }, [localNumber, selectedCountryCode, onValidationValueChange])

  const handleCountryChange = (countryCode: CountryCode) => {
    isManualCountryChangeRef.current = true
    setSelectedCountryCode(countryCode)
    onTouched?.()
  }

  const handleLocalNumberChange = (number: string) => {
    const cleanNumber = normalizeLocalPhoneNumber(number)
    setLocalNumber(cleanNumber)
    onTouched?.()

    skipNextParseRef.current = true

    if (selectedCountryCode && cleanNumber) {
      const callingCode = getCountryCallingCode(selectedCountryCode)
      onChange(`+${callingCode}${cleanNumber}`)
    } else if (cleanNumber) {
      onChange(cleanNumber)
    } else {
      onChange('')
    }
  }

  return (
    <div className="gba:w-full gba:space-y-2">
      <div className="gba:grid gba:min-w-0 gba:w-full gba:grid-cols-5 gba:items-center gba:gap-2">
        <div className="gba:col-span-2 gba:min-w-0 gba:w-full">
          <PhonePrefixCombobox
            value={selectedCountryCode || ''}
            countries={countries}
            onValueChange={handleCountryChange}
            placeholder={getTranslationFromI18nKeyAndLabel('lowcoder:communication_form.prefix', 'Prefix')}
            selectedLabelVariant="code"
            className="gba:w-full"
            data-testid={`${dataTestId}-countryCode`}
          />
        </div>
        <div className="gba:col-span-3 gba:min-w-0">
          <Input
            placeholder={getTranslationFromI18nKeyAndLabel(
              'lowcoder:relationship_form.phone_number_placeholder',
              'Enter Phone Number'
            )}
            value={localNumber}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleLocalNumberChange(e.target.value)}
            onBlur={onBlur}
            data-testid={dataTestId}
            className="gba:w-full"
          />
        </div>
      </div>
      {touched && error && (
        <div className="gba:mt-1 gba:text-destructive" data-testid={`${dataTestId}-error`}>
          {error}
        </div>
      )}
    </div>
  )
}
