import { useCallback } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { BaseCatalog, CatalogEntry, Catalog } from '@/common/data/catalog'
import { TableState, JsonEditorState } from './useCatalogTableState'

interface UseCatalogTableActionsProps {
  context: BusinessAppContextProps
  catalog: BaseCatalog
  state: TableState
  setState: React.Dispatch<React.SetStateAction<TableState>>
  jsonEditorState: JsonEditorState
  setJsonEditorState: React.Dispatch<React.SetStateAction<JsonEditorState>>
  createCatalogEntry: any
  updateCatalogEntry: any
  deleteCatalogEntry: any
  importCatalogEntries: any
  exportCatalogs: any
  loadEntries: (searchTerm?: string, limit?: number, offset?: number) => Promise<void>
  onViewCatalog?: (catalog: Catalog) => void
}

export const useCatalogTableActions = ({
  catalog,
  state,
  setState,
  jsonEditorState,
  setJsonEditorState,
  createCatalogEntry,
  updateCatalogEntry,
  deleteCatalogEntry,
  importCatalogEntries,
  exportCatalogs,
  loadEntries,
  onViewCatalog
}: UseCatalogTableActionsProps) => {
  // Helper function to build complete entry data with proper translation format
  const buildCompleteEntryData = useCallback(
    (entryId: string) => {
      // Helper function to ensure empty strings are preserved when clearing fields
      const normalizeValue = (value: any): any => {
        if (typeof value === 'string' && value.trim() === '') {
          return '' // Keep empty string instead of converting to null
        }
        return value
      }

      const originalEntry = state.allEntries.find(e => e.id === entryId)
      const edits = state.editedEntries.get(entryId)

      if (!originalEntry) {
        throw new Error(`Entry ${entryId} not found`)
      }

      // Start with all original field values (including id and code - required by API)
      const completeData: any = {
        id: originalEntry.id, // Required field for updates
        code: originalEntry.code, // Required field in CatalogEntry interface
        alternativeCode: normalizeValue(originalEntry.alternativeCode),
        value: normalizeValue(originalEntry.value),
        description: normalizeValue(originalEntry.description),
        additionalValue1: normalizeValue(originalEntry.additionalValue1),
        additionalValue2: normalizeValue(originalEntry.additionalValue2),
        additionalValue3: normalizeValue(originalEntry.additionalValue3),
        type: normalizeValue(originalEntry.type),
        displayOrder: originalEntry.displayOrder,
        objectValue: originalEntry.objectValue,
        parentEntryId: normalizeValue(originalEntry.parentEntryId),
        activeFrom: normalizeValue(originalEntry.activeFrom),
        activeTo: normalizeValue(originalEntry.activeTo)
      }

      // Apply edits on top of original values
      if (edits) {
        Object.keys(edits).forEach(key => {
          if (key.endsWith('Translations')) {
            // Skip translation objects - we'll handle them below
            return
          }
          if (key === 'id' || key === 'code') {
            // Skip id and code fields from edits - use original values instead
            // These are required for API but should not be user-editable
            return
          }
          completeData[key] = normalizeValue(edits[key as keyof typeof edits])
        })
      }

      // Build translations array in the correct format for the API
      const translations: any[] = []
      const translationFields = ['value', 'additionalValue1', 'additionalValue2', 'additionalValue3']

      // Collect all locale codes from all translation fields
      const allLocaleCodes = new Set<string>()
      translationFields.forEach(field => {
        const translationKey = `${field}Translations` as keyof typeof originalEntry
        const originalTranslations = (originalEntry[translationKey] as Record<string, string>) || {}
        const editedTranslations = (edits?.[translationKey] as Record<string, string>) || {}
        const allTranslations = { ...originalTranslations, ...editedTranslations }

        Object.keys(allTranslations).forEach(localeCode => {
          if (allTranslations[localeCode]?.trim()) {
            allLocaleCodes.add(localeCode)
          }
        })
      })

      // Build complete translation objects for each locale
      allLocaleCodes.forEach(localeCode => {
        const translationEntry: any = {
          localeCode: localeCode
        }

        // Add all translatable fields for this locale
        translationFields.forEach(field => {
          const translationKey = `${field}Translations` as keyof typeof originalEntry
          const originalTranslations = (originalEntry[translationKey] as Record<string, string>) || {}
          const editedTranslations = (edits?.[translationKey] as Record<string, string>) || {}
          const allTranslations = { ...originalTranslations, ...editedTranslations }

          const translatedValue = allTranslations[localeCode]
          if (translatedValue && translatedValue.trim()) {
            translationEntry[field] = normalizeValue(translatedValue)
          }
        })

        // Add objectValue if it exists for this locale (though typically not used)
        // translationEntry.objectValue = null; // Can be added if needed

        translations.push(translationEntry)
      })

      if (translations.length > 0) {
        completeData.translations = translations
      }

      return completeData
    },
    [state.allEntries, state.editedEntries]
  )

  // Action handlers (restored original functionality)
  const handleCreateEntry = useCallback(async () => {
    // Add a draft row locally without calling the API
    const draftId = `draft:${Date.now()}`
    const draftEntry: CatalogEntry = {
      id: draftId,
      catalogId: catalog.id,
      code: '',
      value: '',
      alternativeCode: '',
      description: '',
      additionalValue1: '',
      additionalValue2: '',
      additionalValue3: '',
      type: '',
      displayOrder: (state.allEntries?.length || 0) + 1,
      objectValue: null,
      parentEntryId: undefined,
      // Enhanced/computed fields
      displayValue: '',
      fullPath: '',
      hasChildren: false,
      level: 0,
      parentPath: '',
      searchableText: '',
      // translation maps used by editor
      valueTranslations: {},
      descriptionTranslations: {},
      additionalValue1Translations: {},
      additionalValue2Translations: {},
      additionalValue3Translations: {}
    } as unknown as CatalogEntry

    setState(prev => {
      const newEdited = new Map(prev.editedEntries)
      // seed edits so Save/Discard buttons appear
      newEdited.set(draftId, { code: '', value: '' })
      const newDrafts = new Set(prev.draftEntryIds)
      newDrafts.add(draftId)
      return {
        ...prev,
        allEntries: [draftEntry, ...prev.allEntries],
        editedEntries: newEdited,
        draftEntryIds: newDrafts
      }
    })
  }, [catalog.id, setState, state.allEntries])

  const handleDeleteEntry = useCallback(
    async (entry: CatalogEntry) => {
      if (window.confirm(`Are you sure you want to delete the entry "${entry.displayValue || entry.code}"?`)) {
        const success = await deleteCatalogEntry(catalog.identifier, 'v1', entry.id)
        if (success) {
          loadEntries(state.searchTerm, state.currentLimit)
        }
      }
    },
    [deleteCatalogEntry, catalog.identifier, state.searchTerm, state.currentLimit, loadEntries]
  )

  const handleImportCsv = useCallback(async () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.csv'
    input.onchange = async e => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (file) {
        try {
          const success = await importCatalogEntries(catalog.identifier, 'v1', file)
          if (success) {
            alert('CSV imported successfully!')
            loadEntries(state.searchTerm, state.currentLimit)
          } else {
            alert('Failed to import CSV. Please check the file format.')
          }
        } catch (error) {
          console.error('Import error:', error)
          alert('Import failed: ' + (error instanceof Error ? error.message : 'Unknown error'))
        }
      }
    }
    input.click()
  }, [importCatalogEntries, catalog.identifier, state.searchTerm, state.currentLimit, loadEntries])

  const handleExportCsv = useCallback(async () => {
    const blob = await exportCatalogs([catalog.id])
    if (blob) {
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${catalog.identifier}_entries.csv`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } else {
      alert('Failed to export catalog entries.')
    }
  }, [exportCatalogs, catalog.id, catalog.identifier])

  const handleRefresh = useCallback(() => {
    setState(prev => ({
      ...prev,
      editedEntries: new Map()
    }))
    loadEntries(state.searchTerm, state.currentLimit)
  }, [loadEntries, setState, state.searchTerm, state.currentLimit])

  const handleViewObjectValue = useCallback(
    (entry: CatalogEntry) => {
      // Get the current value (edited if exists, otherwise original)
      const editedValue = state.editedEntries.get(entry.id)?.objectValue
      const currentValue = editedValue !== undefined ? editedValue : entry.objectValue

      // Convert to JSON string, handling null/undefined values
      const jsonText = currentValue ? JSON.stringify(currentValue, null, 2) : ''

      setJsonEditorState({
        isOpen: true,
        entry,
        jsonText,
        isValid: true,
        error: null,
        hasChanges: false
      })
    },
    [setJsonEditorState, state.editedEntries]
  )

  const handleJsonChange = useCallback(
    (newJsonText: string) => {
      try {
        if (newJsonText.trim() === '') {
          setJsonEditorState(prev => ({
            ...prev,
            jsonText: newJsonText,
            isValid: true,
            error: null,
            hasChanges: prev.jsonText !== newJsonText
          }))
        } else {
          JSON.parse(newJsonText)
          setJsonEditorState(prev => ({
            ...prev,
            jsonText: newJsonText,
            isValid: true,
            error: null,
            hasChanges: prev.jsonText !== newJsonText
          }))
        }
      } catch (error) {
        setJsonEditorState(prev => ({
          ...prev,
          jsonText: newJsonText,
          isValid: false,
          error: error instanceof Error ? error.message : 'Invalid JSON',
          hasChanges: prev.jsonText !== newJsonText
        }))
      }
    },
    [setJsonEditorState]
  )

  // Inline editing functions
  const handleFieldEdit = useCallback(
    (entryId: string, field: string, value: string | number | Record<string, string>) => {
      setState(prev => {
        const newEditedEntries = new Map(prev.editedEntries)
        const existingEdits = newEditedEntries.get(entryId) || {}
        newEditedEntries.set(entryId, { ...existingEdits, [field]: value })

        return {
          ...prev,
          editedEntries: newEditedEntries
        }
      })
    },
    [setState]
  )

  const handleJsonSave = useCallback(() => {
    if (!jsonEditorState.isValid || !jsonEditorState.entry) return

    try {
      // Handle empty JSON (convert to null)
      const jsonValue = jsonEditorState.jsonText.trim() === '' ? null : JSON.parse(jsonEditorState.jsonText)

      // Mark the field as edited with the new JSON value
      handleFieldEdit(jsonEditorState.entry.id, 'objectValue', jsonValue)

      // Close the editor
      setJsonEditorState({
        isOpen: false,
        entry: null,
        jsonText: '',
        isValid: true,
        error: null,
        hasChanges: false
      })
    } catch (error) {
      console.error('Error saving JSON:', error)
    }
  }, [jsonEditorState, handleFieldEdit, setJsonEditorState])

  const handleCloseJsonEditor = useCallback(() => {
    if (jsonEditorState.hasChanges) {
      if (!window.confirm('You have unsaved changes. Are you sure you want to close?')) {
        return
      }
    }

    setJsonEditorState({
      isOpen: false,
      entry: null,
      jsonText: '',
      isValid: true,
      error: null,
      hasChanges: false
    })
  }, [jsonEditorState.hasChanges, setJsonEditorState])

  // Row expansion handlers
  const handleToggleRow = useCallback(
    (entryId: string) => {
      setState(prev => {
        const newExpandedRows = new Set(prev.expandedRows)
        if (newExpandedRows.has(entryId)) {
          newExpandedRows.delete(entryId)
        } else {
          newExpandedRows.add(entryId)
        }
        return { ...prev, expandedRows: newExpandedRows }
      })
    },
    [setState]
  )

  const handleNavigateToChildCatalog = useCallback(
    (catalog: Catalog) => {
      if (onViewCatalog) {
        onViewCatalog(catalog)
      } else {
        console.warn('Navigation function not provided for catalog:', catalog)
      }
    },
    [onViewCatalog]
  )

  const handleSaveAll = useCallback(async () => {
    if (state.editedEntries.size === 0) return

    setState(prev => ({ ...prev, isSaving: true }))

    try {
      const savePromises = Array.from(state.editedEntries.keys()).map(async entryId => {
        try {
          const isDraft = state.draftEntryIds.has(entryId)
          if (isDraft) {
            // Build create payload from edits for draft
            const originalEntry = state.allEntries.find(e => e.id === entryId)!
            const edits = state.editedEntries.get(entryId) || {}
            const normalizeValue = (value: any): any => (typeof value === 'string' && value.trim() === '' ? '' : value)

            const createData: any = {
              code: (edits.code as string) || '',
              alternativeCode: normalizeValue(edits.alternativeCode ?? originalEntry.alternativeCode),
              value: normalizeValue(edits.value ?? originalEntry.value),
              description: normalizeValue(edits.description ?? originalEntry.description),
              additionalValue1: normalizeValue(edits.additionalValue1 ?? originalEntry.additionalValue1),
              additionalValue2: normalizeValue(edits.additionalValue2 ?? originalEntry.additionalValue2),
              additionalValue3: normalizeValue(edits.additionalValue3 ?? originalEntry.additionalValue3),
              type: normalizeValue(edits.type ?? originalEntry.type),
              displayOrder: (edits.displayOrder as number) ?? originalEntry.displayOrder ?? 0,
              objectValue: edits.objectValue ?? originalEntry.objectValue ?? null,
              parentEntryId: normalizeValue(edits.parentEntryId ?? originalEntry.parentEntryId),
              activeFrom: normalizeValue((edits as any).activeFrom ?? (originalEntry as any).activeFrom),
              activeTo: normalizeValue((edits as any).activeTo ?? (originalEntry as any).activeTo)
            }

            // Build translations array from edited maps
            const translations: any[] = []
            const translationFields = ['value', 'additionalValue1', 'additionalValue2', 'additionalValue3'] as const
            const translationKeys = {
              value: 'valueTranslations',
              additionalValue1: 'additionalValue1Translations',
              additionalValue2: 'additionalValue2Translations',
              additionalValue3: 'additionalValue3Translations'
            } as const

            const allLocaleCodes = new Set<string>()
            translationFields.forEach(field => {
              const key = translationKeys[field] as keyof CatalogEntry
              const originalMap = (originalEntry as any)[key] || {}
              const editedMap = (edits as any)[key] || {}
              const merged = { ...originalMap, ...editedMap }
              Object.keys(merged).forEach(lc => {
                if (merged[lc]?.trim()) allLocaleCodes.add(lc)
              })
            })
            allLocaleCodes.forEach(lc => {
              const t: any = { localeCode: lc }
              translationFields.forEach(field => {
                const key = translationKeys[field] as keyof CatalogEntry
                const originalMap = (originalEntry as any)[key] || {}
                const editedMap = (edits as any)[key] || {}
                const merged = { ...originalMap, ...editedMap }
                const val = merged[lc]
                if (val && val.trim()) t[field] = normalizeValue(val)
              })
              translations.push(t)
            })
            if (translations.length) createData.translations = translations

            await createCatalogEntry(catalog.identifier, 'v1', createData)
          } else {
            // Update existing entry
            const completeEntryData = buildCompleteEntryData(entryId)
            await updateCatalogEntry(catalog.identifier, 'v1', entryId, completeEntryData)
          }
          return { entryId, success: true }
        } catch (error) {
          console.error(`Failed to save entry ${entryId}:`, error)
          return { entryId, success: false, error }
        }
      })

      const results = await Promise.all(savePromises)
      const failedSaves = results.filter(r => !r.success)

      if (failedSaves.length > 0) {
        alert(`Failed to save ${failedSaves.length} entries. Check console for details.`)
      } else {
        // Clear edited entries and drafts, then refresh data
        setState(prev => ({ ...prev, editedEntries: new Map(), draftEntryIds: new Set() }))
        loadEntries(state.searchTerm, state.currentLimit)
      }
    } catch (error) {
      console.error('Error during bulk save:', error)
      alert('Failed to save entries: ' + (error instanceof Error ? error.message : 'Unknown error'))
    } finally {
      setState(prev => ({ ...prev, isSaving: false }))
    }
  }, [
    state.editedEntries,
    state.draftEntryIds,
    state.allEntries,
    updateCatalogEntry,
    createCatalogEntry,
    catalog.identifier,
    loadEntries,
    setState,
    state.searchTerm,
    state.currentLimit
  ])

  const handleDiscardChanges = useCallback(() => {
    if (window.confirm('Are you sure you want to discard all unsaved changes?')) {
      setState(prev => ({ ...prev, editedEntries: new Map() }))
    }
  }, [setState])

  // Individual entry save/discard functions
  const handleSaveEntry = useCallback(
    async (entryId: string) => {
      const entryEdits = state.editedEntries.get(entryId)
      if (!entryEdits) return

      setState(prev => ({ ...prev, isSaving: true }))

      try {
        const isDraft = state.draftEntryIds.has(entryId)
        if (isDraft) {
          // Create new entry
          const originalEntry = state.allEntries.find(e => e.id === entryId)!
          const normalizeValue = (value: any): any => (typeof value === 'string' && value.trim() === '' ? '' : value)
          const createData: any = {
            code: (entryEdits.code as string) || '',
            alternativeCode: normalizeValue(entryEdits.alternativeCode ?? originalEntry.alternativeCode),
            value: normalizeValue(entryEdits.value ?? originalEntry.value),
            description: normalizeValue(entryEdits.description ?? originalEntry.description),
            additionalValue1: normalizeValue(entryEdits.additionalValue1 ?? originalEntry.additionalValue1),
            additionalValue2: normalizeValue(entryEdits.additionalValue2 ?? originalEntry.additionalValue2),
            additionalValue3: normalizeValue(entryEdits.additionalValue3 ?? originalEntry.additionalValue3),
            type: normalizeValue(entryEdits.type ?? originalEntry.type),
            displayOrder: (entryEdits.displayOrder as number) ?? originalEntry.displayOrder ?? 0,
            objectValue: entryEdits.objectValue ?? originalEntry.objectValue ?? null,
            parentEntryId: normalizeValue(entryEdits.parentEntryId ?? originalEntry.parentEntryId),
            activeFrom: normalizeValue((entryEdits as any).activeFrom ?? (originalEntry as any).activeFrom),
            activeTo: normalizeValue((entryEdits as any).activeTo ?? (originalEntry as any).activeTo)
          }

          // Translations
          const translations: any[] = []
          const translationFields = ['value', 'additionalValue1', 'additionalValue2', 'additionalValue3'] as const
          const translationKeys = {
            value: 'valueTranslations',
            additionalValue1: 'additionalValue1Translations',
            additionalValue2: 'additionalValue2Translations',
            additionalValue3: 'additionalValue3Translations'
          } as const
          const allLocaleCodes = new Set<string>()
          translationFields.forEach(field => {
            const key = translationKeys[field] as keyof CatalogEntry
            const originalMap = (originalEntry as any)[key] || {}
            const editedMap = (entryEdits as any)[key] || {}
            const merged = { ...originalMap, ...editedMap }
            Object.keys(merged).forEach(lc => {
              if (merged[lc]?.trim()) allLocaleCodes.add(lc)
            })
          })
          allLocaleCodes.forEach(lc => {
            const t: any = { localeCode: lc }
            translationFields.forEach(field => {
              const key = translationKeys[field] as keyof CatalogEntry
              const originalMap = (originalEntry as any)[key] || {}
              const editedMap = (entryEdits as any)[key] || {}
              const merged = { ...originalMap, ...editedMap }
              const val = merged[lc]
              if (val && val.trim()) t[field] = normalizeValue(val)
            })
            translations.push(t)
          })
          if (translations.length) createData.translations = translations

          await createCatalogEntry(catalog.identifier, 'v1', createData)
        } else {
          // Update existing entry
          const completeEntryData = buildCompleteEntryData(entryId)
          await updateCatalogEntry(catalog.identifier, 'v1', entryId, completeEntryData)
        }

        // Remove this entry from edited entries (and drafts if needed)
        setState(prev => {
          const newEditedEntries = new Map(prev.editedEntries)
          newEditedEntries.delete(entryId)
          const newDrafts = new Set(prev.draftEntryIds)
          newDrafts.delete(entryId)
          return {
            ...prev,
            editedEntries: newEditedEntries,
            draftEntryIds: newDrafts,
            isSaving: false
          }
        })

        // Refresh data to show updated values
        handleRefresh()
      } catch (error) {
        console.error('Error saving entry:', error)
        setState(prev => ({ ...prev, isSaving: false }))
      }
    },
    [
      state.editedEntries,
      state.draftEntryIds,
      state.allEntries,
      updateCatalogEntry,
      createCatalogEntry,
      catalog.identifier,
      handleRefresh,
      setState
    ]
  )

  const handleDiscardEntry = useCallback(
    (entryId: string) => {
      setState(prev => {
        const newEditedEntries = new Map(prev.editedEntries)
        newEditedEntries.delete(entryId)
        if (prev.draftEntryIds.has(entryId)) {
          // Remove draft row entirely
          const newDrafts = new Set(prev.draftEntryIds)
          newDrafts.delete(entryId)
          const remaining = prev.allEntries.filter(e => e.id !== entryId)
          return { ...prev, editedEntries: newEditedEntries, draftEntryIds: newDrafts, allEntries: remaining }
        }
        return { ...prev, editedEntries: newEditedEntries }
      })
    },
    [setState]
  )

  return {
    handleCreateEntry,
    handleDeleteEntry,
    handleImportCsv,
    handleExportCsv,
    handleRefresh,
    handleViewObjectValue,
    handleJsonChange,
    handleFieldEdit,
    handleJsonSave,
    handleCloseJsonEditor,
    handleToggleRow,
    handleNavigateToChildCatalog,
    handleSaveAll,
    handleDiscardChanges,
    handleSaveEntry,
    handleDiscardEntry
  }
}

export default useCatalogTableActions
