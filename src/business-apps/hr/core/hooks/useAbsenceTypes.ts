import { useCallback, useEffect, useState } from 'react'
import { toast } from '@newwork/nw-design-system'
import { useCatalogManagerClient } from '@/common/network/catalogs/useCatalogManagerClient'
import type { AbsenceType } from '@/common/types/AbsenceTypeObjectType'
import type { CatalogEntry, GetCatalogEntriesParams, GetCatalogsParams } from '@/common/types/CatalogTypes'
import { buildSoftDeletedObjectValue, isCatalogEntryDeleted } from '../utils/catalogEntryHelpers'

const ABSENCE_TYPE_CATALOG = 'AbsenceType'
const ABSENCE_TYPE_VERSION = 'v1'

const mapCatalogEntryToAbsenceType = (entry: CatalogEntry): AbsenceType => ({
  id: `${ABSENCE_TYPE_CATALOG}:${ABSENCE_TYPE_VERSION}:${entry.code}`,
  code: entry.code,
  value: entry.value,
  type: entry.type,
  parentEntryId: entry.parentEntryId,
  objectValue:
    Array.isArray(entry.objectValue) || typeof entry.objectValue === 'object' ? entry.objectValue : undefined,
  catalogEntryLocalId: entry.id,
  localeCode: entry.localeCode || 'en-US',
  translations: (entry.translations || []).map(translation => ({
    localeCode: translation.localeCode || 'en-US',
    value: String(translation.value || '')
  }))
})

const resolveCatalogEntryId = (absenceTypes: AbsenceType[], id: string): string =>
  absenceTypes.find(item => item.id === id)?.catalogEntryLocalId || id

const useAbsenceTypes = (accessToken: string) => {
  const client = useCatalogManagerClient(accessToken)
  const [absenceTypes, setAbsenceTypes] = useState<AbsenceType[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)

  const loadAbsenceTypes = useCallback(async () => {
    if (!accessToken || !client) {
      setAbsenceTypes([])
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    try {
      const pathParams: GetCatalogEntriesParams = {
        catalogIdentifier: ABSENCE_TYPE_CATALOG,
        version: ABSENCE_TYPE_VERSION
      }
      const queryParams: GetCatalogsParams = {
        includeLocalizedVersions: true,
        includeTranslations: true,
        localeCode: 'en-US',
        limit: 200,
        offset: 0
      }

      const response = await client.getCatalogEntriesList(pathParams, queryParams)
      const entries = ((response?.data || []) as CatalogEntry[]).filter(entry => !isCatalogEntryDeleted(entry))
      setAbsenceTypes(entries.map(mapCatalogEntryToAbsenceType))
    } catch (err) {
      const resolvedError = err instanceof Error ? err : new Error('Failed to fetch absence types')
      console.error('[useAbsenceTypes] Failed to fetch absence types:', resolvedError.message)
      setError(resolvedError)
      setAbsenceTypes([])
      toast.error(resolvedError.message)
    } finally {
      setLoading(false)
    }
  }, [accessToken, client])

  useEffect(() => {
    loadAbsenceTypes()
  }, [loadAbsenceTypes])

  const createAbsenceType = useCallback(
    async (absenceType: Omit<AbsenceType, 'id'>) => {
      if (!client) {
        throw new Error('Catalog manager client not available')
      }

      const payload = {
        code: absenceType.code,
        value: absenceType.value,
        parentEntryId: absenceType.parentEntryId,
        objectValue: absenceType.objectValue,
        localeCode: absenceType.localeCode || 'en-US',
        translations: absenceType.translations || []
      }

      const createdEntry = await client.createCatalogEntry(ABSENCE_TYPE_CATALOG, ABSENCE_TYPE_VERSION, payload)
      const createdType = mapCatalogEntryToAbsenceType(createdEntry as CatalogEntry)
      setAbsenceTypes(prev => [...prev, createdType])
      return createdType
    },
    [client]
  )

  const updateAbsenceType = useCallback(
    async (id: string, updates: Partial<AbsenceType>) => {
      if (!client) {
        throw new Error('Catalog manager client not available')
      }

      const existingType = absenceTypes.find(item => item.id === id)
      if (!existingType) {
        throw new Error('Absence type not found')
      }

      const entryId = resolveCatalogEntryId(absenceTypes, id)

      const updatedEntry = await client.updateCatalogEntry(ABSENCE_TYPE_CATALOG, ABSENCE_TYPE_VERSION, entryId, {
        id: entryId,
        code: existingType.code,
        value: updates.value !== undefined ? updates.value : existingType.value,
        type: existingType.type,
        parentEntryId: updates.parentEntryId !== undefined ? updates.parentEntryId : existingType.parentEntryId,
        objectValue: updates.objectValue !== undefined ? updates.objectValue : existingType.objectValue,
        localeCode: updates.localeCode || existingType.localeCode || 'en-US',
        translations: updates.translations || existingType.translations || []
      } as any)

      const updatedType = mapCatalogEntryToAbsenceType(updatedEntry as CatalogEntry)
      setAbsenceTypes(prev => prev.map(item => (item.id === id ? updatedType : item)))
      return updatedType
    },
    [absenceTypes, client]
  )

  const softDeleteAbsenceType = useCallback(
    async (id: string) => {
      if (!client) {
        throw new Error('Catalog manager client not available')
      }

      const existingType = absenceTypes.find(item => item.id === id)
      if (!existingType) {
        throw new Error('Absence type not found')
      }

      await client.updateCatalogEntry(
        ABSENCE_TYPE_CATALOG,
        ABSENCE_TYPE_VERSION,
        resolveCatalogEntryId(absenceTypes, id),
        {
          code: existingType.code,
          value: existingType.value,
          parentEntryId: existingType.parentEntryId,
          objectValue: buildSoftDeletedObjectValue(existingType.objectValue),
          localeCode: existingType.localeCode || 'en-US',
          translations: existingType.translations || [],
          isDeleted: true
        } as any
      )
      setAbsenceTypes(prev => prev.filter(item => item.id !== id))
    },
    [absenceTypes, client]
  )

  return {
    absenceTypes,
    loading,
    error,
    createAbsenceType,
    updateAbsenceType,
    deleteAbsenceType: softDeleteAbsenceType,
    refetch: loadAbsenceTypes
  }
}

export default useAbsenceTypes
