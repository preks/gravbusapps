import { useState } from 'react'
import { toast } from '@newwork/nw-design-system'
import type { CatalogEntry } from '@/common/types/CatalogTypes'
import type { AbsenceType } from '@/common/types/AbsenceTypeObjectType'
import { buildCatalogTranslations } from '@/business-apps/hr/core/utils/catalogEntryHelpers'
import type { AbsenceCatalogEntryPayload } from './useAbsenceCatalogEntries'
import { useAbsenceSetupCatalogData } from './useAbsenceSetupCatalogData'
import type { AbsenceEntitlementModalValues } from '../modals/AbsenceEntitlementModal'
import type { AbsencePolicyModalValues } from '../modals/AbsencePolicyModal'
import type { GenericCatalogEntryModalValues } from '../modals/GenericCatalogEntryModal'
import type { AbsenceTypeModalValues } from '../modals/AbsenceTypeModal'
import { getAbsenceTypeTitle, type AbsenceTypeVersionFormValues } from '../utils/absenceSetup'
import { buildAbsenceTypeVersionPayload } from '../utils/absenceTypeVersionObjectValue'
import { buildAbsenceSetupSectionCards, type AbsenceSetupSectionCardConfig } from '../utils/absenceSetupSectionCards'
type GenericCatalogKey = 'AbsenceGroup' | 'AbsencePolicy'
type TranslateFn = (key: string, values?: Record<string, string>) => string

interface ErrorListItem {
  detail?: unknown
  message?: unknown
  title?: unknown
}

interface ErrorPayload {
  message?: unknown
  error?: unknown
  detail?: unknown
  details?: unknown
  responseData?: {
    message?: unknown
    error?: unknown
    detail?: unknown
    details?: unknown
    errors?: ErrorListItem[]
  }
  errors?: ErrorListItem[]
}

const isRecord = (value: unknown): value is Record<string, unknown> => Boolean(value) && typeof value === 'object'

const getFirstNonEmptyString = (...values: unknown[]): string | null => {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) {
      return value
    }
  }

  return null
}

const getListErrorDetail = (errors?: ErrorListItem[]): string | null => {
  const firstError = errors?.[0]

  return getFirstNonEmptyString(firstError?.detail, firstError?.message, firstError?.title)
}

const getPayloadErrorDetail = (payload: ErrorPayload | null): string | null => {
  if (!payload) {
    return null
  }

  return (
    getListErrorDetail(payload.responseData?.errors) ||
    getListErrorDetail(payload.errors) ||
    getFirstNonEmptyString(
      payload.responseData?.detail,
      payload.responseData?.details,
      payload.responseData?.message,
      payload.responseData?.error,
      payload.detail,
      payload.details,
      payload.message,
      payload.error
    )
  )
}

const getErrorDetail = (error: unknown, fallback: string): string => {
  const payload = isRecord(error) ? (error as ErrorPayload) : null
  const resolved = getPayloadErrorDetail(payload)
  if (resolved) {
    return resolved
  }

  if (error instanceof Error && error.message.trim()) {
    return error.message
  }

  return fallback
}

interface PendingDeleteState {
  entityLabel: string
  name: string
  onConfirm: () => Promise<void>
  blockedReason?: string
}

