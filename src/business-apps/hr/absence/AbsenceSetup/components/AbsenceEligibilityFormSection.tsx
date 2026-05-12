'use client'

import { BriefcaseIcon, GlobeIcon, UsersThreeIcon } from '@phosphor-icons/react'
import { Checkbox, Combobox, Label, useTranslation } from '@newwork/nw-design-system'
import type { EligibilityOption } from '../hooks/useAbsenceSetupEligibilityData'
import type { CompanyOption, EligibilitySettings } from '../utils/absenceEligibilityConflict'
import translations from '../_i18n'
import { filterByCountry, MultiSelectGroup } from './AbsenceTypeEligibilitySection'

interface AbsenceEligibilityFormSectionProps {
  settings: EligibilitySettings
  companies?: CompanyOption[]
  isLoadingCompanies?: boolean
  onSearchCompanies?: (query: string) => void
  onLoadMoreCompanies?: () => void
  countries?: EligibilityOption[]
  contractTypes?: EligibilityOption[]
  employmentTypes?: EligibilityOption[]
  testIdPrefix: string
  onSettingsChange: (field: keyof EligibilitySettings, value: EligibilitySettings[keyof EligibilitySettings]) => void
}

export function AbsenceEligibilityFormSection({
  settings,
  companies = [],
  isLoadingCompanies = false,
  onSearchCompanies,
  onLoadMoreCompanies,
  countries = [],
  contractTypes = [],
  employmentTypes = [],
  testIdPrefix,
  onSettingsChange
}: Readonly<AbsenceEligibilityFormSectionProps>) {
  const { t } = useTranslation(translations)

  const handleStandardChange = (checked: boolean) => {
    onSettingsChange('standard', checked)
    if (checked) {
      onSettingsChange('company_id', '')
      onSettingsChange('allowed_countries', [])
      onSettingsChange('allowed_contract_types', [])
      onSettingsChange('allowed_employment_types', [])
    }
  }

  const handleCountryToggle = (id: string) => {
    if (settings.standard) onSettingsChange('standard', false)
    onSettingsChange(
      'allowed_countries',
      settings.allowed_countries.includes(id)
        ? settings.allowed_countries.filter(c => c !== id)
        : [...settings.allowed_countries, id]
    )
  }

  const handleContractTypeToggle = (id: string) => {
    if (settings.standard) onSettingsChange('standard', false)
    onSettingsChange(
      'allowed_contract_types',
      settings.allowed_contract_types.includes(id)
        ? settings.allowed_contract_types.filter(c => c !== id)
        : [...settings.allowed_contract_types, id]
    )
  }

  const handleEmploymentTypeToggle = (id: string) => {
    if (settings.standard) onSettingsChange('standard', false)
    onSettingsChange(
      'allowed_employment_types',
      settings.allowed_employment_types.includes(id)
        ? settings.allowed_employment_types.filter(e => e !== id)
        : [...settings.allowed_employment_types, id]
    )
  }

  const standardCheckboxId = `${testIdPrefix}-standard`

  return (
    <div className="gba:space-y-4">
      <div className="gba:grid gba:gap-3 gba:md:grid-cols-2">
        <div className="gba:space-y-2">
          <Label>{t('field-company-label')}</Label>
          <Combobox
            value={settings.company_id}
            onValueChange={value => {
              const companyId = String(value || '')
              onSettingsChange('company_id', companyId)
              if (companyId) onSettingsChange('standard', false)
            }}
            options={companies.map(c => ({ value: c.id, label: c.name }))}
            placeholder={t('field-company-label')}
            searchPlaceholder={t('field-company-label')}
            emptyText={t('empty-catalog-entries', { entity: t('field-company-label') })}
            isLoading={isLoadingCompanies}
            onSearch={onSearchCompanies}
            onScrollEnd={onLoadMoreCompanies}
            disabled={settings.standard}
            data-testid={`${testIdPrefix}-company-select`}
          />
        </div>
        <div className="gba:flex gba:items-center gba:gap-2 gba:pt-6">
          <Checkbox
            id={standardCheckboxId}
            checked={settings.standard}
            onCheckedChange={checked => handleStandardChange(Boolean(checked))}
            disabled={
              Boolean(settings.company_id) ||
              settings.allowed_countries.length > 0 ||
              settings.allowed_contract_types.length > 0 ||
              settings.allowed_employment_types.length > 0
            }
            data-testid={`${testIdPrefix}-standard-checkbox`}
          />
          <Label htmlFor={standardCheckboxId}>{t('field-standard-label')}</Label>
        </div>
      </div>

      <div className="gba:space-y-4">
        <MultiSelectGroup
          icon={<GlobeIcon className="gba:h-4 gba:w-4" />}
          label={t('details-label-country')}
          allHint={t('eligibility-all-hint')}
          searchPlaceholder={t('eligibility-search-countries')}
          noOptionsHint={t('eligibility-no-options')}
          options={countries}
          selected={settings.allowed_countries}
          disabled={settings.standard}
          testIdPrefix={`${testIdPrefix}-country`}
          onToggle={handleCountryToggle}
          onRemove={id =>
            onSettingsChange(
              'allowed_countries',
              settings.allowed_countries.filter(c => c !== id)
            )
          }
        />
        <MultiSelectGroup
          icon={<BriefcaseIcon className="gba:h-4 gba:w-4" />}
          label={t('eligibility-contract-types-label')}
          allHint={t('eligibility-all-hint')}
          searchPlaceholder={t('eligibility-search-contract-types')}
          noOptionsHint={t('eligibility-no-options')}
          options={filterByCountry(contractTypes, settings.allowed_countries)}
          selected={settings.allowed_contract_types}
          disabled={settings.standard}
          testIdPrefix={`${testIdPrefix}-contract-type`}
          onToggle={handleContractTypeToggle}
          onRemove={id =>
            onSettingsChange(
              'allowed_contract_types',
              settings.allowed_contract_types.filter(c => c !== id)
            )
          }
        />
        <MultiSelectGroup
          icon={<UsersThreeIcon className="gba:h-4 gba:w-4" />}
          label={t('eligibility-employment-types-label')}
          allHint={t('eligibility-all-hint')}
          searchPlaceholder={t('eligibility-search-employment-types')}
          noOptionsHint={t('eligibility-no-options')}
          options={filterByCountry(employmentTypes, settings.allowed_countries)}
          selected={settings.allowed_employment_types}
          disabled={settings.standard}
          testIdPrefix={`${testIdPrefix}-employment-type`}
          onToggle={handleEmploymentTypeToggle}
          onRemove={id =>
            onSettingsChange(
              'allowed_employment_types',
              settings.allowed_employment_types.filter(e => e !== id)
            )
          }
        />
      </div>
    </div>
  )
}
