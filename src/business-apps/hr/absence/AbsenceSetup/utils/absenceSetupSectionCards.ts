import { Calendar, Clock3, Wallet } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { CatalogEntry } from '@/common/types/CatalogTypes'
import type { AbsenceType } from '@/common/types/AbsenceTypeObjectType'
import type { SetupSectionItem } from './absenceSetup'
import type { GenericCatalogConfig } from '../hooks/useAbsenceSetupCatalogData'

type TranslateFn = (key: string, values?: Record<string, string>) => string
type GenericCatalogKey = 'AbsenceGroup' | 'AbsencePolicy'

export interface AbsenceSetupSectionCardConfig {
  icon: LucideIcon
  title: string
  entityLabel: string
  description: string
  items: SetupSectionItem[]
  isLoading: boolean
  errorMessage?: string
  onAdd: () => void
  onEdit: (id: string) => void
  onDelete: (id: string) => void
  addButtonTestId: string
  cardTestId: string
  showAddAction?: boolean
  showDeleteAction?: boolean
}

interface BuildAbsenceSetupSectionCardsArgs {
  t: TranslateFn
  absenceTypes: AbsenceType[]
  absenceTypeItems: SetupSectionItem[]
  absenceTypeLoading: boolean
  absenceTypeError?: string
  absenceTypeVersionItems: SetupSectionItem[]
  absenceTypeVersions: CatalogEntry[]
  absenceTypeVersionLoading: boolean
  absenceTypeVersionError?: string
  entitlementItems: SetupSectionItem[]
  entitlements: CatalogEntry[]
  entitlementLoading: boolean
  entitlementError?: string
  genericCatalogConfigs: Record<GenericCatalogKey, GenericCatalogConfig>
  onAddAbsenceType: () => void
  onEditAbsenceType: (entry: AbsenceType) => void
  onDeleteAbsenceType: (entry: AbsenceType) => void
  onAddAbsenceTypeVersion: () => void
  onEditAbsenceTypeVersion: (entry: CatalogEntry) => void
  onDeleteAbsenceTypeVersion: (entry: CatalogEntry) => void
  onAddEntitlement: () => void
  onEditEntitlement: (entry: CatalogEntry) => void
  onDeleteEntitlement: (entry: CatalogEntry) => void
  onAddGenericCatalog: (catalogKey: GenericCatalogKey) => void
  onEditGenericCatalog: (catalogKey: GenericCatalogKey, entry: CatalogEntry) => void
  onDeleteGenericCatalog: (catalogKey: GenericCatalogKey, entry: CatalogEntry) => void
}

