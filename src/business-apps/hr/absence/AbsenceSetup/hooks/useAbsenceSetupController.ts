import { useState } from 'react'
import { toast } from '@newwork/nw-design-system'
import type { CatalogEntry } from '@/common/types/CatalogTypes'
import type { AbsenceType } from '@/common/types/AbsenceTypeObjectType'
import type { AbsenceCatalogEntryPayload } from './useAbsenceCatalogEntries'
import { useAbsenceSetupCatalogData } from './useAbsenceSetupCatalogData'
import type { AbsenceEntitlementModalValues } from '../modals/AbsenceEntitlementModal'
import type { GenericCatalogEntryModalValues } from '../modals/GenericCatalogEntryModal'
import type { AbsenceTypeModalValues } from '../modals/AbsenceTypeModal'
import { getAbsenceTypeTitle, type AbsenceTypeVersionFormValues } from '../utils/absenceSetup'
import { buildAbsenceTypeVersionPayload } from '../utils/absenceTypeVersionObjectValue'
import { buildAbsenceSetupSectionCards, type AbsenceSetupSectionCardConfig } from '../utils/absenceSetupSectionCards'
type GenericCatalogKey = 'AbsenceGroup' | 'AbsencePolicy' | 'AbsenceReason'
type TranslateFn = (key: string, values?: Record<string, string>) => string
interface PendingDeleteState {
  entityLabel: string
  name: string
  onConfirm: () => Promise<void>
}

