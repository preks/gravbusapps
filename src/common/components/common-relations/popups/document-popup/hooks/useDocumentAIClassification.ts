import { useState, useEffect, useCallback } from 'react'
import { useDocumentClassification } from '@/common/hooks/useDocumentClassification'
import { useCatalogSelectController } from '@/components/catalog-select/CatalogSelectProvider'
import type { UseFormReturn } from 'react-hook-form'

// Normalize AI suggestion values to catalog CODE format (fallback)
// e.g., "Sales" → "SALES", "Info Sheet" → "INFO_SHEET"
const normalizeAiValueToCode = (value: string): string => {
  return value.toUpperCase().replace(/\s+/g, '_')
}

/**
 * Find the best matching option from catalog options by comparing the AI label
 * against option labels (case-insensitive, with partial matching).
 */
export const findMatchingCatalogOption = (
  aiLabel: string,
  options: Array<{ value: string; label: string }>
): string | null => {
  if (!aiLabel || options.length === 0) return null

  const normalized = aiLabel.trim().toLowerCase()

  const byLabel = options.find(o => o.label.trim().toLowerCase() === normalized)
  if (byLabel) return byLabel.value

  const byPartial = options.find(
    o => o.label.trim().toLowerCase().includes(normalized) || normalized.includes(o.label.trim().toLowerCase())
  )
  if (byPartial) return byPartial.value

  return null
}

export interface UseDocumentAIClassificationArgs {
  accessToken?: string | null
  appName: string
  groupCatalogIdentifier: string
  typeCatalogIdentifier: string
  file?: File
  endpoint?: string
  enabled: boolean
  isRenameMode: boolean
  watchedFolder: boolean
}

/**
 * Hook to manage AI document classification
 * - Calls AI classification API when file is selected
 * - Returns suggestion data (apply logic is handled by DocumentAIClassificationApply
 *   which runs INSIDE the CatalogSelect.Provider context)
 */
export const useDocumentAIClassification = ({
  accessToken,
  appName,
  groupCatalogIdentifier,
  typeCatalogIdentifier,
  file,
  endpoint,
  enabled,
  isRenameMode,
  watchedFolder
}: UseDocumentAIClassificationArgs) => {
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

  return {
    suggestion: aiSuggestion,
    loading: aiLoading,
    error: aiError
  }
}

/**
 * Hook that handles applying AI suggestions to form fields.
 * MUST be called inside CatalogSelect.Provider to access catalog options.
 */
export const useDocumentAIApply = ({
  suggestion,
  groupCatalogIdentifier,
  typeCatalogIdentifier,
  form,
  isRenameMode,
  watchedFolder,
  enabled
}: {
  suggestion: { group?: string; type?: string } | null
  groupCatalogIdentifier: string
  typeCatalogIdentifier: string
  form: UseFormReturn<any>
  isRenameMode: boolean
  watchedFolder: boolean
  enabled: boolean
}) => {
  const [applyTypeAfterGroup, setApplyTypeAfterGroup] = useState<string | null>(null)

  const groupController = useCatalogSelectController('documentGroupRef')
  const typeController = useCatalogSelectController('documentTypeRef')

  // Reset deferred type when suggestion changes
  useEffect(() => {
    setApplyTypeAfterGroup(null)
  }, [suggestion])

  // Apply deferred type suggestion after group change (once type options are loaded)
  useEffect(() => {
    if (isRenameMode || watchedFolder || !applyTypeAfterGroup || !enabled) return

    const typeOptions = typeController?.options ?? []
    if (typeOptions.length === 0) return

    const matchedValue = findMatchingCatalogOption(applyTypeAfterGroup, typeOptions)
    if (matchedValue) {
      form.setValue('documentTypeRef', matchedValue, { shouldDirty: true, shouldValidate: true, shouldTouch: true })
    } else {
      const normalizedType = normalizeAiValueToCode(applyTypeAfterGroup)
      const typeRef = `${typeCatalogIdentifier}:v1:${normalizedType}`
      form.setValue('documentTypeRef', typeRef, { shouldDirty: true, shouldValidate: true, shouldTouch: true })
    }
    setApplyTypeAfterGroup(null)
  }, [applyTypeAfterGroup, typeCatalogIdentifier, isRenameMode, watchedFolder, enabled, form, typeController?.options])

  const handleApplySuggestion = useCallback(() => {
    if (!suggestion) return

    if (suggestion.group) {
      const groupOptions = groupController?.options ?? []
      const matchedGroupValue = findMatchingCatalogOption(suggestion.group, groupOptions)

      if (matchedGroupValue) {
        form.setValue('documentGroupRef', matchedGroupValue, {
          shouldDirty: true,
          shouldValidate: true,
          shouldTouch: true
        })
      } else {
        const normalizedGroup = normalizeAiValueToCode(suggestion.group)
        const groupRef = `${groupCatalogIdentifier}:v1:${normalizedGroup}`
        form.setValue('documentGroupRef', groupRef, {
          shouldDirty: true,
          shouldValidate: true,
          shouldTouch: true
        })
      }
    }

    if (suggestion.type) {
      setApplyTypeAfterGroup(suggestion.type)
    }
  }, [suggestion, groupCatalogIdentifier, groupController?.options, form])

  return { handleApplySuggestion }
}