export const useAbsenceSetupController = (accessToken: string, t: TranslateFn) => {
  const [isAbsenceTypeModalOpen, setIsAbsenceTypeModalOpen] = useState(false)
  const [isAbsenceTypeVersionModalOpen, setIsAbsenceTypeVersionModalOpen] = useState(false)
  const [isAbsenceEntitlementModalOpen, setIsAbsenceEntitlementModalOpen] = useState(false)
  const [isAbsencePolicyModalOpen, setIsAbsencePolicyModalOpen] = useState(false)
  const [activeGenericCatalog, setActiveGenericCatalog] = useState<GenericCatalogKey | null>(null)
  const [selectedAbsenceType, setSelectedAbsenceType] = useState<AbsenceType | null>(null)
  const [selectedVersionEntry, setSelectedVersionEntry] = useState<CatalogEntry | null>(null)
  const [selectedEntitlement, setSelectedEntitlement] = useState<CatalogEntry | null>(null)
  const [selectedPolicy, setSelectedPolicy] = useState<CatalogEntry | null>(null)
  const [selectedGenericEntry, setSelectedGenericEntry] = useState<CatalogEntry | null>(null)
  const [pendingDelete, setPendingDelete] = useState<PendingDeleteState | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [deleteErrorMessage, setDeleteErrorMessage] = useState('')

  const {
    absenceTypes,
    absenceGroups,
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
    absencePoliciesCatalog,
    genericCatalogConfigs
  } = useAbsenceSetupCatalogData(accessToken, t)

  const openDeleteDialog = (
    entityLabel: string,
    name: string,
    onConfirm: () => Promise<void>,
    blockedReason?: string
  ) => {
    setDeleteErrorMessage('')
    setPendingDelete({ entityLabel, name, onConfirm, blockedReason })
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

  const closeAbsencePolicyModal = () => {
    setIsAbsencePolicyModalOpen(false)
    setSelectedPolicy(null)
  }

  const closeGenericCatalogModal = () => {
    setActiveGenericCatalog(null)
    setSelectedGenericEntry(null)
  }

  const handleSaveAbsenceType = async (formValues: AbsenceTypeModalValues) => {
    try {
      if (selectedAbsenceType?.id) {
        await updateAbsenceType(selectedAbsenceType.id, {
          code: selectedAbsenceType.code,
          value: formValues.translations.enUS,
          parentEntryId: formValues.parentEntryId,
          localeCode: selectedAbsenceType.localeCode || 'en-US',
          translations: buildCatalogTranslations(formValues.translations)
        })
      } else {
        await createAbsenceType({
          code: formValues.code,
          value: formValues.translations.enUS,
          parentEntryId: formValues.parentEntryId,
          localeCode: 'en-US',
          translations: buildCatalogTranslations(formValues.translations)
        })
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
        await absenceTypeVersionsCatalog.updateEntry(selectedVersionEntry.id, {
          id: selectedVersionEntry.id,
          code: selectedVersionEntry.code,
          value: payload.value,
          type: selectedVersionEntry.type,
          objectValue: payload.objectValue,
          localeCode: selectedVersionEntry.localeCode || 'en-US',
          translations: payload.translations
        })
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
    const normalizedCode = formValues.code.trim()
    const payload: AbsenceCatalogEntryPayload = {
      code: normalizedCode,
      value: formValues.translations.enUS,
      objectValue: formValues.objectValue,
      localeCode: 'en-US',
      translations: buildCatalogTranslations(formValues.translations)
    }

    try {
      const hasDuplicateCode = absenceEntitlementsCatalog.entries.some(
        entry =>
          entry.id !== selectedEntitlement?.id && entry.code.trim().toLowerCase() === normalizedCode.toLowerCase()
      )

      if (hasDuplicateCode) {
        throw new Error(t('validation-duplicate-code', { code: normalizedCode }))
      }

      if (selectedEntitlement?.id) {
        await absenceEntitlementsCatalog.updateEntry(selectedEntitlement.id, {
          id: selectedEntitlement.id,
          code: selectedEntitlement.code,
          value: payload.value,
          type: selectedEntitlement.type,
          objectValue: payload.objectValue,
          localeCode: selectedEntitlement.localeCode || 'en-US',
          translations: payload.translations
        })
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
      toast.error(message)
      throw saveError
    }
  }

  const handleSaveAbsencePolicy = async (formValues: AbsencePolicyModalValues) => {
    const payload: AbsenceCatalogEntryPayload = {
      code: formValues.code,
      value: formValues.translations.enUS,
      objectValue: formValues.objectValue,
      localeCode: 'en-US',
      translations: buildCatalogTranslations(formValues.translations)
    }

    try {
      if (selectedPolicy?.id) {
        await absencePoliciesCatalog.updateEntry(selectedPolicy.id, {
          id: selectedPolicy.id,
          code: selectedPolicy.code,
          value: payload.value,
          type: selectedPolicy.type,
          objectValue: payload.objectValue,
          localeCode: selectedPolicy.localeCode || 'en-US',
          translations: payload.translations
        })
      } else {
        await absencePoliciesCatalog.createEntry(payload)
      }
      toast.success(t('save-catalog-entry-success', { entity: t('absence-policy-entity-label') }))
      closeAbsencePolicyModal()
    } catch (saveError) {
      const message =
        saveError instanceof Error
          ? saveError.message
          : t('save-catalog-entry-error', { entity: t('absence-policy-entity-label') })
      console.error('Error saving absence policy:', message)
      toast.error(t('save-catalog-entry-error', { entity: t('absence-policy-entity-label') }))
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
        await activeCatalog.hook.updateEntry(selectedGenericEntry.id, {
          id: selectedGenericEntry.id,
          code: selectedGenericEntry.code,
          value: formValues.translations.enUS,
          type: selectedGenericEntry.type,
          parentEntryId: selectedGenericEntry.parentEntryId,
          objectValue: selectedGenericEntry.objectValue,
          localeCode: selectedGenericEntry.localeCode || 'en-US',
          translations: buildCatalogTranslations(formValues.translations)
        })
      } else {
        await activeCatalog.hook.createEntry({
          code: formValues.code,
          value: formValues.translations.enUS,
          localeCode: 'en-US',
          translations: buildCatalogTranslations(formValues.translations)
        })
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
      setDeleteErrorMessage('')
      setPendingDelete(null)
    } catch (deleteError) {
      const message = getErrorDetail(
        deleteError,
        t('delete-catalog-entry-error', { entity: pendingDelete.entityLabel })
      )
      console.error('Error deleting catalog entry:', message)
      setDeleteErrorMessage(message)
      toast.error(message)
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
      const absenceTypeName = getAbsenceTypeTitle(entry, t('untitled-absence-type'))

      openDeleteDialog(t('absence-type-entity-label'), absenceTypeName, () => deleteAbsenceType(entry.id))
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
      if (catalogKey === 'AbsencePolicy') {
        setSelectedPolicy(null)
        setIsAbsencePolicyModalOpen(true)
        return
      }
      setSelectedGenericEntry(null)
      setActiveGenericCatalog(catalogKey)
    },
    onEditGenericCatalog: (catalogKey, entry) => {
      if (catalogKey === 'AbsencePolicy') {
        setSelectedPolicy(entry)
        setIsAbsencePolicyModalOpen(true)
        return
      }
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
    absenceGroups,
    absenceTypeVersions: absenceTypeVersionsCatalog.entries,
    isAbsenceTypeModalOpen,
    isAbsenceTypeVersionModalOpen,
    isAbsenceEntitlementModalOpen,
    isAbsencePolicyModalOpen,
    isGenericCatalogModalOpen: Boolean(activeGenericCatalog),
    genericEntityLabel: activeGenericCatalog ? genericCatalogConfigs[activeGenericCatalog].entityLabel : '',
    selectedAbsenceType,
    selectedVersionEntry,
    selectedEntitlement,
    selectedPolicy,
    selectedGenericEntry,
    sectionCards,
    pendingDelete,
    isDeleting,
    deleteErrorMessage,
    closeAbsenceTypeModal,
    closeAbsenceTypeVersionModal,
    closeAbsenceEntitlementModal,
    closeAbsencePolicyModal,
    closeGenericCatalogModal,
    handleSaveAbsenceType,
    handleSaveAbsenceTypeVersion,
    handleSaveAbsenceEntitlement,
    handleSaveAbsencePolicy,
    handleSaveGenericCatalogEntry,
    handleConfirmDelete,
    clearPendingDelete: () => {
      setDeleteErrorMessage('')
      setPendingDelete(null)
    }
  }
}
