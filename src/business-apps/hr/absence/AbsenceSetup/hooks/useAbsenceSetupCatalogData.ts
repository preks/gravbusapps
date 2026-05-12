import { TreeStructure, Shield } from '@phosphor-icons/react'
import type { Icon as PhosphorIcon } from '@phosphor-icons/react'
import { useMemo } from 'react'
import useAbsenceTypes from '../../../core/hooks/useAbsenceTypes'
import { isSystemCatalogEntry } from '@/business-apps/hr/core/utils/catalogEntryHelpers'
import { useAbsenceCatalogEntries } from './useAbsenceCatalogEntries'
import { useAbsenceSetupEligibilityData } from './useAbsenceSetupEligibilityData'
import { useAbsenceTypeUsage } from './useAbsenceTypeUsage'
import type { AbsenceEntitlementRecordValues } from '../components/AbsenceEntitlementRecord'
import {
  getAbsenceEntitlementDescription,
  getAbsenceEntitlementEditorState
} from '../utils/absenceEntitlementObjectValue'
import {
  getAbsencePolicyDescription,
  getAbsencePolicyEditorState,
  type AbsencePolicyObjectValue
} from '../utils/absencePolicyObjectValue'
import {
  getAbsenceGroupLabel,
  getAbsenceTypeTitle,
  type SetupSectionHighlight,
  type SetupSectionItem,
  type SetupSectionSortOption
} from '../utils/absenceSetup'
import { getAbsenceTypeObjectEditorState } from '../utils/absenceTypeObjectValue'
import {
  canEditAbsenceTypeVersion,
  formatAbsenceTypeVersionDisplayDate,
  getAbsenceTypeVersionDescription,
  getAbsenceTypeCodeForVersion,
  getAbsenceTypeVersionSortValue,
  getAbsenceTypeVersionTitle,
  isAbsenceTypeVersionActive,
  isActiveByValidTo
} from '../utils/absenceTypeVersionObjectValue'

type TranslateFn = (key: string, values?: Record<string, string>) => string

type RegionsByCountry = Record<string, Array<{ id: string; label: string }>>

const resolveIds = (ids: string[], options: Array<{ id: string; label: string }>, allHint: string): string =>
  ids.length > 0 ? ids.map(id => options.find(o => o.id === id)?.label ?? id).join(', ') : allHint

const parsePriority = (value: unknown): number => {
  const p = Number(value)
  return Number.isNaN(p) ? Number.MAX_SAFE_INTEGER : p
}

function getRegionDisplayValue(
  allowedCountries: string[],
  allowedRegions: string[],
  regionsByCountry: RegionsByCountry,
  allHint: string
): string {
  if (allowedCountries.length === 0) return allHint
  const selected = allowedCountries.flatMap(countryId =>
    (regionsByCountry[countryId] || []).filter(r => allowedRegions.includes(r.id))
  )
  if (selected.length > 0) return selected.map(r => r.label).join(', ')
  const allAvailable = allowedCountries.flatMap(countryId => regionsByCountry[countryId] || [])
  return allAvailable.length > 0 ? allAvailable.map(r => r.label).join(', ') : allHint
}

function getRegionCompactValue(
  allowedCountries: string[],
  allowedRegions: string[],
  regionsByCountry: RegionsByCountry,
  allHint: string
): string {
  if (allowedCountries.length === 0) return allHint
  const selected = allowedCountries.flatMap(countryId =>
    (regionsByCountry[countryId] || []).filter(r => allowedRegions.includes(r.id))
  )
  if (selected.length > 0) return selected.map(r => r.label).join(', ')
  const allAvailable = allowedCountries.flatMap(countryId => regionsByCountry[countryId] || [])
  return allAvailable.length === 1 ? allAvailable[0].label : allHint
}

interface EligibilityDisplayData {
  countries: Array<{ id: string; label: string }>
  contractTypes: Array<{ id: string; label: string }>
  employmentTypes: Array<{ id: string; label: string }>
}

