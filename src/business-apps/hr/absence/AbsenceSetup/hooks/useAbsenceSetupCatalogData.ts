import { FolderTree, Shield } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useMemo } from 'react'
import useAbsenceTypes from '../../../core/hooks/useAbsenceTypes'
import { isSystemCatalogEntry } from '@/business-apps/hr/core/utils/catalogEntryHelpers'
import { useAbsenceCatalogEntries } from './useAbsenceCatalogEntries'
import type { AbsenceEntitlementModalValues } from '../modals/AbsenceEntitlementModal'
import {
  getAbsenceEntitlementDescription,
  getAbsenceEntitlementEditorState
} from '../utils/absenceEntitlementObjectValue'
import {
  getAbsencePolicyDescription,
  getAbsencePolicyEditorState,
  type AbsencePolicyObjectValue
} from '../utils/absencePolicyObjectValue'
import { getAbsenceGroupLabel, getAbsenceTypeTitle, type SetupSectionItem } from '../utils/absenceSetup'
import { getAbsenceTypeObjectEditorState } from '../utils/absenceTypeObjectValue'
import {
  canEditAbsenceTypeVersion,
  formatAbsenceTypeVersionDisplayDate,
  getAbsenceTypeVersionDescription,
  getAbsenceTypeCodeForVersion,
  getAbsenceTypeVersionSortValue,
  getAbsenceTypeVersionTitle,
  isAbsenceTypeVersionActive
} from '../utils/absenceTypeVersionObjectValue'

type TranslateFn = (key: string, values?: Record<string, string>) => string

export interface GenericCatalogConfig {
  entityLabel: string
  title: string
  description: string
  items: SetupSectionItem[]
  hook: ReturnType<typeof useAbsenceCatalogEntries>
  icon: LucideIcon
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

export const useAbsenceSetupCatalogData = (accessToken: string, t: TranslateFn) => {
  const absenceTypeState = useAbsenceTypes(accessToken)
  const absenceTypeVersionsCatalog = useAbsenceCatalogEntries(accessToken, 'AbsenceTypeVersion')
  const absenceEntitlementsCatalog = useAbsenceCatalogEntries(accessToken, 'AbsenceEntitlement')
  const absenceGroupsCatalog = useAbsenceCatalogEntries(accessToken, 'AbsenceGroup')
  const absencePoliciesCatalog = useAbsenceCatalogEntries(accessToken, 'AbsencePolicy')

  const absenceTypeItems = useMemo(
    () =>
      absenceTypeState.absenceTypes.map(type => {
        const editorState = getAbsenceTypeObjectEditorState(type.objectValue)
        const isSystemType = isSystemCatalogEntry({
          type: type.type,
          objectValue: type.objectValue
        })

        return {
          id: type.id,
          title: getAbsenceTypeTitle(type, t('untitled-absence-type')),
          description: `${type.code} | ${getAbsenceGroupLabel(type.parentEntryId, t('no-group'))}`,
          statusLabel: editorState.settings.display ? t('status-active') : t('status-inactive'),
          statusValue: editorState.settings.display ? 'active' : 'inactive',
          canDelete: !isSystemType,
          sortText: `${type.value || type.code} ${type.code}`,
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
              value: editorState.settings.priority || t('details-empty-value')
            },
            {
              label: t('details-label-working-time'),
              value: editorState.settings.countsAsWorkingTime ? t('details-value-yes') : t('details-value-no')
            }
          ],
          highlights: [
            {
              label: t('details-label-measurement'),
              value: getMeasurementLabel(editorState.settings.measurement, t)
            },
            {
              label: t('details-label-priority'),
              value: editorState.settings.priority || t('details-empty-value')
            }
          ]
        }
      }),
    [absenceTypeState.absenceTypes, t]
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
            }
          ]

          return {
            id: entry.id,
            title: getAbsenceTypeVersionTitle(entry, absenceTypeState.absenceTypes, t('untitled-absence-type-version')),
            description: getAbsenceTypeVersionDescription(entry),
            statusLabel: isActive ? t('status-active') : t('status-inactive'),
            statusValue: isActive ? 'active' : 'inactive',
            canEdit: canEditAbsenceTypeVersion(entry),
            sortText: `${linkedType?.value || linkedType?.code || ''} ${entry.code}`,
            searchText: [entry.code, entry.value, absenceTypeCode, linkedType?.value, linkedType?.code]
              .filter(Boolean)
              .join(' '),
            fields,
            highlights: [
              ...(iconValue ? [{ label: t('details-label-icon'), value: iconValue }] : []),
              { label: t('details-label-color'), value: editorState.settings.color || t('details-empty-value') },
              { label: t('details-label-priority'), value: editorState.settings.priority || t('details-empty-value') },
              {
                label: t('details-label-measurement'),
                value: getMeasurementLabel(editorState.settings.measurement, t)
              }
            ]
          }
        }),
    [absenceTypeState.absenceTypes, absenceTypeVersionsCatalog.entries, t]
  )

  const entitlementItems = useMemo(
    () =>
      absenceEntitlementsCatalog.entries.map(entry => {
        const editorState = getAbsenceEntitlementEditorState(
          entry.objectValue as AbsenceEntitlementModalValues['objectValue']
        )

        return {
          id: entry.id,
          title: entry.value || entry.code || t('untitled-entitlement'),
          description:
            getAbsenceEntitlementDescription(entry.objectValue as AbsenceEntitlementModalValues['objectValue']) ||
            entry.code,
          statusLabel: editorState.settings.valid_to ? t('status-inactive') : t('status-active'),
          statusValue: editorState.settings.valid_to ? 'inactive' : 'active',
          sortText: `${entry.value || entry.code} ${entry.code}`,
          searchText: [entry.code, entry.value, editorState.settings.entitlement_type, editorState.settings.year_type]
            .filter(Boolean)
            .join(' '),
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
            { label: t('details-label-detail-count'), value: String(editorState.detailEntries.length) }
          ]
        }
      }),
    [absenceEntitlementsCatalog.entries, t]
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
        searchText: `${entry.code} ${entry.value || ''}`,
        fields: [
          { label: t('details-label-code'), value: entry.code },
          { label: t('details-label-name'), value: entry.value || entry.code }
        ]
      })),
      hook: absenceGroupsCatalog,
      icon: FolderTree,
      addButtonTestId: 'absence-setup-add-group-button',
      cardTestId: 'absence-setup-groups-card'
    },
    AbsencePolicy: {
      entityLabel: t('absence-policy-entity-label'),
      title: t('absence-policies-title'),
      description: t('absence-policies-description'),
      items: absencePoliciesCatalog.entries.map(entry => {
        const editorState = getAbsencePolicyEditorState(entry.objectValue as AbsencePolicyObjectValue | undefined)

        return {
          id: entry.id,
          title: entry.value || entry.code || t('absence-policy-entity-label'),
          description:
            getAbsencePolicyDescription(entry.objectValue as AbsencePolicyObjectValue | undefined) || entry.code,
          statusLabel: t('status-active'),
          statusValue: 'active',
          sortText: `${entry.value || entry.code} ${entry.code}`,
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
            { label: t('details-label-detail-count'), value: String(editorState.details.length) }
          ]
        }
      }),
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
    genericCatalogConfigs
  }
}
