import { useCallback, useEffect, useMemo, useState } from 'react'
import { IDEAL_CUSTOMER_PROFILES_CATALOG } from '@/common/data/customer/constants/customerCatalogs'
import { useCreateCatalogEntry, useDeleteCatalogEntry, useUpdateCatalogEntry } from '@/common/data/catalog'
import { useCatalogManagerClient } from '@/common/network/catalogs/useCatalogManagerClient'
import type { CatalogEntry } from '@/common/types/CatalogTypes'
import type { IcpProfileListItem } from './IcpProfileListSidebar'
import {
  buildCatalogValueTranslations,
  DEFAULT_CATALOG_LOCALE,
  DEFAULT_CATALOG_TRANSLATIONS,
  getCatalogValueTranslations,
  getDefaultCatalogValue,
  type CatalogTranslationMap
} from '@/common/components/common-relations/setting-pages/utils/catalogTranslations'
import {
  createEmptyIcpFormState,
  formStateToObjectValue,
  isWeightsTotalOverLimit,
  objectValueToFormState
} from './icpFormState'
import type { BusinessAppContextProps } from '@/common/BusinessAppContext'

const CATALOG_ID = IDEAL_CUSTOMER_PROFILES_CATALOG
const CATALOG_VERSION = 'v1'

export function useIdealCustomerProfilesCatalog(
  context: Pick<BusinessAppContextProps, 'accessToken' | 'userInfo' | 'additionalData'>
) {
  const { accessToken, userInfo, additionalData } = context
  const catalogClient = useCatalogManagerClient(accessToken)
  const { updateCatalogEntry } = useUpdateCatalogEntry({ accessToken, userInfo, additionalData })
  const { createCatalogEntry } = useCreateCatalogEntry({ accessToken, userInfo, additionalData })
  const { deleteCatalogEntry } = useDeleteCatalogEntry({ accessToken, userInfo, additionalData })

  const [profiles, setProfiles] = useState<IcpProfileListItem[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [selectedEntry, setSelectedEntry] = useState<CatalogEntry | null>(null)
  const [profileName, setProfileName] = useState('')
  const [profileNameTranslations, setProfileNameTranslations] = useState<CatalogTranslationMap>({
    ...DEFAULT_CATALOG_TRANSLATIONS
  })
  const [formState, setFormState] = useState<IcpFormState>(() => createEmptyIcpFormState())

  const [listLoading, setListLoading] = useState(true)
  const [detailLoading, setDetailLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [listError, setListError] = useState<string | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')

  const [newDialogOpen, setNewDialogOpen] = useState(false)
  const [newCode, setNewCode] = useState('')
  const [newName, setNewName] = useState('')
  const [newNameTranslations, setNewNameTranslations] = useState<CatalogTranslationMap>({
    ...DEFAULT_CATALOG_TRANSLATIONS
  })
  const [creating, setCreating] = useState(false)

  const [deleteTarget, setDeleteTarget] = useState<IcpProfileListItem | null>(null)
  const [deleting, setDeleting] = useState(false)

  const loadProfiles = useCallback(async () => {
    if (!accessToken) {
      return
    }
    try {
      setListLoading(true)
      setListError(null)
      const response = await catalogClient.getCatalogEntriesList(
        { catalogIdentifier: CATALOG_ID, version: CATALOG_VERSION },
        {
          limit: 200,
          offset: 0,
          returnTotalRecords: true,
          includeTranslations: true,
          includeChildCatalogEntries: false
        }
      )
      const list = (response.data || []).map((entry: CatalogEntry) => ({
        id: entry.id,
        code: entry.code,
        value: entry.value
      }))
      setProfiles(list)
      setSelectedId(prev => {
        if (prev && list.some(p => p.id === prev)) return prev
        if (list.length > 0) return list[0].id
        return null
      })
    } catch (e) {
      setListError(e instanceof Error ? e.message : 'Failed to load profiles')
    } finally {
      setListLoading(false)
    }
  }, [accessToken, catalogClient])

  useEffect(() => {
    void loadProfiles()
  }, [loadProfiles])

  useEffect(() => {
    if (!accessToken || !selectedId) {
      setSelectedEntry(null)
      setProfileName('')
      setProfileNameTranslations({ ...DEFAULT_CATALOG_TRANSLATIONS })
      setFormState(createEmptyIcpFormState())
      return
    }

    let cancelled = false

    const run = async () => {
      try {
        setDetailLoading(true)
        setSaveError(null)
        const entry = await catalogClient.readCatalogEntryById(selectedId, { includeTranslations: true })
        if (cancelled) return
        setSelectedEntry(entry as CatalogEntry)
        setProfileName(entry.value ?? '')
        setProfileNameTranslations(getCatalogValueTranslations(entry))
        setFormState(objectValueToFormState(entry.objectValue))
      } catch (e) {
        if (!cancelled) {
          setSaveError(e instanceof Error ? e.message : 'Failed to load profile')
        }
      } finally {
        if (!cancelled) {
          setDetailLoading(false)
        }
      }
    }

    void run()
    return () => {
      cancelled = true
    }
  }, [accessToken, catalogClient, selectedId])

  const filteredProfiles = useMemo(() => {
    if (!searchTerm.trim()) return profiles
    const q = searchTerm.toLowerCase()
    return profiles.filter(p => p.code.toLowerCase().includes(q) || p.value.toLowerCase().includes(q))
  }, [profiles, searchTerm])

  const handleSave = useCallback(async () => {
    if (!accessToken || !selectedEntry) {
      return
    }
    if (isWeightsTotalOverLimit(formState)) {
      return
    }
    try {
      setSaving(true)
      setSaveError(null)
      const objectValue = formStateToObjectValue(formState)
      const value = getDefaultCatalogValue(profileNameTranslations, profileName)
      await updateCatalogEntry(CATALOG_ID, CATALOG_VERSION, selectedEntry.id, {
        id: selectedEntry.id,
        code: selectedEntry.code,
        value,
        localeCode: selectedEntry.localeCode || DEFAULT_CATALOG_LOCALE,
        type: selectedEntry.type,
        objectValue,
        translations: buildCatalogValueTranslations(profileNameTranslations, profileName)
      })
      await loadProfiles()
      const refreshed = await catalogClient.readCatalogEntryById(selectedEntry.id, { includeTranslations: true })
      setSelectedEntry(refreshed as CatalogEntry)
      setFormState(objectValueToFormState(refreshed.objectValue))
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : 'Failed to save profile')
    } finally {
      setSaving(false)
    }
  }, [
    accessToken,
    catalogClient,
    formState,
    loadProfiles,
    profileName,
    profileNameTranslations,
    selectedEntry,
    updateCatalogEntry
  ])

  const handleCreate = useCallback(async () => {
    if (!accessToken) {
      return
    }
    const code = newCode.trim()
    const name = getDefaultCatalogValue(newNameTranslations, newName)
    if (!code || !name) {
      return
    }
    try {
      setCreating(true)
      const created = await createCatalogEntry(CATALOG_ID, CATALOG_VERSION, {
        code,
        value: name,
        localeCode: DEFAULT_CATALOG_LOCALE,
        objectValue: {},
        translations: buildCatalogValueTranslations(newNameTranslations, newName)
      } as Omit<CatalogEntry, 'id' | 'type'>)
      setNewDialogOpen(false)
      setNewCode('')
      setNewName('')
      setNewNameTranslations({ ...DEFAULT_CATALOG_TRANSLATIONS })
      await loadProfiles()
      setSelectedId(created.id)
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : 'Failed to create profile')
    } finally {
      setCreating(false)
    }
  }, [accessToken, createCatalogEntry, loadProfiles, newCode, newName, newNameTranslations])

  const confirmDelete = useCallback(async () => {
    if (!accessToken || !deleteTarget) {
      return
    }
    try {
      setDeleting(true)
      await deleteCatalogEntry(CATALOG_ID, CATALOG_VERSION, deleteTarget.id)
      if (selectedId === deleteTarget.id) {
        setSelectedId(null)
      }
      setDeleteTarget(null)
      await loadProfiles()
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : 'Failed to delete profile')
    } finally {
      setDeleting(false)
    }
  }, [accessToken, deleteCatalogEntry, deleteTarget, loadProfiles, selectedId])

  return {
    profiles,
    filteredProfiles,
    selectedId,
    setSelectedId,
    selectedEntry,
    profileName,
    setProfileName,
    profileNameTranslations,
    setProfileNameTranslations,
    formState,
    setFormState,
    listLoading,
    detailLoading,
    saving,
    listError,
    saveError,
    searchTerm,
    setSearchTerm,
    newDialogOpen,
    setNewDialogOpen,
    newCode,
    setNewCode,
    newName,
    setNewName,
    newNameTranslations,
    setNewNameTranslations,
    creating,
    deleteTarget,
    setDeleteTarget,
    deleting,
    handleSave,
    handleCreate,
    confirmDelete
  }
}
