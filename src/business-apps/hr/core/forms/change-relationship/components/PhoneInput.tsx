import React, { useMemo, useEffect, useState, useRef } from 'react'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem, Input } from '@newwork/nw-design-system'
import { getTranslationFromI18nKeyAndLabel, getCurrentActiveUserLocale } from '@/common/utils/windowUtils'
import {
  parseNumber,
  getCountryCallingCode,
  getCountries,
  type CountryCode,
  type CountryCallingCode
} from 'libphonenumber-js'

interface Country {
  code: CountryCode
  callingCode: CountryCallingCode
  name: string
}

interface PhoneInputProps {
  value: string
  onChange: (fullNumber: string) => void
  onBlur?: () => void
  error?: string
  touched?: boolean
  'data-testid'?: string
}

/**
 * Phone input component with country code selector.
 * Parses the full phone number and displays it as country selector + local number.
 */
export const PhoneInput: React.FC<PhoneInputProps> = ({
  value,
  onChange,
  onBlur,
  error,
  touched,
  'data-testid': dataTestId
}) => {
  const [selectedCountryCode, setSelectedCountryCode] = useState<CountryCode | ''>('')
  const [localNumber, setLocalNumber] = useState<string>('')
  const previousCountryRef = useRef<CountryCode | ''>('')
  const isManualCountryChangeRef = useRef<boolean>(false)

  // Build countries list
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

  // Parse the incoming value into country code and local number
  useEffect(() => {
    // Clear internal state when value is empty
    if (!value) {
      setSelectedCountryCode('')
      setLocalNumber('')
      return
    }

    if (countries.length === 0) {
      return
    }

    // Try to parse with libphonenumber-js first
    try {
      const parsed = parseNumber(value)
      if (parsed && 'country' in parsed && parsed.country) {
        setSelectedCountryCode(parsed.country)
        if ('nationalNumber' in parsed && typeof parsed.nationalNumber === 'string') {
          setLocalNumber(parsed.nationalNumber)
        } else {
          const callingCode = getCountryCallingCode(parsed.country)
          const numberWithoutCode = value.replace(`+${callingCode}`, '').trim()
          setLocalNumber(numberWithoutCode)
        }
        return
      }
    } catch {
      // Continue with manual parsing
    }

    // Manual parsing for values starting with +
    if (value.startsWith('+')) {
      const valueWithoutPlus = value.substring(1).trim()

      // Sort countries by calling code length (longest first) to match most specific code
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

    // Fallback: just set the value as local number
    setLocalNumber(value)
  }, [value, countries])

  // Clear local number when country changes manually (not from parsing value)
  useEffect(() => {
    if (
      selectedCountryCode &&
      previousCountryRef.current &&
      selectedCountryCode !== previousCountryRef.current &&
      isManualCountryChangeRef.current
    ) {
      setLocalNumber('')
      onChange('')
    }
    previousCountryRef.current = selectedCountryCode
    isManualCountryChangeRef.current = false
  }, [selectedCountryCode, onChange])

  // Combine country code and local number into full number
  const handleCountryChange = (countryCode: CountryCode) => {
    isManualCountryChangeRef.current = true
    setSelectedCountryCode(countryCode)
  }

  const handleLocalNumberChange = (number: string) => {
    // Remove any non-digit characters except for the initial +
    const cleanNumber = number.replace(/[^\d]/g, '')
    setLocalNumber(cleanNumber)

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
    <div className="gba:space-y-2">
      <div className="gba:flex gba:gap-2">
        <Select value={selectedCountryCode || ''} onValueChange={code => handleCountryChange(code as CountryCode)}>
          <SelectTrigger className="gba:w-[200px]" data-testid={`${dataTestId}-countryCode`}>
            <SelectValue
              placeholder={getTranslationFromI18nKeyAndLabel(
                'lowcoder:employee_profile.details_layout.bank_account_form.country_select_placeholder',
                'Select Country'
              )}
            />
          </SelectTrigger>
          <SelectContent>
            {countries.map(country => (
              <SelectItem key={country.code} value={country.code}>
                {country.name} (+{country.callingCode})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input
          placeholder={getTranslationFromI18nKeyAndLabel(
            'lowcoder:relationship_form.phone_number_placeholder',
            'Enter Phone Number'
          )}
          value={localNumber}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => handleLocalNumberChange(e.target.value)}
          onBlur={onBlur}
          data-testid={dataTestId}
          className="gba:flex-1"
        />
      </div>
      {touched && error && (
        <div className="gba:mt-1 gba:text-destructive" data-testid={`${dataTestId}-error`}>
          {error}
        </div>
      )}
    </div>
  )
}
