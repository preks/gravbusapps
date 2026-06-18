import React, { useMemo, useState } from 'react'
import { Combobox, type ComboboxOption } from '@newwork/nw-design-system'
import type { CountryCallingCode, CountryCode } from 'libphonenumber-js'

export interface PhonePrefixCountry {
  code: CountryCode
  callingCode: CountryCallingCode | string
  name: string
}

interface PhonePrefixComboboxProps {
  value: CountryCode | ''
  countries: PhonePrefixCountry[]
  onValueChange: (code: CountryCode) => void
  placeholder: string
  searchPlaceholder?: string
  emptyText?: string
  className?: string
  'data-testid'?: string
}

const DEFAULT_SEARCH_PLACEHOLDER = 'Search by country or prefix...'
const DEFAULT_EMPTY_TEXT = 'No countries found'

const matchesCountryQuery = (country: PhonePrefixCountry, query: string): boolean => {
  const normalizedQuery = query.trim().toLowerCase()

  if (!normalizedQuery) {
    return true
  }

  const searchableText = [country.name, country.code, `+${country.callingCode}`, String(country.callingCode)]
    .join(' ')
    .toLowerCase()

  return searchableText.includes(normalizedQuery)
}

export const PhonePrefixCombobox: React.FC<PhonePrefixComboboxProps> = ({
  value,
  countries,
  onValueChange,
  placeholder,
  searchPlaceholder = DEFAULT_SEARCH_PLACEHOLDER,
  emptyText = DEFAULT_EMPTY_TEXT,
  className,
  'data-testid': dataTestId
}) => {
  const [query, setQuery] = useState('')

  const options: ComboboxOption[] = useMemo(() => {
    return countries
      .filter(country => matchesCountryQuery(country, query))
      .map(country => {
        const callingCode = `+${country.callingCode}`
        const labelText = `${country.name} ${callingCode}`

        return {
          value: country.code,
          optionLabel: `${labelText} ${country.code}`,
          label: (
            <div className="gba:flex gba:items-center gba:gap-2 gba:w-full gba:text-left">
              <span className="gba:text-sm gba:font-medium gba:truncate">{country.name}</span>
              <span className="gba:text-sm gba:text-muted-foreground gba:shrink-0">{callingCode}</span>
            </div>
          )
        }
      })
  }, [countries, query])

  return (
    <Combobox
      className={`gba:[&&]:h-auto ${className || ''}`}
      options={options}
      value={value}
      onValueChange={selectedValue => onValueChange(selectedValue as CountryCode)}
      onSearch={setQuery}
      placeholder={placeholder}
      searchPlaceholder={searchPlaceholder}
      emptyText={emptyText}
      data-testid={dataTestId}
      align="start"
    />
  )
}
