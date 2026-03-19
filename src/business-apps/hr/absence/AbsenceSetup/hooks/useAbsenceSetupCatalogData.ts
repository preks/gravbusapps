import { FileText, FolderTree, Shield } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useMemo } from 'react'
import useAbsenceTypes from '../../../core/hooks/useAbsenceTypes'
import { useAbsenceCatalogEntries } from './useAbsenceCatalogEntries'
import type { AbsenceEntitlementModalValues } from '../modals/AbsenceEntitlementModal'
import { getAbsenceEntitlementDescription } from '../utils/absenceEntitlementObjectValue'
import { getAbsencePolicyDescription, type AbsencePolicyObjectValue } from '../utils/absencePolicyObjectValue'
import { getAbsenceGroupLabel, getAbsenceTypeTitle, type SetupSectionItem } from '../utils/absenceSetup'
import {
  canEditAbsenceTypeVersion,
  getAbsenceTypeVersionDescription,
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

const mapGenericItems = (entries: ReturnType<typeof useAbsenceCatalogEntries>['entries']) =>
  entries.map(entry => ({
    id: entry.id,
    title: entry.value || entry.code,
    description: entry.code
  }))

export const useAbsenceSetupCatalogData = (accessToken: string, t: TranslateFn) => {
  const absenceTypeState = useAbsenceTypes(accessToken)
  const absenceTypeVersionsCatalog = useAbsenceCatalogEntries(accessToken, 'AbsenceTypeVersion')
  const absenceEntitlementsCatalog = useAbsenceCatalogEntries(accessToken, 'AbsenceEntitlement')
  const absenceGroupsCatalog = useAbsenceCatalogEntries(accessToken, 'AbsenceGroup')
  const absencePoliciesCatalog = useAbsenceCatalogEntries(accessToken, 'AbsencePolicy')
  const absenceReasonsCatalog = useAbsenceCatalogEntries(accessToken, 'AbsenceReason')

  const absenceTypeItems = useMemo(
    () =>
      absenceTypeState.absenceTypes.map(type => ({
        id: type.id,
        title: getAbsenceTypeTitle(type, t('untitled-absence-type')),
        description: getAbsenceGroupLabel(type.parentEntryId, t('no-group'))
      })),
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

          return {
            id: entry.id,
            title: getAbsenceTypeVersionTitle(entry, absenceTypeState.absenceTypes, t('untitled-absence-type-version')),
            description: getAbsenceTypeVersionDescription(entry),
            statusLabel: isActive ? t('status-active') : t('status-inactive'),
            canEdit: canEditAbsenceTypeVersion(entry)
          }
        }),
    [absenceTypeState.absenceTypes, absenceTypeVersionsCatalog.entries, t]
  )

  const entitlementItems = useMemo(
    () =>
      absenceEntitlementsCatalog.entries.map(entry => ({
        id: entry.id,
        title: entry.value || entry.code || t('untitled-entitlement'),
        description:
          getAbsenceEntitlementDescription(entry.objectValue as AbsenceEntitlementModalValues['objectValue']) ||
          entry.code
      })),
    [absenceEntitlementsCatalog.entries, t]
  )

  const genericCatalogConfigs = {
    AbsenceGroup: {
      entityLabel: t('absence-group-entity-label'),
      title: t('absence-groups-title'),
      description: t('absence-groups-description'),
      items: mapGenericItems(absenceGroupsCatalog.entries),
      hook: absenceGroupsCatalog,
      icon: FolderTree,
      addButtonTestId: 'absence-setup-add-group-button',
      cardTestId: 'absence-setup-groups-card'
    },
    AbsencePolicy: {
      entityLabel: t('absence-policy-entity-label'),
      title: t('absence-policies-title'),
      description: t('absence-policies-description'),
      items: absencePoliciesCatalog.entries.map(entry => ({
        id: entry.id,
        title: entry.value || entry.code || t('absence-policy-entity-label'),
        description:
          getAbsencePolicyDescription(entry.objectValue as AbsencePolicyObjectValue | undefined) || entry.code
      })),
      hook: absencePoliciesCatalog,
      icon: Shield,
      addButtonTestId: 'absence-setup-add-policy-button',
      cardTestId: 'absence-setup-policies-card'
    },
    AbsenceReason: {
      entityLabel: t('absence-reason-entity-label'),
      title: t('absence-reasons-title'),
      description: t('absence-reasons-description'),
      items: mapGenericItems(absenceReasonsCatalog.entries),
      hook: absenceReasonsCatalog,
      icon: FileText,
      addButtonTestId: 'absence-setup-add-reason-button',
      cardTestId: 'absence-setup-reasons-card'
    }
  } as const satisfies Record<'AbsenceGroup' | 'AbsencePolicy' | 'AbsenceReason', GenericCatalogConfig>

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
