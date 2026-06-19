import React, { useEffect, useMemo, useRef, useState } from 'react'
import { Input, useTranslation } from '@newwork/nw-design-system'
import {
  getCountries,
  getCountryCallingCode,
  parsePhoneNumberFromString,
  type CountryCallingCode,
  type CountryCode
} from 'libphonenumber-js'
import { useFormContext } from 'react-hook-form'
import { PhonePrefixCombobox } from '@/common/components/phone-prefix-combobox/PhonePrefixCombobox'
import {
  buildPhoneNumberWithCountryCode,
  isValidPhoneNumberForCountry,
  normalizeLocalPhoneNumber
} from '@/common/utils/validation/phoneNumberValidation'
import { countryCodeFromCatalogRef } from '@/common/utils/countryCode'
import { getCurrentActiveUserLocale } from '@/common/utils/windowUtils'
import translations from './_i18n'

interface CountryOption {
  code: CountryCode
  callingCode: CountryCallingCode
  name: string
}

interface PhoneCommunicationValueInputProps {
  fieldName: string
  value?: string | null
  onChange: (value: string) => void
  onBlur: () => void
  invalid?: boolean
  describedBy?: string
  channelIndex: number
}

const findDefaultCountryCode = (addresses: Array<{ countryRef?: string | null }> | undefined): CountryCode | '' => {
  const firstAddress = addresses?.find(address => Boolean(address?.countryRef))
  return countryCodeFromCatalogRef(firstAddress?.countryRef)
}

export const PhoneCommunicationValueInput: React.FC<PhoneCommunicationValueInputProps> = ({
  fieldName,
  value,
  onChange,
  onBlur,
  invalid,
  describedBy,
  channelIndex
}) => {
  const form = useFormContext<any>()
  const { t } = useTranslation(translations)
  const addresses = form.watch('addresses') as Array<{ countryRef?: string | null }> | undefined
  const defaultCountryCode = findDefaultCountryCode(addresses)
  const [selectedCountryCode, setSelectedCountryCode] = useState<CountryCode | ''>('')
  const [localNumber, setLocalNumber] = useState('')
  const isManualCountryChangeRef = useRef(false)
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

  const setPhoneValidation = (nextLocalNumber: string, nextCountryCode: CountryCode | '') => {
    if (!nextLocalNumber) {
      form.clearErrors(fieldName)
      return
    }

    if (!nextCountryCode || !isValidPhoneNumberForCountry(nextLocalNumber, nextCountryCode)) {
      form.setError(fieldName, {
        type: 'validate',
        message: t('communication-channel-phone-invalid')
      })
      return
    }

    form.clearErrors(fieldName)
  }

  useEffect(() => {
    if (skipNextParseRef.current) {
      skipNextParseRef.current = false
      return
    }

    if (isManualCountryChangeRef.current) {
      isManualCountryChangeRef.current = false
      return
    }

    const defaultCountry = countries.some(country => country.code === defaultCountryCode) ? defaultCountryCode : ''
    const currentValue = (value || '').trim()

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

    setLocalNumber(normalizeLocalPhoneNumber(currentValue))
  }, [countries, defaultCountryCode, value])

  const updateValue = (nextLocalNumber: string, nextCountryCode: CountryCode | '') => {
    const nextValue = nextCountryCode
      ? buildPhoneNumberWithCountryCode(nextLocalNumber, nextCountryCode)
      : nextLocalNumber

    onChange(nextValue)
    setPhoneValidation(nextLocalNumber, nextCountryCode)
  }

  const handleCountryChange = (countryCode: CountryCode) => {
    isManualCountryChangeRef.current = true
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
    <div className="gba:grid gba:min-w-0 gba:w-full gba:grid-cols-3 gba:items-center gba:gap-2">
      <PhonePrefixCombobox
        value={selectedCountryCode}
        countries={countries}
        onValueChange={handleCountryChange}
        placeholder={t('communication-channel-phone-prefix-placeholder')}
        className="gba:col-span-1 gba:min-w-0 gba:w-full"
        data-testid={`communication-channel-phone-prefix-${channelIndex}`}
      />
      <div className="gba:col-span-2 gba:min-w-0">
        <Input
          type="tel"
          placeholder={t('communication-channel-value-placeholder')}
          data-testid={`communication-channel-value-${channelIndex}`}
          value={localNumber}
          onChange={handleLocalNumberChange}
          onBlur={() => {
            onBlur()
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