function formatEligibilityDisplayFields(
  settings: {
    standard: boolean
    company_id: string
    allowed_countries: string[]
    allowed_contract_types: string[]
    allowed_employment_types: string[]
  },
  companies: Array<{ id: string; name: string }>,
  eligibilityData: EligibilityDisplayData,
  t: TranslateFn
) {
  const allHint = t('eligibility-all-hint')

  const resolvedCompanyName = companies.find(c => c.id === settings.company_id)?.name ?? settings.company_id
  let companyValue = allHint
  if (settings.standard) companyValue = t('field-standard-label')
  else if (settings.company_id) companyValue = resolvedCompanyName

  const countryValue =
    settings.allowed_countries.length > 0
      ? settings.allowed_countries.map(id => eligibilityData.countries.find(c => c.id === id)?.label ?? id).join(', ')
      : allHint

  const contractTypesValue =
    settings.allowed_contract_types.length > 0
      ? settings.allowed_contract_types
          .map(id => eligibilityData.contractTypes.find(ct => ct.id === id)?.label ?? id)
          .join(', ')
      : allHint

  const employmentTypesValue =
    settings.allowed_employment_types.length > 0
      ? settings.allowed_employment_types
          .map(id => eligibilityData.employmentTypes.find(et => et.id === id)?.label ?? id)
          .join(', ')
      : allHint

  return { companyValue, countryValue, contractTypesValue, employmentTypesValue }
}

export interface GenericCatalogConfig {
  entityLabel: string
  title: string
  description: string
  items: SetupSectionItem[]
  sortOptions: SetupSectionSortOption[]
  hook: ReturnType<typeof useAbsenceCatalogEntries>
  icon: PhosphorIcon
  addButtonTestId: string
  cardTestId: string
}

const getMeasurementLabel = (measurement: string, t: TranslateFn) => {
  if (measurement === 'CalendarDays') {
    return t('measurement-calendar-days')
  }

  if (measurement === 'Hours') {
    return t('measurement-hours')
  }

  return t('measurement-working-days')
}

const getPriorityLabel = (priority: number | undefined, t: TranslateFn) =>
  typeof priority === 'number' ? String(priority) : t('details-empty-value')

