import React from 'react'
import { Button } from '@newwork/nw-design-system'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { formatDataTestId } from '@/common/utils/formatDataTestId'

export interface DocumentAIClassificationProps {
  suggestion: { group?: string; type?: string } | null
  loading: boolean
  error: string | null
  onApplySuggestion: () => void
  'data-testid'?: string
}

/**
 * DocumentAIClassification Component
 *
 * Displays AI classification suggestions for document group and type.
 * Shows loading state, error state, or suggestion with apply button.
 */
export const DocumentAIClassification: React.FC<DocumentAIClassificationProps> = ({
  suggestion,
  loading,
  error,
  onApplySuggestion,
  'data-testid': dataTestId = 'document-ai-classification'
}) => {
  // Don't render if no suggestion and not loading
  if (!suggestion && !loading && !error) {
    return null
  }

  const getSuggestionText = () => {
    if (!suggestion) return ''
    const g = suggestion.group || '—'
    const t = suggestion.type || '—'
    return getTranslationFromI18nKeyAndLabel('document.ai.suggestion', `AI suggestion: Group = ${g}, Type = ${t}`)
  }

  return (
    <div className="gba:text-sm gba:text-muted-foreground" data-testid={dataTestId}>
      {/* Loading state */}
      {loading && (
        <span data-testid={formatDataTestId(dataTestId, 'loading')}>
          {getTranslationFromI18nKeyAndLabel('document.ai.detecting', 'Detecting document group and type…')}
        </span>
      )}

      {/* Error state */}
      {!loading && error && <span data-testid={formatDataTestId(dataTestId, 'error')}>{error}</span>}

      {/* Suggestion with apply button */}
      {!loading && !error && suggestion && (
        <div className="gba:flex gba:flex-col gba:gap-1" data-testid={formatDataTestId(dataTestId, 'suggestion')}>
          <span>{getSuggestionText()}</span>
          <div className="gba:flex gba:gap-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              data-testid={formatDataTestId(dataTestId, 'apply-button')}
              onClick={onApplySuggestion}
            >
              {getTranslationFromI18nKeyAndLabel('document.ai.apply', 'Apply suggestion')}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
