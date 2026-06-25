/**
 * Mapping Review Step Component
 * Generic field mapping review for any entity import
 */

import React from 'react'
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Button,
  Label,
  Combobox,
  Spinner,
  useTranslation
} from '@newwork/nw-design-system'
import { CheckCircleIcon, XCircleIcon } from '@phosphor-icons/react'
import {
  FieldMapping,
  ImportAnalyzerResponse,
  TargetFieldDefinition
} from '@/common/components/common-relations/apps/data-import/types'
import translations from './MappingReviewStep/_i18n'

function humanizeFieldPath(fieldPath: string): string {
  const parts = fieldPath.split('.')
  const lastPart = parts[parts.length - 1]
  const label = lastPart
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, c => c.toUpperCase())
    .trim()
  if (parts.length > 1) {
    const parent = parts[0]
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, c => c.toUpperCase())
      .trim()
    return `${label} (${parent})`
  }
  return label
}

export interface MappingReviewStepProps {
  agentResponse: ImportAnalyzerResponse
  mappings: FieldMapping[]
  unmappedSourceFields: string[]
  targetFieldsConfig: TargetFieldDefinition[]
  entityType?: string
  relationshipColumnHints?: string[]
  isLoading: boolean
  onUpdateTargetFromUnmapped: (index: number, newTargetField: string) => void
  onRemoveMapping: (index: number) => void
  onAddMapping: (sourceField: string) => void
  onConvert: () => void
  onReset: () => void
  'data-testid'?: string
}

