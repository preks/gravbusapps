import { useState, useCallback, useEffect } from 'react'
import { message } from 'antd'
import { DocumentType } from '@/common/types/DocumentTypeObjectTypes'
import { DocumentTypeObjectValue } from '@/common/types/DocumentTypeObjectTypes'
import { useCatalogManagerClient } from '@/common/network/catalogs/useCatalogManagerClient'
import { CatalogEntry, GetCatalogEntriesParams, GetCatalogsParams } from '@/common/types/CatalogTypes'
import { env } from '@/common/env/EnvUtils'

const PAGE_SIZE = 5

const useDocumentTypes = (accessToken: string, moduleFilter?: string, searchTerm?: string) => {
  const userLocale = 'en-US'
  const client = useCatalogManagerClient(accessToken)
  const [documentTypes, setDocumentTypes] = useState<DocumentType[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<Error | null>(null)
  const [totalDocumentTypes, setTotalDocumentTypes] = useState<number>(0)
  const [currentPage, setCurrentPage] = useState<number>(1)
  const [allPossibleModules] = useState<string[]>([])

  const handlePageChange = useCallback((page: number) => {
    setCurrentPage(page)
  }, [])

  useEffect(() => {
    if (!accessToken || !client) {
      setDocumentTypes([]) // Clear previous data if token becomes invalid
      setLoading(false)
      return
    }

    const fetchAndSetDocumentTypes = async () => {
      setLoading(true)
      setError(null)
      try {
        const pathParams: GetCatalogEntriesParams = {
          catalogIdentifier: 'DocumentType',
          version: 'v1'
        }
        const offset = (currentPage - 1) * PAGE_SIZE
        const queryParams: GetCatalogsParams = {
          includeChildCatalogEntries: true,
          returnTotalRecords: true,
          limit: PAGE_SIZE,
          offset: offset
        }

        if (moduleFilter || searchTerm) {
          const criteria = []

          if (moduleFilter) {
            criteria.push(`parentEntryId:DocumentGroup:v1:${moduleFilter}`)
          }

          if (searchTerm) {
            criteria.push(`(value:*${searchTerm}*)`)
          }

          queryParams.searchCriteria = criteria.join(' AND ')
        }

        const response = await client.getCatalogEntriesList(pathParams, queryParams)
        if (!response || !response.data) {
          throw new Error('No data received from API')
        }

        setTotalDocumentTypes(response.paging?.totalRecords || 0)
        const fetchedEntries: CatalogEntry[] = response.data || []
        const mappedDocumentTypes = fetchedEntries
          .map((entry: CatalogEntry): DocumentType | null => {
            try {
              if (typeof entry.id !== 'string' || entry.id === '') {
                console.warn(`CatalogEntry is missing 'id' or it's not a string. Skipping entry.`)
                return null
              }
              if (typeof entry.code !== 'string' || entry.code === '') {
                console.warn(`CatalogEntry (id: ${entry.id}) is missing 'code' or it's not a string. Skipping entry.`)
                return null
              }
              if (typeof entry.value !== 'string') {
                // value can be an empty string
                console.warn(`CatalogEntry (id: ${entry.id}) is missing 'value' or it's not a string. Skipping entry.`)
                return null
              }
              const constructedId = `${pathParams.catalogIdentifier}:${pathParams.version}:${entry.code}`
              // Create base document type without translations
              const docType: DocumentType = {
                id: constructedId,
                code: entry.code,
                value: entry.value,
                parentEntryId: entry.parentEntryId || '',
                translations: (entry.translations || []).map(t => ({
                  localeCode: t.localeCode || 'en-US',
                  value: t.value || ''
                })),
                objectValue: (entry.objectValue || {}) as DocumentTypeObjectValue,
                catalogEntryLocalId: entry.id,
                localeCode: entry.localeCode || userLocale
              }

              return docType
            } catch (mapError: any) {
              console.error(`Error mapping CatalogEntry (id: ${entry.id || 'N/A'}) to DocumentType:`, mapError)
              message.error(
                `Error processing document entry: ${entry.value || entry.code || entry.id || 'Unknown Entry'}`
              )
              return null
            }
          })
          .filter((docType): docType is DocumentType => docType !== null)
        setDocumentTypes(mappedDocumentTypes)
      } catch (e: any) {
        setError(e)
        message.error(e.message || 'Failed to fetch document types')
      } finally {
        setLoading(false)
      }
    }

    fetchAndSetDocumentTypes()
  }, [accessToken, client, userLocale, currentPage, moduleFilter])

  const createDocumentType = useCallback(
    async (
      documentType: Omit<DocumentType, 'id'> & { translations?: Array<{ localeCode: string; value: string }> }
    ) => {
      if (!client) {
        throw new Error('Catalog manager client not available')
      }

      try {
        setLoading(true)

        // Generate a code from the value (convert to uppercase and replace spaces with underscores)
        const code = documentType.value
          .toUpperCase()
          .replace(/[^A-Z0-9]/g, '_')
          .replace(/_{2,}/g, '_')
          .replace(/^_+|_+$/g, '')

        const id = `DocumentType:v1:${code}`

        // Ensure gdprRelevant is a boolean
        const objectValue = {
          ...documentType.objectValue,
          gdprRelevant: Boolean(documentType.objectValue?.gdprRelevant)
        }

        // Create the base entry with English (default) value
        const newEntry = {
          id: id,
          code: code,
          value: documentType.value,
          translations: documentType.translations || [],
          parentEntryId: documentType.parentEntryId,
          objectValue: objectValue,
          localeCode: 'en-US' // Default locale
        }

        // Create the document type
        const createdEntry = await client.createCatalogEntry('DocumentType', 'v1', newEntry)

        if (!createdEntry || !createdEntry.id) {
          throw new Error('Failed to create document type: Invalid response from server')
        }

        // Process translations if any
        if (documentType.translations && documentType.translations.length > 0) {
          const translationPromises = documentType.translations.map(translation => {
            if (translation.localeCode === 'en-US') return Promise.resolve() // Skip English as it's already set

            const translationEntry = {
              ...newEntry,
              value: translation.value,
              localeCode: translation.localeCode,
              isLocalizedVersion: true
            }

            return client.createCatalogEntry('DocumentType', 'v1', translationEntry)
          })

          await Promise.all(translationPromises)
        }

        const newType: DocumentType = {
          ...documentType,
          id: id,
          code: code,
          catalogEntryLocalId: createdEntry.id,
          translations: documentType.translations || []
        }

        // Refresh the list to include the new entry
        setDocumentTypes(prev => [...prev, newType])

        message.success('Document type created successfully')

        return newType
      } catch (err: any) {
        console.error('Failed to create document type:', err)
        message.error(err.message || 'Failed to create document type')
        throw err
      } finally {
      }
    },
    [client, currentPage, totalDocumentTypes, userLocale]
  )

  const updateDocumentType = useCallback(
    async (
      id: string,
      updates: Partial<DocumentType> & { translations?: Array<{ localeCode: string; value: string }> }
    ) => {
      try {
        setLoading(true)

        const existingDoc = documentTypes.find(doc => doc.id === id)
        if (!existingDoc) {
          throw new Error('Document type not found')
        }

        let entryId = id
        if (!id.startsWith('DocumentType:')) {
          if (existingDoc.catalogEntryLocalId) {
            entryId = `DocumentType:v1:${existingDoc.catalogEntryLocalId}`
          } else {
            const idParts = id.split(':')
            entryId = `DocumentType:v1:${idParts[idParts.length - 1]}`
          }
        }

        // Prepare the update payload with translations included
        const updatePayload: any = {
          // Only update value if it's explicitly provided in updates
          ...(updates.value !== undefined ? { value: updates.value } : {}),
          ...(updates.parentEntryId ? { parentEntryId: updates.parentEntryId } : {}),
          ...(updates.objectValue
            ? {
                objectValue: {
                  ...existingDoc.objectValue,
                  ...updates.objectValue,
                  gdprRelevant: Boolean(updates.objectValue.gdprRelevant)
                }
              }
            : {}),
          // Keep these from existing doc
          id: existingDoc.id,
          code: existingDoc.code,
          catalogEntryLocalId: existingDoc.catalogEntryLocalId,
          // Include translations in the main payload if provided
          ...(updates.translations
            ? {
                translations: updates.translations.map(t => ({
                  localeCode: t.localeCode,
                  value: t.value
                }))
              }
            : {})
        }

        // Remove undefined values
        Object.keys(updatePayload).forEach(key => updatePayload[key] === undefined && delete updatePayload[key])

        const baseUrl = env('NEXT_PUBLIC_CATALOG_API') || ''
        const updateUrl = `${baseUrl}/api/v1/catalog-entries/${entryId}`

        // Single API call to update the document type with translations
        const response = await fetch(updateUrl, {
          method: 'PUT',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(updatePayload)
        })

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          throw new Error(errorData.message || 'Failed to update document type')
        }

        const updatedEntry = await response.json()

        // Update the local state with the new translations
        setDocumentTypes(prev =>
          prev.map(doc =>
            doc.id === id
              ? {
                  ...doc,
                  ...updates,
                  id: updatedEntry.id,
                  translations: updates.translations || doc.translations || []
                }
              : doc
          )
        )

        message.success('Document type updated successfully')
        return updatedEntry
      } catch (err: any) {
        console.error('Failed to update document type:', err)
        message.error(err.message || 'Failed to update document type')
        throw err
      } finally {
        setLoading(false)
      }
    },
    [documentTypes, accessToken]
  )

  const deleteDocumentType = useCallback(
    async (id: string) => {
      if (!client) {
        throw new Error('Catalog manager client not available')
      }

      try {
        setLoading(true)

        const docToDelete = documentTypes.find(doc => doc.id === id)
        if (!docToDelete) {
          throw new Error('Document type not found')
        }

        let entryId = id
        if (!id.startsWith('DocumentType:')) {
          if (docToDelete.catalogEntryLocalId) {
            entryId = `DocumentType:v1:${docToDelete.catalogEntryLocalId}`
          } else {
            entryId = `DocumentType:v1:${id}`
          }
        }

        const baseUrl = env('NEXT_PUBLIC_CATALOG_API') || ''
        const deleteUrl = `${baseUrl}/api/v1/catalog-entries/${entryId}`

        const response = await fetch(deleteUrl, {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          }
        })

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          throw new Error(errorData.message || 'Failed to delete document type')
        }

        setDocumentTypes(prev => prev.filter(doc => doc.id !== id))

        if (documentTypes.length % PAGE_SIZE === 1 && currentPage > 1) {
          setCurrentPage(prev => Math.max(1, prev - 1))
        }

        message.success('Document type deleted successfully')
      } catch (err: any) {
        console.error('Failed to delete document type:', err)
        message.error(err.message || 'Failed to delete document type')
        throw err
      } finally {
        setLoading(false)
      }
    },
    [client, currentPage, documentTypes, PAGE_SIZE]
  )

  return {
    documentTypes,
    loading,
    error,
    totalDocumentTypes,
    currentPage,
    PAGE_SIZE,
    handlePageChange,
    createDocumentType,
    updateDocumentType,
    deleteDocumentType,
    allPossibleModules
  }
}

export default useDocumentTypes
