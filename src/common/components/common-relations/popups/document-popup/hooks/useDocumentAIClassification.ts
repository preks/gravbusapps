import { useState, useEffect, useCallback } from 'react'
import { useDocumentClassification } from '@/common/hooks/useDocumentClassification'
import type { UseFormReturn } from 'react-hook-form'

// Normalize AI suggestion values to catalog CODE format
// e.g., "Sales" → "SALES", "Info Sheet" → "INFO_SHEET"
const normalizeAiValueToCode = (value: string): string => {
  return value.toUpperCase().replaceAll(/\s+/g, '_')
}

export interface UseDocumentAIClassificationArgs {
  accessToken?: string | null
  appName: string
  groupCatalogIdentifier: string
  typeCatalogIdentifier: string
  file?: File
  endpoint?: string
  enabled: boolean
  form: UseFormReturn<any>
  isRenameMode: boolean
  watchedFolder: boolean
}

/**
 * Hook to manage AI document classification
 * - Calls AI classification API when file is selected
 * - Handles applying suggestions to form (group then type)
 * - Manages deferred type application for parent-child filtering
 */
export const useDocumentAIClassification = ({
  accessToken,
  appName,
  groupCatalogIdentifier,
  typeCatalogIdentifier,
  file,
  endpoint,
  enabled,
  form,
  isRenameMode,
  watchedFolder
}: UseDocumentAIClassificationArgs) => {
  const [applyTypeAfterGroup, setApplyTypeAfterGroup] = useState<string | null>(null)

  const classificationEnabled = enabled && !isRenameMode && !watchedFolder && !!file

  const {
    suggestion: aiSuggestion,
    loading: aiLoading,
    error: aiError
  } = useDocumentClassification({
    accessToken,
    entity: appName,
    groupCatalogIdentifier,
    typeCatalogIdentifier,
    file: classificationEnabled ? file : undefined,
    endpoint,
    enabled: classificationEnabled
  })

  // Reset deferred type application when file changes
  useEffect(() => {
    setApplyTypeAfterGroup(null)
  }, [file, classificationEnabled])

  // Apply deferred type suggestion after group change
  useEffect(() => {
    if (isRenameMode || watchedFolder || !applyTypeAfterGroup || !enabled) return

    // applyTypeAfterGroup is already normalized, construct catalog reference string
    const typeRef = `${typeCatalogIdentifier}:v1:${applyTypeAfterGroup}`
    form.setValue('documentTypeRef', typeRef, { shouldDirty: true, shouldValidate: true, shouldTouch: true })
    setApplyTypeAfterGroup(null)
  }, [applyTypeAfterGroup, typeCatalogIdentifier, isRenameMode, watchedFolder, enabled, form])

  const handleApplySuggestion = useCallback(() => {
    if (!aiSuggestion) return

    // Apply group first (if present)
    if (aiSuggestion.group) {
      const normalizedGroup = normalizeAiValueToCode(aiSuggestion.group)
      const groupRef = `${groupCatalogIdentifier}:v1:${normalizedGroup}`
      form.setValue('documentGroupRef', groupRef, {
        shouldDirty: true,
        shouldValidate: true,
        shouldTouch: true
      })
    }

    // Defer type application to allow parent-child filtering to work
    if (aiSuggestion.type) {
      const normalizedType = normalizeAiValueToCode(aiSuggestion.type)
      setApplyTypeAfterGroup(normalizedType)
    }
  }, [aiSuggestion, groupCatalogIdentifier, form])

  return {
    suggestion: aiSuggestion,
    loading: aiLoading,
    error: aiError,
    handleApplySuggestion
  }
}