export const useAbsenceSetupController = (accessToken: string, t: TranslateFn) => {
  const [isAbsenceTypeModalOpen, setIsAbsenceTypeModalOpen] = useState(false)
  const [isAbsenceTypeVersionModalOpen, setIsAbsenceTypeVersionModalOpen] = useState(false)
  const [isAbsenceEntitlementModalOpen, setIsAbsenceEntitlementModalOpen] = useState(false)
  const [activeGenericCatalog, setActiveGenericCatalog] = useState<GenericCatalogKey | null>(null)
  const [selectedAbsenceType, setSelectedAbsenceType] = useState<AbsenceType | null>(null)
  const [selectedVersionEntry, setSelectedVersionEntry] = useState<CatalogEntry | null>(null)
  const [selectedEntitlement, setSelectedEntitlement] = useState<CatalogEntry | null>(null)
  const [selectedGenericEntry, setSelectedGenericEntry] = useState<CatalogEntry | null>(null)
  const [pendingDelete, setPendingDelete] = useState<PendingDeleteState | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const {
    absenceTypes,
    loading,
    error,
    createAbsenceType,
    updateAbsenceType,
    deleteAbsenceType,
    absenceTypeItems,
    absenceTypeVersionItems,
    entitlementItems,
    absenceTypeVersionsCatalog,
    absenceEntitlementsCatalog,
    genericCatalogConfigs
  } = useAbsenceSetupCatalogData(accessToken, t)

  const openDeleteDialog = (entityLabel: string, name: string, onConfirm: () => Promise<void>) => {
    setPendingDelete({ entityLabel, name, onConfirm })
  }

  const closeAbsenceTypeModal = () => {
    setIsAbsenceTypeModalOpen(false)
    setSelectedAbsenceType(null)
  }

  const closeAbsenceTypeVersionModal = () => {
    setIsAbsenceTypeVersionModalOpen(false)
    setSelectedVersionEntry(null)
  }

  const closeAbsenceEntitlementModal = () => {
    setIsAbsenceEntitlementModalOpen(false)
    setSelectedEntitlement(null)
  }

  const closeGenericCatalogModal = () => {
    setActiveGenericCatalog(null)
    setSelectedGenericEntry(null)
  }

  const handleSaveAbsenceType = async (formValues: AbsenceTypeModalValues) => {
    const payload = {
      code: formValues.code,
      value: formValues.name,
      objectValue: formValues.objectValue,
      localeCode: 'en-US',
      parentEntryId: formValues.group ? `AbsenceGroup:v1:${formValues.group}` : '',
      translations: [
        { localeCode: 'en-US', value: formValues.name || '' },
        { localeCode: 'de-DE', value: formValues.name_de || '' },
        { localeCode: 'ro-RO', value: formValues.name_ro || '' }
      ].filter(translation => translation.value)
    }

    try {
      if (selectedAbsenceType?.id) {
        await updateAbsenceType(selectedAbsenceType.id, payload)
      } else {
        await createAbsenceType(payload)
      }
      toast.success(t('save-absence-type-success'))
      closeAbsenceTypeModal()
    } catch (saveError) {
      const message = saveError instanceof Error ? saveError.message : t('save-absence-type-error')
      console.error('Error saving absence type:', message)
      toast.error(t('save-absence-type-error'))
      throw saveError
    }
  }

  const handleSaveAbsenceTypeVersion = async (formValues: AbsenceTypeVersionFormValues) => {
    const payload = buildAbsenceTypeVersionPayload(formValues, absenceTypes)

    try {
      if (selectedVersionEntry?.id) {
        await absenceTypeVersionsCatalog.updateEntry(selectedVersionEntry.id, payload)
      } else {
        await absenceTypeVersionsCatalog.createEntry(payload)
      }
      toast.success(t('save-catalog-entry-success', { entity: t('absence-type-version-entity-label') }))
      closeAbsenceTypeVersionModal()
    } catch (saveError) {
      const message =
        saveError instanceof Error
          ? saveError.message
          : t('save-catalog-entry-error', { entity: t('absence-type-version-entity-label') })
      console.error('Error saving absence type version:', message)
      toast.error(t('save-catalog-entry-error', { entity: t('absence-type-version-entity-label') }))
      throw saveError
    }
  }

  const handleSaveAbsenceEntitlement = async (formValues: AbsenceEntitlementModalValues) => {
    const payload: AbsenceCatalogEntryPayload = {
      code: formValues.code,
      value: formValues.name,
      objectValue: formValues.objectValue,
      localeCode: 'en-US',
      translations: []
    }

    try {
      if (selectedEntitlement?.id) {
        await absenceEntitlementsCatalog.updateEntry(selectedEntitlement.id, payload)
      } else {
        await absenceEntitlementsCatalog.createEntry(payload)
      }
      toast.success(t('save-catalog-entry-success', { entity: t('absence-entitlement-entity-label') }))
      closeAbsenceEntitlementModal()
    } catch (saveError) {
      const message =
        saveError instanceof Error
          ? saveError.message
          : t('save-catalog-entry-error', { entity: t('absence-entitlement-entity-label') })
      console.error('Error saving absence entitlement:', message)
      toast.error(t('save-catalog-entry-error', { entity: t('absence-entitlement-entity-label') }))
      throw saveError
    }
  }

  const handleSaveGenericCatalogEntry = async (formValues: GenericCatalogEntryModalValues) => {
    if (!activeGenericCatalog) {
      return
    }

    const activeCatalog = genericCatalogConfigs[activeGenericCatalog]

    try {
      if (selectedGenericEntry?.id) {
        await activeCatalog.hook.updateEntry(selectedGenericEntry.id, formValues)
      } else {
        await activeCatalog.hook.createEntry({ ...formValues, localeCode: 'en-US', translations: [] })
      }
      toast.success(t('save-catalog-entry-success', { entity: activeCatalog.entityLabel }))
      closeGenericCatalogModal()
    } catch (saveError) {
      const message =
        saveError instanceof Error
          ? saveError.message
          : t('save-catalog-entry-error', { entity: activeCatalog.entityLabel })
      console.error(`Error saving ${activeGenericCatalog}:`, message)
      toast.error(t('save-catalog-entry-error', { entity: activeCatalog.entityLabel }))
      throw saveError
    }
  }

  const handleConfirmDelete = async () => {
    if (!pendingDelete) {
      return
    }

    try {
      setIsDeleting(true)
      await pendingDelete.onConfirm()
      toast.success(t('delete-catalog-entry-success', { entity: pendingDelete.entityLabel }))
      setPendingDelete(null)
    } catch (deleteError) {
      const message =
        deleteError instanceof Error
          ? deleteError.message
          : t('delete-catalog-entry-error', { entity: pendingDelete.entityLabel })
      console.error('Error deleting catalog entry:', message)
      toast.error(t('delete-catalog-entry-error', { entity: pendingDelete.entityLabel }))
    } finally {
      setIsDeleting(false)
    }
  }

  const sectionCards: AbsenceSetupSectionCardConfig[] = buildAbsenceSetupSectionCards({
    t,
    absenceTypes,
    absenceTypeItems,
    absenceTypeLoading: loading,
    absenceTypeError: error?.message,
    absenceTypeVersionItems,
    absenceTypeVersions: absenceTypeVersionsCatalog.entries,
    absenceTypeVersionLoading: absenceTypeVersionsCatalog.loading,
    absenceTypeVersionError: absenceTypeVersionsCatalog.error?.message,
    entitlementItems,
    entitlements: absenceEntitlementsCatalog.entries,
    entitlementLoading: absenceEntitlementsCatalog.loading,
    entitlementError: absenceEntitlementsCatalog.error?.message,
    genericCatalogConfigs,
    onAddAbsenceType: () => {
      setSelectedAbsenceType(null)
      setIsAbsenceTypeModalOpen(true)
    },
    onEditAbsenceType: entry => {
      setSelectedAbsenceType(entry)
      setIsAbsenceTypeModalOpen(true)
    },
    onDeleteAbsenceType: entry => {
      openDeleteDialog(t('absence-type-entity-label'), getAbsenceTypeTitle(entry, t('untitled-absence-type')), () =>
        deleteAbsenceType(entry.id)
      )
    },
    onAddAbsenceTypeVersion: () => {
      setSelectedVersionEntry(null)
      setIsAbsenceTypeVersionModalOpen(true)
    },
    onEditAbsenceTypeVersion: entry => {
      setSelectedVersionEntry(entry)
      setIsAbsenceTypeVersionModalOpen(true)
    },
    onDeleteAbsenceTypeVersion: entry => {
      openDeleteDialog(t('absence-type-version-entity-label'), entry.value || entry.code, () =>
        absenceTypeVersionsCatalog.deleteEntry(entry.id)
      )
    },
    onAddEntitlement: () => {
      setSelectedEntitlement(null)
      setIsAbsenceEntitlementModalOpen(true)
    },
    onEditEntitlement: entry => {
      setSelectedEntitlement(entry)
      setIsAbsenceEntitlementModalOpen(true)
    },
    onDeleteEntitlement: entry => {
      openDeleteDialog(t('absence-entitlement-entity-label'), entry.value || entry.code, () =>
        absenceEntitlementsCatalog.deleteEntry(entry.id)
      )
    },
    onAddGenericCatalog: catalogKey => {
      setSelectedGenericEntry(null)
      setActiveGenericCatalog(catalogKey)
    },
    onEditGenericCatalog: (catalogKey, entry) => {
      setSelectedGenericEntry(entry)
      setActiveGenericCatalog(catalogKey)
    },
    onDeleteGenericCatalog: (catalogKey, entry) => {
      const config = genericCatalogConfigs[catalogKey]
      openDeleteDialog(config.entityLabel, entry.value || entry.code, () => config.hook.deleteEntry(entry.id))
    }
  })

  return {
    absenceTypes,
    isAbsenceTypeModalOpen,
    isAbsenceTypeVersionModalOpen,
    isAbsenceEntitlementModalOpen,
    isGenericCatalogModalOpen: Boolean(activeGenericCatalog),
    genericEntityLabel: activeGenericCatalog ? genericCatalogConfigs[activeGenericCatalog].entityLabel : '',
    selectedAbsenceType,
    selectedVersionEntry,
    selectedEntitlement,
    selectedGenericEntry,
    sectionCards,
    pendingDelete,
    isDeleting,
    closeAbsenceTypeModal,
    closeAbsenceTypeVersionModal,
    closeAbsenceEntitlementModal,
    closeGenericCatalogModal,
    handleSaveAbsenceType,
    handleSaveAbsenceTypeVersion,
    handleSaveAbsenceEntitlement,
    handleSaveGenericCatalogEntry,
    handleConfirmDelete,
    clearPendingDelete: () => setPendingDelete(null)
  }
}
