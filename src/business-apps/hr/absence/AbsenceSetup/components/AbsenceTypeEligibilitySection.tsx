'use client'

import { useState, useEffect, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle, useTranslation } from '@newwork/nw-design-system'
import { UsersThree, Briefcase, Globe, MapPin, X, CaretDown, Check } from '@phosphor-icons/react'
import type { EligibilityOption } from '../hooks/useAbsenceSetupEligibilityData'
import type { AbsenceTypeObjectSettings } from '../utils/absenceTypeObjectValue'
import translations from '../_i18n'

interface AbsenceTypeEligibilitySectionProps {
  settings: AbsenceTypeObjectSettings
  employmentTypes: EligibilityOption[]
  contractTypes: EligibilityOption[]
  countries: EligibilityOption[]
  regionsByCountry: Record<string, EligibilityOption[]>
  regionsLoading: Record<string, boolean>
  onFieldChange: <K extends keyof AbsenceTypeObjectSettings>(field: K, value: AbsenceTypeObjectSettings[K]) => void
  onCountryExpanded: (countryId: string) => void
}

const toggleItem = (current: string[], id: string): string[] =>
  current.includes(id) ? current.filter(item => item !== id) : [...current, id]

const getEffectiveCountries = (
  selectedCountries: string[],
  selectedRegions: string[],
  regionsByCountry: Record<string, EligibilityOption[]>
): string[] => {
  const set = new Set(selectedCountries)
  for (const countryId of selectedCountries) {
    const regions = regionsByCountry[countryId] || []
    if (regions.some(r => selectedRegions.includes(r.id))) set.add(countryId)
  }
  return [...set]
}

export const filterByCountry = (options: EligibilityOption[], effectiveCountries: string[]): EligibilityOption[] => {
  if (effectiveCountries.length === 0) return options
  return options.filter(o => !o.parentEntryId || effectiveCountries.includes(o.parentEntryId))
}