export const MappingReviewStep: React.FC<MappingReviewStepProps> = ({
  agentResponse,
  mappings,
  unmappedSourceFields,
  targetFieldsConfig,
  entityType = 'records',
  relationshipColumnHints,
  isLoading,
  onUpdateTargetFromUnmapped,
  onRemoveMapping,
  onAddMapping,
  onConvert,
  onReset,
  'data-testid': testId = 'mapping-review-step'
}) => {
  const { t } = useTranslation(translations)

  // Defensive check - validate agentResponse has required properties (critical for preventing crashes)
  if (!agentResponse?.sourceFields) {
    return (
      <Card>
        <CardContent>
          <p className="gba:text-muted-foreground">{t('no-analysis-data')}</p>
        </CardContent>
      </Card>
    )
  }

  const sourceFields = agentResponse.sourceFields || []

  return (
    <div className="gba:space-y-4" data-testid={testId}>
      <Card>
        <CardHeader>
          <div className="gba:flex gba:justify-between gba:items-center">
            <CardTitle>{t('mapping-review-step-title')}</CardTitle>
            <Button variant="outline" size="sm" onClick={onReset} data-testid={`${testId}-reset-button`}>
              {t('start-over-button')}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="gba:space-y-4">
            {/* Summary */}
            <div className="gba:text-sm gba:text-muted-foreground">
              <p>{t('ai-detected-summary', { sourceCount: sourceFields.length, mappedCount: mappings.length })}</p>
              {unmappedSourceFields.length > 0 && (
                <p className="gba:mt-1 gba:text-warning-foreground">
                  {t('unmapped-fields-warning', { count: unmappedSourceFields.length })}
                </p>
              )}
            </div>

            {relationshipColumnHints && relationshipColumnHints.length > 0 && (
              <div
                className="gba:rounded-lg gba:border gba:border-info gba:bg-info-secondary gba:p-3 gba:text-sm"
                data-testid={`${testId}-relationship-hints`}
              >
                <p className="gba:font-medium gba:text-info-foreground">{t('relationship-columns-title')}</p>
                <div className="gba:mt-1 gba:space-y-1 gba:text-muted-foreground">
                  {relationshipColumnHints.map(hint => (
                    <p key={hint}>{t(hint)}</p>
                  ))}
                </div>
              </div>
            )}

            {/* Mapped Fields */}
            <div>
              <h3 className="gba:text-sm gba:font-semibold gba:mb-2">{t('mapped-fields-title')}</h3>
              <div className="gba:space-y-3">
                {mappings.map((mapping, index) => {
                  const usedByOtherRows = new Set(mappings.filter((_, i) => i !== index).map(m => m.targetField))
                  const configFieldValues = new Set(targetFieldsConfig.map(tf => tf.value))

                  const backendOnlyFields: TargetFieldDefinition[] = mappings
                    .filter(m => m.targetField && !configFieldValues.has(m.targetField))
                    .map(m => ({
                      value: m.targetField,
                      label: humanizeFieldPath(m.targetField),
                      type: 'direct' as const
                    }))
                    .filter((tf, i, arr) => arr.findIndex(x => x.value === tf.value) === i)

                  const allTargetFields = [...targetFieldsConfig, ...backendOnlyFields]
                  const availableTargetFields = allTargetFields
                    .filter(tf => !usedByOtherRows.has(tf.value) || tf.value === mapping.targetField)
                    .sort((a, b) => a.label.localeCompare(b.label, undefined, { sensitivity: 'base' }))
                  const targetFieldOptions = availableTargetFields.map(tf => ({
                    value: tf.value,
                    label: tf.label
                  }))

                  return (
                    <div
                      key={`${mapping.sourceField}-${index}`}
                      className="gba:flex gba:items-center gba:gap-3 gba:p-3 gba:border gba:rounded-lg"
                      data-testid={`${testId}-mapping-${index}`}
                    >
                      <div className="gba:flex-1">
                        <Label className="gba:text-xs gba:text-muted-foreground">{t('source-field-label')}</Label>
                        <div className="gba:font-medium gba:text-sm" data-testid={`${testId}-source-field-${index}`}>
                          {mapping.sourceField}
                        </div>
                      </div>

                      <div className="gba:text-muted-foreground">→</div>

                      <div className="gba:flex-1">
                        <Label className="gba:text-xs gba:text-muted-foreground">{t('target-field-label')}</Label>
                        <Combobox
                          className="gba:w-full"
                          value={mapping.targetField || ''}
                          onValueChange={value => onUpdateTargetFromUnmapped(index, value || '')}
                          options={targetFieldOptions}
                          placeholder={t('select-field-placeholder')}
                          searchPlaceholder={t('search-field-placeholder')}
                          emptyText={t('no-fields-found')}
                          data-testid={`${testId}-target-field-${index}`}
                        />
                      </div>

                      <div className="gba:w-20">
                        <Label className="gba:text-xs gba:text-muted-foreground">{t('type-label')}</Label>
                        <div className="gba:text-xs gba:font-medium gba:mt-1">
                          {mapping.transformationType === 'catalog' ? t('type-catalog') : t('type-direct')}
                        </div>
                      </div>

                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onRemoveMapping(index)}
                        data-testid={`${testId}-remove-mapping-${index}`}
                      >
                        <XCircleIcon className="gba:w-4 gba:h-4" />
                      </Button>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Unmapped Fields */}
            {unmappedSourceFields.length > 0 && (
              <div>
                <h3 className="gba:text-sm gba:font-semibold gba:mb-2">
                  {t('unmapped-fields-title', { count: unmappedSourceFields.length })}
                </h3>
                <div className="gba:bg-warning-secondary gba:border gba:border-warning gba:rounded-lg gba:p-3">
                  <div className="gba:flex gba:flex-wrap gba:gap-2">
                    {unmappedSourceFields.map(field => (
                      <button
                        key={field}
                        onClick={() => onAddMapping(field)}
                        className="gba:px-3 gba:py-1 gba:text-xs gba:bg-background gba:border gba:border-border gba:rounded gba:hover:bg-muted gba:transition-colors"
                        data-testid={`${testId}-unmapped-field-${field}`}
                      >
                        {field}
                      </button>
                    ))}
                  </div>
                  <p className="gba:text-xs gba:text-muted-foreground gba:mt-2">{t('click-to-add-hint')}</p>
                </div>
              </div>
            )}

            {/* Convert Button */}
            <Button
              onClick={onConvert}
              disabled={isLoading}
              className="gba:w-full"
              data-testid={`${testId}-convert-button`}
            >
              {isLoading ? (
                <>
                  <Spinner className="gba:w-4 gba:h-4 gba:mr-2" />
                  {t('converting-button')}
                </>
              ) : (
                <>
                  <CheckCircleIcon className="gba:w-4 gba:h-4 gba:mr-2" weight="fill" />
                  {agentResponse.totalRowsRead
                    ? t('convert-button', { count: agentResponse.totalRowsRead, entityType })
                    : t('convert-button-no-count', { entityType })}
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
