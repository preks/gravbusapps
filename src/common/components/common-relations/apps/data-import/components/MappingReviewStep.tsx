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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
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

export interface MappingReviewStepProps {
  agentResponse: ImportAnalyzerResponse
  mappings: FieldMapping[]
  unmappedSourceFields: string[]
  targetFieldsConfig: TargetFieldDefinition[]
  entityType?: string
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

            {/* Mapped Fields */}
            <div>
              <h3 className="gba:text-sm gba:font-semibold gba:mb-2">{t('mapped-fields-title')}</h3>
              <div className="gba:space-y-3">
                {mappings.map((mapping, index) => {
                  // Build the current target option so the trigger always shows a value:
                  // - entity field  → use its human-readable label from targetFieldsConfig
                  // - unmapped field chosen previously → raw name (it was removed from unmapped list)
                  const currentEntityField = targetFieldsConfig.find(tf => tf.value === mapping.targetField)
                  const currentOption = mapping.targetField
                    ? currentEntityField
                      ? { value: currentEntityField.value, label: currentEntityField.label }
                      : { value: mapping.targetField, label: mapping.targetField }
                    : null

                  // Remaining dropdown options come from unmappedSourceFields only.
                  // Exclude the current target if it's already listed there to avoid duplicates.
                  const unmappedOptions = unmappedSourceFields
                    .filter(f => f !== mapping.targetField)
                    .map(f => ({ value: f, label: f }))

                  const targetOptions = currentOption ? [currentOption, ...unmappedOptions] : unmappedOptions

                  return (
                    <div
                      key={`${mapping.sourceField}-${mapping.targetField}-${index}`}
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
                        <Select
                          value={mapping.targetField || undefined}
                          onValueChange={value => onUpdateTargetFromUnmapped(index, value)}
                        >
                          <SelectTrigger className="gba:w-full">
                            <SelectValue placeholder="Select a field" />
                          </SelectTrigger>
                          <SelectContent>
                            {targetOptions.map(opt => (
                              <SelectItem key={opt.value} value={opt.value}>
                                {opt.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
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
