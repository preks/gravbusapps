import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import type { CountryCallingCode, CountryCode } from 'libphonenumber-js'
import * as FlagIcons from 'country-flag-icons/react/3x2'

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
  selectedLabelVariant?: 'country' | 'code'
  searchPlaceholder?: string
  emptyText?: string
  className?: string
  'data-testid'?: string
}

interface PanelPosition {
  top: number
  left: number
  width: number
  maxHeight: number
}

const DEFAULT_SEARCH_PLACEHOLDER = 'Search by country or prefix...'
const DEFAULT_EMPTY_TEXT = 'No countries found'
const MIN_PANEL_WIDTH = 240
const MIN_PANEL_HEIGHT = 160

type FlagIconComponent = React.ComponentType<React.SVGProps<SVGSVGElement>>

const getCountryFlagIcon = (countryCode: CountryCode): FlagIconComponent | undefined => {
  return (FlagIcons as Record<string, FlagIconComponent | undefined>)[countryCode]
}

const CountryFlag: React.FC<{ countryCode: CountryCode }> = ({ countryCode }) => {
  const FlagIcon = getCountryFlagIcon(countryCode)

  if (!FlagIcon) {
    return <span className="gba:text-xs gba:font-medium">{countryCode}</span>
  }

  return <FlagIcon className="gba:h-3 gba:w-4 gba:shrink-0 gba:rounded-[1px]" aria-hidden="true" />
}

const ChevronDownIcon: React.FC<{ isOpen: boolean }> = ({ isOpen }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={`gba:pointer-events-none gba:absolute gba:right-2 gba:top-1/2 gba:size-4 gba:-translate-y-1/2 gba:shrink-0 gba:text-muted-foreground gba:transition-transform gba:duration-200 ${
      isOpen ? 'gba:rotate-180' : ''
    }`}
    aria-hidden="true"
  >
    <path d="m6 9 6 6 6-6" />
  </svg>
)

const getCallingCodeLabel = (country: PhonePrefixCountry): string => `+${country.callingCode}`

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

const CountryOptionLabel: React.FC<{ country: PhonePrefixCountry }> = ({ country }) => {
  return (
    <div className="gba:flex gba:w-full gba:min-w-0 gba:flex-col gba:gap-1 gba:text-left">
      <div className="gba:flex gba:min-w-0 gba:items-center gba:gap-2">
        <CountryFlag countryCode={country.code} />
        <span className="gba:text-sm gba:font-medium gba:truncate">{country.name}</span>
      </div>
      <span className="gba:pl-6 gba:text-xs gba:text-muted-foreground">{getCallingCodeLabel(country)}</span>
    </div>
  )
}

const SelectedCountryLabel: React.FC<{ country: PhonePrefixCountry; variant: 'country' | 'code' }> = ({
  country,
  variant
}) => {
  const callingCode = getCallingCodeLabel(country)

  if (variant === 'code') {
    return (
      <span className="gba:flex gba:items-center gba:gap-2 gba:truncate">
        <CountryFlag countryCode={country.code} />
        <span className="gba:text-muted-foreground">{callingCode}</span>
      </span>
    )
  }

  return (
    <span className="gba:flex gba:items-center gba:gap-2 gba:truncate">
      <CountryFlag countryCode={country.code} />
      <span className="gba:truncate">{country.name}</span>
      <span className="gba:text-muted-foreground gba:shrink-0">({callingCode})</span>
    </span>
  )
}

