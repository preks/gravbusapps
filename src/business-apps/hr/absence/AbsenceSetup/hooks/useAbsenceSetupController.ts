import { useState } from 'react'
import { toast } from '@newwork/nw-design-system'
import type { CatalogEntry } from '@/common/types/CatalogTypes'
import type { AbsenceType } from '@/common/types/AbsenceTypeObjectType'
import { buildCatalogTranslations, isSystemCatalogEntry } from '@/business-apps/hr/core/utils/catalogEntryHelpers'
import { useCompanySelection } from '@/business-apps/fin/expenses/apps/expense-settings/hooks/useCompanySelection'
import type { AbsenceCatalogEntryPayload } from './useAbsenceCatalogEntries'
import { useAbsenceSetupCatalogData } from './useAbsenceSetupCatalogData'
import type { AbsenceEntitlementRecordValues } from '../components/AbsenceEntitlementRecord'
import type { AbsencePolicyRecordValues } from '../components/AbsencePolicyRecord'
import type { GenericCatalogEntryModalValues } from '../modals/GenericCatalogEntryModal'
import type { AbsenceTypeModalValues } from '../modals/AbsenceTypeModal'
import { getAbsenceTypeTitle, type AbsenceTypeVersionFormValues } from '../utils/absenceSetup'
import { buildAbsenceTypeVersionPayload } from '../utils/absenceTypeVersionObjectValue'
import { buildAbsenceSetupSectionCards, type AbsenceSetupSectionCardConfig } from '../utils/absenceSetupSectionCards'
import { hasIdenticalEligibility } from '../utils/absenceEligibilityConflict'
import {
  getAbsenceEntitlementEditorState,
  type AbsenceEntitlementObjectValue
} from '../utils/absenceEntitlementObjectValue'
import { getAbsencePolicyEditorState, type AbsencePolicyObjectValue } from '../utils/absencePolicyObjectValue'

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
  const [activeGenericCatalog, setActiveGenericCatalog] = useState<GenericCatalogKey | null>(null)
  const [selectedAbsenceType, setSelectedAbsenceType] = useState<AbsenceType | null>(null)
  const [selectedGenericEntry, setSelectedGenericEntry] = useState<CatalogEntry | null>(null)
  const [pendingDelete, setPendingDelete] = useState<PendingDeleteState | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [deleteErrorMessage, setDeleteErrorMessage] = useState('')

  const {
    companies,
    isLoading: isLoadingCompanies,
    search: searchCompanies,
    loadMore: loadMoreCompanies
  } = useCompanySelection({ accessToken })

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
    genericCatalogConfigs,
    employmentTypes,
    contractTypes,
    countries,
    regionsByCountry,
    regionsLoading,
    fetchRegionsForCountry
  } = useAbsenceSetupCatalogData(accessToken, t, companies)

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

  const handleSaveAbsenceTypeVersion = async (
    formValues: AbsenceTypeVersionFormValues,
    selectedVersionEntry: CatalogEntry | null,
    onSuccess: () => void
  ) => {
    const payload = buildAbsenceTypeVersionPayload(formValues, absenceTypes, Boolean(selectedVersionEntry?.id))

    try {
      if (selectedVersionEntry?.id) {
        await absenceTypeVersionsCatalog.updateEntry(selectedVersionEntry.id, {
          value: payload.value,
          objectValue: payload.objectValue,
          translations: payload.translations
        })
      } else {
        await absenceTypeVersionsCatalog.createEntry(payload)
      }
      toast.success(t('save-catalog-entry-success', { entity: t('absence-type-version-entity-label') }))
      onSuccess()
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

  const handleSaveAbsenceEntitlement = async (
    formValues: AbsenceEntitlementRecordValues,
    selectedEntitlementId: string | null,
    onSuccess: () => void
  ) => {
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
        entry => entry.id !== selectedEntitlementId && entry.code.trim().toLowerCase() === normalizedCode.toLowerCase()
      )

      if (hasDuplicateCode) {
        throw new Error(t('validation-duplicate-code', { code: normalizedCode }))
      }

      const newEntitlementSettings = getAbsenceEntitlementEditorState(formValues.objectValue).settings

      const conflictingEntitlement = absenceEntitlementsCatalog.entries.find(entry => {
        if (entry.id === selectedEntitlementId) return false
        const state = getAbsenceEntitlementEditorState(entry.objectValue as AbsenceEntitlementObjectValue)
        return hasIdenticalEligibility(newEntitlementSettings, state.settings)
      })

      if (conflictingEntitlement) {
        throw new Error(
          t('validation-duplicate-eligibility', {
            name: conflictingEntitlement.value || conflictingEntitlement.code
          })
        )
      }

      if (selectedEntitlementId) {
        const existingEntry = absenceEntitlementsCatalog.entries.find(e => e.id === selectedEntitlementId)
        if (existingEntry) {
          await absenceEntitlementsCatalog.updateEntry(selectedEntitlementId, {
            id: existingEntry.id,
            code: existingEntry.code,
            value: payload.value,
            type: existingEntry.type,
            objectValue: payload.objectValue,
            localeCode: existingEntry.localeCode || 'en-US',
            translations: payload.translations
          })
        }
      } else {
        await absenceEntitlementsCatalog.createEntry(payload)
      }
      toast.success(t('save-catalog-entry-success', { entity: t('absence-entitlement-entity-label') }))
      onSuccess()
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

  const handleSaveAbsencePolicy = async (
    formValues: AbsencePolicyRecordValues,
    selectedPolicyId: string | null,
    onSuccess: () => void
  ) => {
    const payload: AbsenceCatalogEntryPayload = {
      code: formValues.code,
      value: formValues.translations.enUS,
      objectValue: formValues.objectValue,
      localeCode: 'en-US',
      translations: buildCatalogTranslations(formValues.translations)
    }

    try {
      const newPolicySettings = getAbsencePolicyEditorState(formValues.objectValue).settings

      const conflictingPolicy = absencePoliciesCatalog.entries.find(entry => {
        if (entry.id === selectedPolicyId) return false
        const state = getAbsencePolicyEditorState(entry.objectValue as AbsencePolicyObjectValue)
        return hasIdenticalEligibility(newPolicySettings, state.settings)
      })

      if (conflictingPolicy) {
        throw new Error(
          t('validation-duplicate-eligibility', {
            name: conflictingPolicy.value || conflictingPolicy.code
          })
        )
      }

      if (selectedPolicyId) {
        const existingEntry = absencePoliciesCatalog.entries.find(e => e.id === selectedPolicyId)
        if (existingEntry) {
          await absencePoliciesCatalog.updateEntry(selectedPolicyId, {
            id: existingEntry.id,
            code: existingEntry.code,
            value: payload.value,
            type: existingEntry.type,
            objectValue: payload.objectValue,
            localeCode: existingEntry.localeCode || 'en-US',
            translations: payload.translations
          })
        }
      } else {
        await absencePoliciesCatalog.createEntry(payload)
      }
      toast.success(t('save-catalog-entry-success', { entity: t('absence-policy-entity-label') }))
      onSuccess()
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
      const isSystemType = isSystemCatalogEntry({
        type: entry.type,
        objectValue: entry.objectValue
      })

      if (isSystemType) {
        openDeleteDialog(
          t('absence-type-entity-label'),
          absenceTypeName,
          async () => Promise.resolve(),
          t('delete-system-entry-blocked', { entity: t('absence-type-entity-label') })
        )
        return
      }

      openDeleteDialog(t('absence-type-entity-label'), absenceTypeName, () => deleteAbsenceType(entry.id))
    },
    onAddAbsenceTypeVersion: () => {},
    onSelectAbsenceTypeVersion: undefined,
    onEditAbsenceTypeVersion: () => {},
    onDeleteAbsenceTypeVersion: entry => {
      openDeleteDialog(t('absence-type-version-entity-label'), entry.value || entry.code, () =>
        absenceTypeVersionsCatalog.deleteEntry(entry.id)
      )
    },
    onAddEntitlement: () => {},
    onEditEntitlement: () => {},
    onDeleteEntitlement: entry => {
      openDeleteDialog(t('absence-entitlement-entity-label'), entry.value || entry.code, () =>
        absenceEntitlementsCatalog.deleteEntry(entry.id)
      )
    },
    onAddGenericCatalog: catalogKey => {
      if (catalogKey === 'AbsenceGroup') {
        const config = genericCatalogConfigs[catalogKey]
        toast.error(t('catalog-readonly-message', { entity: config.entityLabel }))
        return
      }
    },
    onEditGenericCatalog: (catalogKey, entry) => {
      if (catalogKey === 'AbsencePolicy') {
        return
      }
      setSelectedGenericEntry(entry)
      setActiveGenericCatalog(catalogKey)
    },
    onDeleteGenericCatalog: (catalogKey, entry) => {
      const config = genericCatalogConfigs[catalogKey]
      if (catalogKey === 'AbsenceGroup') {
        openDeleteDialog(
          config.entityLabel,
          entry.value || entry.code,
          async () => Promise.resolve(),
          t('delete-system-entry-blocked', { entity: config.entityLabel })
        )
        return
      }
      openDeleteDialog(config.entityLabel, entry.value || entry.code, () => config.hook.deleteEntry(entry.id))
    }
  })

  return {
    absenceTypes,
    absenceGroups,
    absenceTypeVersions: absenceTypeVersionsCatalog.entries,
    absenceEntitlements: absenceEntitlementsCatalog.entries,
    absencePolicies: absencePoliciesCatalog.entries,
    isAbsenceTypeModalOpen,
    isGenericCatalogModalOpen: Boolean(activeGenericCatalog),
    genericEntityLabel: activeGenericCatalog ? genericCatalogConfigs[activeGenericCatalog].entityLabel : '',
    selectedAbsenceType,
    selectedGenericEntry,
    sectionCards,
    pendingDelete,
    isDeleting,
    deleteErrorMessage,
    employmentTypes,
    contractTypes,
    countries,
    regionsByCountry,
    regionsLoading,
    fetchRegionsForCountry,
    companies,
    isLoadingCompanies,
    searchCompanies,
    loadMoreCompanies,
    closeAbsenceTypeModal,
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