export const buildAbsenceSetupSectionCards = ({
  t,
  absenceTypes,
  absenceTypeItems,
  absenceTypeLoading,
  absenceTypeError,
  absenceTypeVersionItems,
  absenceTypeVersions,
  absenceTypeVersionLoading,
  absenceTypeVersionError,
  entitlementItems,
  entitlements,
  entitlementLoading,
  entitlementError,
  genericCatalogConfigs,
  onAddAbsenceType,
  onEditAbsenceType,
  onDeleteAbsenceType,
  onAddAbsenceTypeVersion,
  onEditAbsenceTypeVersion,
  onDeleteAbsenceTypeVersion,
  onAddEntitlement,
  onEditEntitlement,
  onDeleteEntitlement,
  onAddGenericCatalog,
  onEditGenericCatalog,
  onDeleteGenericCatalog
}: BuildAbsenceSetupSectionCardsArgs): AbsenceSetupSectionCardConfig[] => [
  {
    icon: genericCatalogConfigs.AbsenceGroup.icon,
    title: genericCatalogConfigs.AbsenceGroup.title,
    entityLabel: genericCatalogConfigs.AbsenceGroup.entityLabel,
    description: genericCatalogConfigs.AbsenceGroup.description,
    items: genericCatalogConfigs.AbsenceGroup.items,
    isLoading: genericCatalogConfigs.AbsenceGroup.hook.loading,
    errorMessage: genericCatalogConfigs.AbsenceGroup.hook.error?.message,
    onAdd: () => onAddGenericCatalog('AbsenceGroup'),
    onEdit: itemId => {
      const entry = genericCatalogConfigs.AbsenceGroup.hook.entries.find(item => item.id === itemId)
      if (entry) onEditGenericCatalog('AbsenceGroup', entry)
    },
    onDelete: itemId => {
      const entry = genericCatalogConfigs.AbsenceGroup.hook.entries.find(item => item.id === itemId)
      if (entry) onDeleteGenericCatalog('AbsenceGroup', entry)
    },
    addButtonTestId: genericCatalogConfigs.AbsenceGroup.addButtonTestId,
    cardTestId: genericCatalogConfigs.AbsenceGroup.cardTestId,
    showAddAction: false,
    showDeleteAction: false
  },
  {
    icon: Calendar,
    title: t('absence-types-title'),
    entityLabel: t('absence-type-entity-label'),
    description: t('absence-types-description'),
    items: absenceTypeItems,
    isLoading: absenceTypeLoading,
    errorMessage: absenceTypeError,
    onAdd: onAddAbsenceType,
    onEdit: itemId => {
      const absenceType = absenceTypes.find(item => item.id === itemId)
      if (absenceType) onEditAbsenceType(absenceType)
    },
    onDelete: itemId => {
      const absenceType = absenceTypes.find(item => item.id === itemId)
      if (absenceType) onDeleteAbsenceType(absenceType)
    },
    addButtonTestId: 'absence-setup-add-type-button',
    cardTestId: 'absence-setup-types-card'
  },
  {
    icon: Clock3,
    title: t('absence-type-versions-title'),
    entityLabel: t('absence-type-version-entity-label'),
    description: t('absence-type-versions-description'),
    items: absenceTypeVersionItems,
    isLoading: absenceTypeVersionLoading,
    errorMessage: absenceTypeVersionError,
    onAdd: onAddAbsenceTypeVersion,
    onEdit: itemId => {
      const entry = absenceTypeVersions.find(item => item.id === itemId)
      if (entry) onEditAbsenceTypeVersion(entry)
    },
    onDelete: itemId => {
      const entry = absenceTypeVersions.find(item => item.id === itemId)
      if (entry) onDeleteAbsenceTypeVersion(entry)
    },
    addButtonTestId: 'absence-setup-add-version-button',
    cardTestId: 'absence-setup-versions-card'
  },
  {
    icon: Wallet,
    title: t('entitlement-rules-title'),
    entityLabel: t('absence-entitlement-entity-label'),
    description: t('entitlement-rules-description'),
    items: entitlementItems,
    isLoading: entitlementLoading,
    errorMessage: entitlementError,
    onAdd: onAddEntitlement,
    onEdit: itemId => {
      const entry = entitlements.find(item => item.id === itemId)
      if (entry) onEditEntitlement(entry)
    },
    onDelete: itemId => {
      const entry = entitlements.find(item => item.id === itemId)
      if (entry) onDeleteEntitlement(entry)
    },
    addButtonTestId: 'absence-setup-add-entitlement-button',
    cardTestId: 'absence-setup-entitlements-card'
  },
  ...(['AbsencePolicy'] as const).map(catalogKey => {
    const config = genericCatalogConfigs[catalogKey]

    return {
      icon: config.icon,
      title: config.title,
      entityLabel: config.entityLabel,
      description: config.description,
      items: config.items,
      isLoading: config.hook.loading,
      errorMessage: config.hook.error?.message,
      onAdd: () => onAddGenericCatalog(catalogKey),
      onEdit: itemId => {
        const entry = config.hook.entries.find(item => item.id === itemId)
        if (entry) onEditGenericCatalog(catalogKey, entry)
      },
      onDelete: itemId => {
        const entry = config.hook.entries.find(item => item.id === itemId)
        if (entry) onDeleteGenericCatalog(catalogKey, entry)
      },
      addButtonTestId: config.addButtonTestId,
      cardTestId: config.cardTestId
    }
  })
]