export function AbsenceTypeEligibilitySection({
  settings,
  employmentTypes,
  contractTypes,
  countries,
  regionsByCountry,
  regionsLoading,
  onFieldChange,
  onCountryExpanded
}: Readonly<AbsenceTypeEligibilitySectionProps>) {
  const { t } = useTranslation(translations)

  const effectiveCountries = getEffectiveCountries(settings.allowedCountries, settings.allowedRegions, regionsByCountry)
  const visibleEmploymentTypes = filterByCountry(employmentTypes, effectiveCountries)
  const visibleContractTypes = filterByCountry(contractTypes, effectiveCountries)

  // All regions for the selected countries
  const availableRegions = settings.allowedCountries.flatMap(countryId => regionsByCountry[countryId] || [])

  // Trigger region data loading when countries are selected
  useEffect(() => {
    for (const countryId of settings.allowedCountries) {
      if (!regionsByCountry[countryId]) onCountryExpanded(countryId)
    }
  }, [settings.allowedCountries, regionsByCountry, onCountryExpanded])

  // Clean up stale selections when countries or regions are removed
  const prevCountriesRef = useRef<string[]>(settings.allowedCountries)
  const prevRegionsRef = useRef<string[]>(settings.allowedRegions)
  useEffect(() => {
    const prevCountries = prevCountriesRef.current
    const prevRegions = prevRegionsRef.current
    prevCountriesRef.current = settings.allowedCountries
    prevRegionsRef.current = settings.allowedRegions

    const countriesRemoved = prevCountries.filter(id => !settings.allowedCountries.includes(id))
    const regionsRemoved = prevRegions.filter(id => !settings.allowedRegions.includes(id))
    if (countriesRemoved.length === 0 && regionsRemoved.length === 0) return

    // Remove regions belonging to removed countries
    const validRegionIds = new Set(
      settings.allowedCountries.flatMap(countryId => (regionsByCountry[countryId] || []).map(r => r.id))
    )
    const nextRegions = settings.allowedRegions.filter(id => validRegionIds.has(id))
    if (nextRegions.length !== settings.allowedRegions.length) {
      onFieldChange('allowedRegions', nextRegions)
    }

    const nextEffective = getEffectiveCountries(settings.allowedCountries, nextRegions, regionsByCountry)
    const visibleEtIds = new Set(filterByCountry(employmentTypes, nextEffective).map(o => o.id))
    const visibleCtIds = new Set(filterByCountry(contractTypes, nextEffective).map(o => o.id))

    const nextEt = settings.allowedEmploymentTypes.filter(id => visibleEtIds.has(id))
    const nextCt = settings.allowedContractTypes.filter(id => visibleCtIds.has(id))

    if (nextEt.length !== settings.allowedEmploymentTypes.length) onFieldChange('allowedEmploymentTypes', nextEt)
    if (nextCt.length !== settings.allowedContractTypes.length) onFieldChange('allowedContractTypes', nextCt)
  }, [
    settings.allowedCountries,
    settings.allowedRegions,
    settings.allowedEmploymentTypes,
    settings.allowedContractTypes,
    employmentTypes,
    contractTypes,
    regionsByCountry,
    onFieldChange
  ])

  // Auto-seed regions when a newly selected country's data becomes available.
  // Countries already selected on mount are pre-marked as seeded so existing saved data is not touched.
  const autoSeededCountriesRef = useRef<Set<string>>(new Set(settings.allowedCountries))
  useEffect(() => {
    for (const seededId of autoSeededCountriesRef.current) {
      if (!settings.allowedCountries.includes(seededId)) {
        autoSeededCountriesRef.current.delete(seededId)
      }
    }
    for (const countryId of settings.allowedCountries) {
      if (autoSeededCountriesRef.current.has(countryId)) continue
      const regions = regionsByCountry[countryId]
      if (!regions || regions.length === 0) continue
      autoSeededCountriesRef.current.add(countryId)
      const newRegionIds = regions.map(r => r.id).filter(id => !settings.allowedRegions.includes(id))
      if (newRegionIds.length > 0) {
        onFieldChange('allowedRegions', [...settings.allowedRegions, ...newRegionIds])
      }
    }
  }, [settings.allowedCountries, regionsByCountry, settings.allowedRegions, onFieldChange])

  const isRegionsLoading = settings.allowedCountries.some(id => regionsLoading[id])

  const regionsNoOptionsHint = (() => {
    if (settings.allowedCountries.length === 0) return t('eligibility-select-country-first')
    if (isRegionsLoading) return t('eligibility-regions-loading')
    return t('eligibility-no-options')
  })()

  return (
    <Card data-testid="absence-type-eligibility-section" className="gba:border gba:border-border gba:bg-muted/10">
      <CardHeader className="gba:border-b gba:border-border gba:bg-background">
        <CardTitle>{t('eligibility-section-title')}</CardTitle>
        <p className="gba:text-xs gba:text-muted-foreground">{t('eligibility-section-description')}</p>
      </CardHeader>
      <CardContent className="gba:space-y-5 gba:p-4">
        <MultiSelectGroup
          icon={<Globe className="gba:h-4 gba:w-4" />}
          label={t('details-label-country')}
          allHint={t('eligibility-all-hint')}
          searchPlaceholder={t('eligibility-search-countries')}
          noOptionsHint={t('eligibility-no-options')}
          options={countries}
          selected={settings.allowedCountries}
          testIdPrefix="absence-type-country"
          onToggle={id => {
            const next = toggleItem(settings.allowedCountries, id)
            onFieldChange('allowedCountries', next)
            if (next.includes(id)) onCountryExpanded(id)
          }}
          onRemove={id => {
            const nextCountries = settings.allowedCountries.filter(c => c !== id)
            onFieldChange('allowedCountries', nextCountries)
          }}
        />

        <MultiSelectGroup
          icon={<MapPin className="gba:h-4 gba:w-4" />}
          label={t('eligibility-regions-label')}
          allHint={t('eligibility-all-hint')}
          searchPlaceholder={t('eligibility-search-regions')}
          noOptionsHint={regionsNoOptionsHint}
          options={availableRegions}
          selected={settings.allowedRegions}
          testIdPrefix="absence-type-region"
          disabled={settings.allowedCountries.length === 0}
          onToggle={id => onFieldChange('allowedRegions', toggleItem(settings.allowedRegions, id))}
          onRemove={id =>
            onFieldChange(
              'allowedRegions',
              settings.allowedRegions.filter(r => r !== id)
            )
          }
        />

        <MultiSelectGroup
          icon={<UsersThree className="gba:h-4 gba:w-4" />}
          label={t('eligibility-employment-types-label')}
          allHint={t('eligibility-all-hint')}
          searchPlaceholder={t('eligibility-search-employment-types')}
          noOptionsHint={t('eligibility-no-options')}
          options={visibleEmploymentTypes}
          selected={settings.allowedEmploymentTypes}
          testIdPrefix="absence-type-employment-type"
          onToggle={id => onFieldChange('allowedEmploymentTypes', toggleItem(settings.allowedEmploymentTypes, id))}
          onRemove={id =>
            onFieldChange(
              'allowedEmploymentTypes',
              settings.allowedEmploymentTypes.filter(v => v !== id)
            )
          }
        />

        <MultiSelectGroup
          icon={<Briefcase className="gba:h-4 gba:w-4" />}
          label={t('eligibility-contract-types-label')}
          allHint={t('eligibility-all-hint')}
          searchPlaceholder={t('eligibility-search-contract-types')}
          noOptionsHint={t('eligibility-no-options')}
          options={visibleContractTypes}
          selected={settings.allowedContractTypes}
          testIdPrefix="absence-type-contract-type"
          onToggle={id => onFieldChange('allowedContractTypes', toggleItem(settings.allowedContractTypes, id))}
          onRemove={id =>
            onFieldChange(
              'allowedContractTypes',
              settings.allowedContractTypes.filter(v => v !== id)
            )
          }
        />
      </CardContent>
    </Card>
  )
}