export const PhonePrefixCombobox: React.FC<PhonePrefixComboboxProps> = ({
  value,
  countries,
  onValueChange,
  placeholder,
  selectedLabelVariant = 'country',
  searchPlaceholder = DEFAULT_SEARCH_PLACEHOLDER,
  emptyText = DEFAULT_EMPTY_TEXT,
  className,
  'data-testid': dataTestId
}) => {
  const [query, setQuery] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const [position, setPosition] = useState<PanelPosition | null>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)

  const filteredCountries = useMemo(
    () => countries.filter(country => matchesCountryQuery(country, query)),
    [countries, query]
  )
  const selectedCountry = countries.find(country => country.code === value)

  const updatePosition = useCallback(() => {
    const trigger = triggerRef.current

    if (!trigger) {
      return
    }

    const rect = trigger.getBoundingClientRect()

    setPosition({
      top: rect.bottom + 4,
      left: rect.left,
      width: Math.max(rect.width, MIN_PANEL_WIDTH),
      maxHeight: Math.max(MIN_PANEL_HEIGHT, window.innerHeight - rect.bottom - 12)
    })
  }, [])

  const closeDropdown = useCallback(() => {
    setIsOpen(false)
    setQuery('')
  }, [])

  useEffect(() => {
    if (!isOpen) {
      return
    }

    updatePosition()

    const handleReposition = () => updatePosition()
    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node

      if (triggerRef.current?.contains(target) || panelRef.current?.contains(target)) {
        return
      }

      closeDropdown()
    }

    window.addEventListener('scroll', handleReposition, true)
    window.addEventListener('resize', handleReposition)
    document.addEventListener('pointerdown', handlePointerDown)

    return () => {
      window.removeEventListener('scroll', handleReposition, true)
      window.removeEventListener('resize', handleReposition)
      document.removeEventListener('pointerdown', handlePointerDown)
    }
  }, [isOpen, updatePosition, closeDropdown])

  const handleSelectCountry = (countryCode: CountryCode) => {
    onValueChange(countryCode)
    closeDropdown()
  }

  return (
    <div className={`gba:min-w-0 ${className || ''}`} data-testid={dataTestId}>
      <button
        ref={triggerRef}
        type="button"
        className="gba:relative gba:flex gba:h-9 gba:w-full gba:min-w-0 gba:items-center gba:gap-2 gba:rounded-md gba:border gba:border-input gba:bg-surface/50 gba:py-2 gba:pl-2.5 gba:pr-8 gba:text-sm gba:whitespace-nowrap gba:outline-none gba:transition-colors gba:duration-200 gba:hover:border-ring/90 gba:focus-visible:border-decorative-ring gba:focus-visible:ring-2 gba:focus-visible:ring-decorative-ring/25"
        aria-expanded={isOpen}
        onClick={() => setIsOpen(currentIsOpen => !currentIsOpen)}
      >
        <span className="gba:min-w-0 gba:flex-1 gba:text-left gba:truncate">
          {selectedCountry ? (
            <SelectedCountryLabel country={selectedCountry} variant={selectedLabelVariant} />
          ) : (
            <span className="gba:text-muted-foreground">{placeholder}</span>
          )}
        </span>
        <ChevronDownIcon isOpen={isOpen} />
      </button>

      {isOpen &&
        position &&
        createPortal(
          <div
            ref={panelRef}
            className="gba:fixed gba:z-50 gba:overflow-hidden gba:rounded-md gba:border gba:border-input gba:bg-popover gba:text-popover-foreground gba:shadow-md"
            style={{ top: position.top, left: position.left, width: position.width }}
          >
            <div className="gba:border-b gba:border-input gba:p-2">
              <input
                type="search"
                autoFocus
                value={query}
                onChange={event => setQuery(event.target.value)}
                onKeyDown={event => event.key === 'Escape' && closeDropdown()}
                placeholder={searchPlaceholder}
                className="gba:h-9 gba:w-full gba:rounded-md gba:border gba:border-input gba:bg-background gba:px-3 gba:text-sm gba:outline-none gba:focus:ring-2 gba:focus:ring-ring"
              />
            </div>
            <div className="gba:overflow-y-auto gba:p-1" style={{ maxHeight: position.maxHeight }}>
              {filteredCountries.length > 0 ? (
                filteredCountries.map(country => (
                  <button
                    key={country.code}
                    type="button"
                    className="gba:flex gba:w-full gba:rounded-sm gba:px-2 gba:py-2 gba:text-left gba:hover:bg-accent gba:hover:text-accent-foreground gba:focus:bg-accent gba:focus:text-accent-foreground gba:focus:outline-none"
                    onClick={() => handleSelectCountry(country.code)}
                  >
                    <CountryOptionLabel country={country} />
                  </button>
                ))
              ) : (
                <div className="gba:px-3 gba:py-2 gba:text-sm gba:text-muted-foreground">{emptyText}</div>
              )}
            </div>
          </div>,
          document.body
        )}
    </div>
  )
}