export const useAbsenceSetupCatalogData = (
  accessToken: string,
  t: TranslateFn,
  companies: Array<{ id: string; name: string }> = []
) => {
  const absenceTypeState = useAbsenceTypes(accessToken)
  const absenceTypeVersionsCatalog = useAbsenceCatalogEntries(accessToken, 'AbsenceTypeVersion')
  const absenceEntitlementsCatalog = useAbsenceCatalogEntries(accessToken, 'AbsenceEntitlement')
  const absenceGroupsCatalog = useAbsenceCatalogEntries(accessToken, 'AbsenceGroup')
  const absencePoliciesCatalog = useAbsenceCatalogEntries(accessToken, 'AbsencePolicy')
  const eligibilityData = useAbsenceSetupEligibilityData(accessToken)
  const { usedTypeRefs } = useAbsenceTypeUsage(accessToken)

  const absenceTypeItems = useMemo(
    () =>
      absenceTypeState.absenceTypes.map(type => {
        const editorState = getAbsenceTypeObjectEditorState(type.objectValue)
        const isSystemType = isSystemCatalogEntry({
          type: type.type,
          objectValue: type.objectValue
        })
        const isUsed = usedTypeRefs.has(type.id)

        return {
          id: type.id,
          title: getAbsenceTypeTitle(type, t('untitled-absence-type')),
          description: `${type.code} | ${getAbsenceGroupLabel(type.parentEntryId, t('no-group'))}`,
          statusLabel: isActiveByValidTo(editorState.settings.valid_to) ? t('status-active') : t('status-inactive'),
          statusValue: isActiveByValidTo(editorState.settings.valid_to) ? 'active' : 'inactive',
          canDelete: !isSystemType,
          tags: [
            isUsed
              ? { label: t('tag-in-use'), variant: 'secondary' as const }
              : { label: t('tag-not-in-use'), variant: 'outline' as const }
          ],
          sortText: `${type.value || type.code} ${type.code}`,
          sortValues: {
            code: type.code,
            name: getAbsenceTypeTitle(type, t('untitled-absence-type')),
            group: getAbsenceGroupLabel(type.parentEntryId, t('no-group')),
            measurement: getMeasurementLabel(editorState.settings.measurement, t)
          },
          searchText: [type.code, type.value, getAbsenceGroupLabel(type.parentEntryId, t('no-group'))]
            .filter(Boolean)
            .join(' '),
          fields: [
            { label: t('details-label-code'), value: type.code },
            { label: t('details-label-group'), value: getAbsenceGroupLabel(type.parentEntryId, t('no-group')) },
            {
              label: t('details-label-measurement'),
              value: getMeasurementLabel(editorState.settings.measurement, t)
            },
            {
              label: t('details-label-priority'),
              value: getPriorityLabel(editorState.settings.priority, t)
            },
            {
              label: t('details-label-working-time'),
              value: editorState.settings.countsAsWorkingTime ? t('details-value-yes') : t('details-value-no')
            }
          ],
          highlights: [
            {
              label: t('details-label-priority'),
              value: getPriorityLabel(editorState.settings.priority, t)
            },
            {
              label: t('details-label-measurement'),
              value: getMeasurementLabel(editorState.settings.measurement, t)
            }
          ]
        }
      }),
    [absenceTypeState.absenceTypes, usedTypeRefs, t]
  )

  const absenceTypeVersionItems = useMemo(
    () =>
      [...absenceTypeVersionsCatalog.entries]
        .sort((leftEntry, rightEntry) => {
          const leftIsActive = isAbsenceTypeVersionActive(leftEntry)
          const rightIsActive = isAbsenceTypeVersionActive(rightEntry)

          if (leftIsActive !== rightIsActive) {
            return leftIsActive ? -1 : 1
          }

          return getAbsenceTypeVersionSortValue(rightEntry) - getAbsenceTypeVersionSortValue(leftEntry)
        })
        .map(entry => {
          const isActive = isAbsenceTypeVersionActive(entry)
          const editorState = getAbsenceTypeObjectEditorState(entry.objectValue)
          const absenceTypeCode = getAbsenceTypeCodeForVersion(entry)
          const linkedType = absenceTypeState.absenceTypes.find(item => item.code === absenceTypeCode)
          const iconValue =
            entry.objectValue &&
            typeof entry.objectValue === 'object' &&
            !Array.isArray(entry.objectValue) &&
            typeof entry.objectValue.icon === 'string'
              ? entry.objectValue.icon
              : ''
          const fields = [
            { label: t('details-label-code'), value: entry.code },
            {
              label: t('details-label-group'),
              value: linkedType ? getAbsenceGroupLabel(linkedType.parentEntryId, t('no-group')) : t('no-group')
            },
            {
              label: t('details-label-type'),
              value: linkedType
                ? `${linkedType.code} - ${linkedType.value || linkedType.code}`
                : absenceTypeCode || t('details-empty-value')
            },
            {
              label: t('field-version-label'),
              value: String((entry.objectValue as any)?.version || t('details-empty-value'))
            },
            {
              label: t('field-valid-from-label'),
              value:
                formatAbsenceTypeVersionDisplayDate(String((entry.objectValue as any)?.validFrom || '')) ||
                t('details-empty-value')
            },
            {
              label: t('field-valid-to-label'),
              value:
                formatAbsenceTypeVersionDisplayDate(String((entry.objectValue as any)?.validTo || '')) ||
                t('details-empty-value')
            },
            {
              label: t('details-label-measurement'),
              value: getMeasurementLabel(editorState.settings.measurement, t)
            },
            {
              label: t('eligibility-employment-types-label'),
              value: resolveIds(
                editorState.settings.allowedEmploymentTypes,
                eligibilityData.employmentTypes,
                t('eligibility-all-hint')
              )
            },
            {
              label: t('eligibility-contract-types-label'),
              value: resolveIds(
                editorState.settings.allowedContractTypes,
                eligibilityData.contractTypes,
                t('eligibility-all-hint')
              )
            },
            {
              label: t('details-label-country'),
              value: resolveIds(
                editorState.settings.allowedCountries,
                eligibilityData.countries,
                t('eligibility-all-hint')
              )
            },
            {
              label: t('eligibility-regions-label'),
              value: getRegionDisplayValue(
                editorState.settings.allowedCountries,
                editorState.settings.allowedRegions,
                eligibilityData.regionsByCountry,
                t('eligibility-all-hint')
              )
            }
          ]
          const highlights: SetupSectionHighlight[] = [
            ...(iconValue ? [{ label: t('details-label-icon'), value: iconValue, display: 'icon' as const }] : []),
            ...(editorState.settings.color
              ? [{ label: t('details-label-color'), value: editorState.settings.color, display: 'color' as const }]
              : []),
            { label: t('details-label-priority'), value: editorState.settings.priority || t('details-empty-value') },
            {
              label: t('details-label-measurement'),
              value: getMeasurementLabel(editorState.settings.measurement, t)
            }
          ]

          return {
            id: entry.id,
            title: getAbsenceTypeVersionTitle(entry, absenceTypeState.absenceTypes, t('untitled-absence-type-version')),
            description: getAbsenceTypeVersionDescription(entry),
            statusLabel: isActive ? t('status-active') : t('status-inactive'),
            statusValue: isActive ? 'active' : 'inactive',
            canEdit: canEditAbsenceTypeVersion(entry),
            tags: [{ label: t('tag-not-in-use'), variant: 'outline' as const }],
            sortText: `${linkedType?.value || linkedType?.code || ''} ${entry.code}`,
            sortValues: {
              code: entry.code,
              name: getAbsenceTypeVersionTitle(
                entry,
                absenceTypeState.absenceTypes,
                t('untitled-absence-type-version')
              ),
              'valid-from': getAbsenceTypeVersionSortValue(entry),
              priority: parsePriority(editorState.settings.priority),
              measurement: getMeasurementLabel(editorState.settings.measurement, t),
              'absence-type': linkedType?.value || linkedType?.code || absenceTypeCode || t('details-empty-value'),
              group: linkedType ? getAbsenceGroupLabel(linkedType.parentEntryId, t('no-group')) : t('no-group'),
              country: resolveIds(
                editorState.settings.allowedCountries,
                eligibilityData.countries,
                t('eligibility-all-hint')
              ),
              'employment-types': resolveIds(
                editorState.settings.allowedEmploymentTypes,
                eligibilityData.employmentTypes,
                t('eligibility-all-hint')
              ),
              'contract-types': resolveIds(
                editorState.settings.allowedContractTypes,
                eligibilityData.contractTypes,
                t('eligibility-all-hint')
              ),
              'regions-compact': getRegionCompactValue(
                editorState.settings.allowedCountries,
                editorState.settings.allowedRegions,
                eligibilityData.regionsByCountry,
                t('eligibility-all-hint')
              )
            },
            searchText: [entry.code, entry.value, absenceTypeCode, linkedType?.value, linkedType?.code]
              .filter(Boolean)
              .join(' '),
            fields,
            highlights
          }
        }),
    [
      absenceTypeState.absenceTypes,
      absenceTypeVersionsCatalog.entries,
      eligibilityData.employmentTypes,
      eligibilityData.contractTypes,
      eligibilityData.countries,
      eligibilityData.regionsByCountry,
      t
    ]
  )

  const entitlementItems = useMemo(
    () =>
      absenceEntitlementsCatalog.entries.map(entry => {
        const editorState = getAbsenceEntitlementEditorState(
          entry.objectValue as AbsenceEntitlementRecordValues['objectValue']
        )

        const { companyValue, countryValue, contractTypesValue, employmentTypesValue } = formatEligibilityDisplayFields(
          editorState.settings,
          companies,
          eligibilityData,
          t
        )

        return {
          id: entry.id,
          title: entry.value || entry.code || t('untitled-entitlement'),
          description:
            getAbsenceEntitlementDescription(entry.objectValue as AbsenceEntitlementRecordValues['objectValue']) ||
            entry.code,
          statusLabel: isActiveByValidTo(editorState.settings.valid_to) ? t('status-active') : t('status-inactive'),
          statusValue: isActiveByValidTo(editorState.settings.valid_to) ? 'active' : 'inactive',
          sortText: `${entry.value || entry.code} ${entry.code}`,
          sortValues: {
            name: entry.value || entry.code || t('untitled-entitlement'),
            type: editorState.settings.entitlement_type || t('details-empty-value'),
            code: entry.code,
            company: companyValue,
            country: countryValue,
            'contract-types': contractTypesValue,
            'employment-types': employmentTypesValue
          },
          searchText: [entry.code, entry.value, editorState.settings.entitlement_type, editorState.settings.year_type]
            .filter(Boolean)
            .join(' '),
          tags:
            editorState.detailEntries.length === 0
              ? [{ label: t('entitlement-no-details-warning'), variant: 'destructive' as const }]
              : undefined,
          fields: [
            { label: t('details-label-code'), value: entry.code },
            {
              label: t('field-entitlement-type-label'),
              value: editorState.settings.entitlement_type || t('details-empty-value')
            },
            { label: t('field-year-type-label'), value: editorState.settings.year_type || t('details-empty-value') },
            {
              label: t('details-label-full-time'),
              value: `${editorState.settings.full_time_amount} ${editorState.settings.full_time_unit}`.trim()
            },
            { label: t('details-label-detail-count'), value: String(editorState.detailEntries.length) },
            { label: t('field-company-label'), value: companyValue },
            { label: t('details-label-country'), value: countryValue },
            { label: t('eligibility-contract-types-label'), value: contractTypesValue },
            { label: t('eligibility-employment-types-label'), value: employmentTypesValue }
          ]
        }
      }),
    [
      absenceEntitlementsCatalog.entries,
      eligibilityData.countries,
      eligibilityData.contractTypes,
      eligibilityData.employmentTypes,
      companies,
      t
    ]
  )

  const genericCatalogConfigs = {
    AbsenceGroup: {
      entityLabel: t('absence-group-entity-label'),
      title: t('absence-groups-title'),
      description: t('absence-groups-readonly-description'),
      items: absenceGroupsCatalog.entries.map(entry => ({
        id: entry.id,
        title: entry.value || entry.code,
        description: entry.code,
        statusLabel: t('status-active'),
        statusValue: 'active',
        sortText: `${entry.value || entry.code} ${entry.code}`,
        sortValues: {
          name: entry.value || entry.code,
          code: entry.code
        },
        searchText: `${entry.code} ${entry.value || ''}`,
        fields: [
          { label: t('details-label-code'), value: entry.code },
          { label: t('details-label-name'), value: entry.value || entry.code }
        ]
      })),
      sortOptions: [
        { id: 'name', label: t('details-label-name') },
        { id: 'code', label: t('details-label-code') }
      ],
      hook: absenceGroupsCatalog,
      icon: TreeStructure,
      addButtonTestId: 'absence-setup-add-group-button',
      cardTestId: 'absence-setup-groups-card'
    },
    AbsencePolicy: {
      entityLabel: t('absence-policy-entity-label'),
      title: t('absence-policies-title'),
      description: t('absence-policies-description'),
      items: absencePoliciesCatalog.entries.map(entry => {
        const editorState = getAbsencePolicyEditorState(entry.objectValue as AbsencePolicyObjectValue | undefined)

        const { companyValue, countryValue, contractTypesValue, employmentTypesValue } = formatEligibilityDisplayFields(
          editorState.settings,
          companies,
          eligibilityData,
          t
        )

        return {
          id: entry.id,
          title: entry.value || entry.code || t('absence-policy-entity-label'),
          description:
            getAbsencePolicyDescription(entry.objectValue as AbsencePolicyObjectValue | undefined) || entry.code,
          statusLabel: t('status-active'),
          statusValue: 'active',
          sortText: `${entry.value || entry.code} ${entry.code}`,
          sortValues: {
            name: entry.value || entry.code || t('absence-policy-entity-label'),
            code: entry.code,
            company: companyValue,
            country: countryValue,
            'contract-types': contractTypesValue,
            'employment-types': employmentTypesValue
          },
          searchText: [
            entry.code,
            entry.value,
            getAbsencePolicyDescription(entry.objectValue as AbsencePolicyObjectValue)
          ]
            .filter(Boolean)
            .join(' '),
          fields: [
            { label: t('details-label-code'), value: entry.code },
            { label: t('details-label-name'), value: entry.value || entry.code },
            { label: t('details-label-detail-count'), value: String(editorState.details.length) },
            { label: t('field-company-label'), value: companyValue },
            { label: t('details-label-country'), value: countryValue },
            { label: t('eligibility-contract-types-label'), value: contractTypesValue },
            { label: t('eligibility-employment-types-label'), value: employmentTypesValue }
          ]
        }
      }),
      sortOptions: [
        { id: 'name', label: t('details-label-name') },
        { id: 'code', label: t('details-label-code') }
      ],
      hook: absencePoliciesCatalog,
      icon: Shield,
      addButtonTestId: 'absence-setup-add-policy-button',
      cardTestId: 'absence-setup-policies-card'
    }
  } as const satisfies Record<'AbsenceGroup' | 'AbsencePolicy', GenericCatalogConfig>

  return {
    ...absenceTypeState,
    absenceTypeItems,
    absenceTypeVersionItems,
    entitlementItems,
    absenceGroups: absenceGroupsCatalog.entries,
    absenceTypeVersionsCatalog,
    absenceEntitlementsCatalog,
    absencePoliciesCatalog,
    genericCatalogConfigs,
    employmentTypes: eligibilityData.employmentTypes,
    contractTypes: eligibilityData.contractTypes,
    countries: eligibilityData.countries,
    regionsByCountry: eligibilityData.regionsByCountry,
    regionsLoading: eligibilityData.regionsLoading,
    fetchRegionsForCountry: eligibilityData.fetchRegionsForCountry,
    eligibilityLoading: eligibilityData.loading
  }
}