// ---------------------------------------------------------------------------
// MultiSelectGroup — dropdown + chips for multi-value selection
// ---------------------------------------------------------------------------

export interface MultiSelectGroupProps {
  icon: React.ReactNode
  label: string
  allHint: string
  searchPlaceholder: string
  noOptionsHint: string
  options: EligibilityOption[]
  selected: string[]
  testIdPrefix: string
  disabled?: boolean
  onToggle: (id: string) => void
  onRemove: (id: string) => void
}

export function MultiSelectGroup({
  icon,
  label,
  allHint,
  searchPlaceholder,
  noOptionsHint,
  options,
  selected,
  testIdPrefix,
  disabled = false,
  onToggle,
  onRemove
}: Readonly<MultiSelectGroupProps>) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')

  const closeDropdown = () => {
    setOpen(false)
    setSearch('')
  }

  const isAll = selected.length === 0
  const filtered = options
    .filter(o => !selected.includes(o.id))
    .filter(o => o.label.toLowerCase().includes(search.toLowerCase()))
  const selectedOptions = selected.map(id => options.find(o => o.id === id)).filter(Boolean) as EligibilityOption[]

  return (
    <div className="gba:space-y-2">
      <div className="gba:flex gba:items-center gba:gap-2">
        <span className="gba:text-muted-foreground">{icon}</span>
        <span className="gba:text-sm gba:font-medium">{label}</span>
        {isAll && (
          <span className="gba:rounded-full gba:bg-muted gba:px-2 gba:py-0.5 gba:text-xs gba:text-muted-foreground">
            {allHint}
          </span>
        )}
      </div>

      {selectedOptions.length > 0 && (
        <div className="gba:flex gba:flex-wrap gba:gap-1.5">
          {selectedOptions.map(option => (
            <span
              key={option.id}
              className="gba:inline-flex gba:items-center gba:gap-1 gba:rounded-full gba:border gba:border-primary/30 gba:bg-primary/10 gba:px-2.5 gba:py-0.5 gba:text-xs gba:font-medium gba:text-primary"
            >
              {option.label}
              <button
                type="button"
                onMouseDown={e => e.preventDefault()}
                onClick={() => onRemove(option.id)}
                data-testid={`${testIdPrefix}-remove-${option.id}`}
                className="gba:ml-0.5 gba:rounded-full gba:hover:text-destructive"
                aria-label={`Remove ${option.label}`}
              >
                <X className="gba:h-3 gba:w-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      <div className="gba:relative">
        <button
          type="button"
          disabled={disabled}
          onClick={() => !disabled && setOpen(prev => !prev)}
          data-testid={`${testIdPrefix}-dropdown-trigger`}
          className={`gba:flex gba:w-full gba:items-center gba:justify-between gba:gap-2 gba:rounded-md gba:border gba:border-dashed gba:border-border gba:px-3 gba:py-2 gba:text-xs gba:text-muted-foreground ${
            disabled ? 'gba:cursor-not-allowed gba:opacity-50' : 'gba:hover:border-primary/50 gba:hover:bg-muted/40'
          }`}
        >
          <span>{searchPlaceholder}</span>
          <CaretDown className={`gba:h-3.5 gba:w-3.5 gba:transition-transform ${open ? 'gba:rotate-180' : ''}`} />
        </button>

        {open && (
          <>
            <div className="gba:fixed gba:inset-0 gba:z-40" onClick={closeDropdown} aria-hidden="true" />
            <div className="gba:absolute gba:left-0 gba:right-0 gba:top-full gba:z-50 gba:mt-1 gba:rounded-md gba:border gba:border-border gba:bg-popover gba:shadow-md">
              <div className="gba:border-b gba:border-border gba:p-2">
                <input
                  type="text"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder={searchPlaceholder}
                  data-testid={`${testIdPrefix}-search`}
                  className="gba:w-full gba:rounded gba:border gba:border-input gba:bg-background gba:px-2 gba:py-1 gba:text-xs gba:outline-none focus:gba:ring-1 focus:gba:ring-primary"
                  autoFocus
                />
              </div>
              <div className="gba:max-h-52 gba:overflow-y-auto">
                {filtered.length === 0 ? (
                  <p className="gba:p-3 gba:text-center gba:text-xs gba:text-muted-foreground">{noOptionsHint}</p>
                ) : (
                  filtered.map(option => (
                    <button
                      key={option.id}
                      type="button"
                      onMouseDown={e => e.preventDefault()}
                      onClick={() => {
                        onToggle(option.id)
                        setSearch('')
                      }}
                      data-testid={`${testIdPrefix}-option-${option.id}`}
                      className="gba:flex gba:w-full gba:items-center gba:justify-between gba:px-3 gba:py-2 gba:text-left gba:text-xs gba:text-foreground gba:hover:bg-muted/60"
                    >
                      <span>{option.label}</span>
                      {selected.includes(option.id) && <Check className="gba:h-3.5 gba:w-3.5 gba:text-primary" />}
                    </button>
                  ))
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
