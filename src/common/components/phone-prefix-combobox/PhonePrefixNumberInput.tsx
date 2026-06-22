import React, { useEffect, useMemo, useRef, useState } from 'react'
import { Input } from '@newwork/nw-design-system'
import {
  getCountries,
  getCountryCallingCode,
  parsePhoneNumberFromString,
  type CountryCallingCode,
  type CountryCode
} from 'libphonenumber-js'
import { getCurrentActiveUserLocale } from '@/common/utils/windowUtils'
import { countryCodeFromCatalogRef } from '@/common/utils/countryCode'
import {
  buildPhoneNumberWithCountryCode,
  isValidPhoneNumberForCountry,
  normalizeLocalPhoneNumber
} from '@/common/utils/validation/phoneNumberValidation'
import { PhonePrefixCombobox } from './PhonePrefixCombobox'
import { useFormContext } from 'react-hook-form'

interface CountryOption {
  code: CountryCode
  callingCode: CountryCallingCode
  name: string
}

interface PhonePrefixNumberInputProps {
  value?: string | null
  onChange: (value: string) => void
  onBlur?: () => void
  defaultCountryRef?: string | null
  prefixPlaceholder: string
  numberPlaceholder: string
  invalid?: boolean
  describedBy?: string
  fieldName?: string
  invalidMessage?: string
  className?: string
  'data-testid'?: string
}

export const PhonePrefixNumberInput: React.FC<PhonePrefixNumberInputProps> = ({
  value,
  onChange,
  onBlur,
  defaultCountryRef,
  prefixPlaceholder,
  numberPlaceholder,
  invalid,
  describedBy,
  fieldName,
  invalidMessage = 'Please enter a valid phone number',
  className,
  'data-testid': dataTestId
}) => {
  const form = useFormContext()
  const defaultCountryCode = countryCodeFromCatalogRef(defaultCountryRef)
  const [selectedCountryCode, setSelectedCountryCode] = useState<CountryCode | ''>('')
  const [localNumber, setLocalNumber] = useState('')
  const skipNextParseRef = useRef(false)

  const countries = useMemo(() => {
    const locale = getCurrentActiveUserLocale() || 'en'
    const displayNames = new Intl.DisplayNames([locale], { type: 'region' })

    return getCountries()
      .map(country => {
        try {
          return {
            code: country,
            callingCode: getCountryCallingCode(country),
            name: displayNames.of(country.toUpperCase()) || country
          }
        } catch {
          return null
        }
      })
      .filter((country): country is CountryOption => country !== null)
      .sort((a, b) => a.name.localeCompare(b.name, locale))
  }, [])

  useEffect(() => {
    if (skipNextParseRef.current) {
      skipNextParseRef.current = false
      return
    }

    const currentValue = (value || '').trim()
    const defaultCountry = countries.some(country => country.code === defaultCountryCode) ? defaultCountryCode : ''

    if (!currentValue) {
      setSelectedCountryCode(currentCountryCode => currentCountryCode || defaultCountry)
      setLocalNumber('')
      return
    }

    const parsed = parsePhoneNumberFromString(currentValue)
    if (parsed?.country) {
      setSelectedCountryCode(parsed.country)
      setLocalNumber(parsed.nationalNumber)
      return
    }

    setSelectedCountryCode(currentCountryCode => currentCountryCode || defaultCountry)
    setLocalNumber(normalizeLocalPhoneNumber(currentValue))
  }, [countries, defaultCountryCode, value])

  const setPhoneValidation = (nextLocalNumber: string, nextCountryCode: CountryCode | '') => {
    if (!fieldName) {
      return
    }

    if (!nextLocalNumber) {
      form.clearErrors(fieldName)
      return
    }

    if (!nextCountryCode || !isValidPhoneNumberForCountry(nextLocalNumber, nextCountryCode)) {
      form.setError(fieldName, {
        type: 'validate',
        message: invalidMessage
      })
      return
    }

    form.clearErrors(fieldName)
  }

  const updateValue = (nextLocalNumber: string, nextCountryCode: CountryCode | '') => {
    if (!nextLocalNumber) {
      onChange('')
      setPhoneValidation('', nextCountryCode)
      return
    }

    onChange(nextCountryCode ? buildPhoneNumberWithCountryCode(nextLocalNumber, nextCountryCode) : nextLocalNumber)
    setPhoneValidation(nextLocalNumber, nextCountryCode)
  }

  const handleCountryChange = (countryCode: CountryCode) => {
    skipNextParseRef.current = true
    setSelectedCountryCode(countryCode)
    updateValue(localNumber, countryCode)
  }

  const handleLocalNumberChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const nextLocalNumber = normalizeLocalPhoneNumber(event.target.value)
    skipNextParseRef.current = true
    setLocalNumber(nextLocalNumber)
    updateValue(nextLocalNumber, selectedCountryCode)
  }

  return (
    <div className={`gba:grid gba:min-w-0 gba:w-full gba:grid-cols-5 gba:items-center gba:gap-2 ${className || ''}`}>
      <PhonePrefixCombobox
        value={selectedCountryCode}
        countries={countries}
        onValueChange={handleCountryChange}
        placeholder={prefixPlaceholder}
        className="gba:col-span-2 gba:min-w-0 gba:w-full"
        data-testid={dataTestId ? `${dataTestId}-prefix` : undefined}
      />
      <div className="gba:col-span-3 gba:min-w-0">
        <Input
          type="tel"
          placeholder={numberPlaceholder}
          data-testid={dataTestId}
          value={localNumber}
          onChange={handleLocalNumberChange}
          onBlur={() => {
            onBlur?.()
            setPhoneValidation(localNumber, selectedCountryCode)
          }}
          aria-invalid={invalid}
          aria-describedby={describedBy}
          className="gba:w-full"
        />
      </div>
    </div>
  )
}
