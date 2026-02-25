/**
 * Conversion Result Step Component
 * Generic preview and import for any entity type
 */

import React, { useMemo } from 'react'
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Button,
  Spinner,
  Badge,
  useTranslation
} from '@newwork/nw-design-system'
import {
  CheckCircleIcon,
  DownloadIcon,
  UploadIcon,
  WarningIcon,
  EnvelopeIcon,
  PhoneIcon,
  BuildingsIcon,
  MapPinIcon,
  ArrowCounterClockwiseIcon,
  MegaphoneSimpleIcon
} from '@phosphor-icons/react'
import {
  ConvertedEntity,
  TargetFieldDefinition,
  ImportResult
} from '@/common/components/common-relations/apps/data-import/types'
import { calculateDataQuality } from '@/common/components/common-relations/apps/data-import/utils/dataQualityCalculator'
import { pluralize } from '@/common/utils/pluralize'
import translations from './ConversionResultStep/_i18n'

export interface ConversionResultStepProps<T = ConvertedEntity> {
  convertedEntities: T[]
  targetFieldsConfig: TargetFieldDefinition[]
  entityType: string
  isLoading: boolean
  importResult: ImportResult | null
  /** Name of the campaign to associate with the import (CRM only) */
  campaignName?: string
  onDownloadJSON: () => void
  onImportToBackend: () => Promise<void>
  onReset: () => void
  'data-testid'?: string
}

export const ConversionResultStep = <T = ConvertedEntity,>({
  convertedEntities,
  targetFieldsConfig,
  entityType,
  isLoading,
  importResult,
  campaignName,
  onDownloadJSON,
  onImportToBackend,
  onReset,
  'data-testid': testId = 'conversion-result-step'
}: ConversionResultStepProps<T>) => {
  const { t } = useTranslation(translations)

  // State for expandable warnings
  const [showAllWarnings, setShowAllWarnings] = React.useState(false)

  // Calculate data quality metrics
  const dataQuality = useMemo(
    () => calculateDataQuality(convertedEntities, targetFieldsConfig),
    [convertedEntities, targetFieldsConfig]
  )

  // Get first 3 entities for preview
  const previewEntities = convertedEntities.slice(0, 3)
  const entityLabel = pluralize(entityType)
  const entityLabelSingular = entityType.charAt(0).toUpperCase() + entityType.slice(1)
  const getRefCode = (ref?: unknown) => {
    if (typeof ref !== 'string') return undefined
    const parts = ref.split(':')
    return parts.length ? parts[parts.length - 1] : undefined
  }

  return (
    <div className="gba:space-y-4" data-testid={testId}>
      <Card>
        <CardHeader>
          <div className="gba:flex gba:justify-between gba:items-center">
            <CardTitle>{t('conversion-result-step-title')}</CardTitle>
            <div className="gba:flex gba:gap-2">
              <Button variant="outline" size="sm" onClick={onDownloadJSON} data-testid={`${testId}-download-button`}>
                <DownloadIcon className="gba:w-4 gba:h-4 gba:mr-2" />
                {t('download-json-button')}
              </Button>
              <Button variant="outline" size="sm" onClick={onReset} data-testid={`${testId}-reset-button`}>
                {t('start-over-button')}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="gba:space-y-4">
            {/* Import Success Message */}
            {importResult && (
              <Card variant="outlined" className="gba:border-success">
                <CardContent className="gba:p-6">
                  <div className="gba:flex gba:flex-col gba:items-center gba:gap-4 gba:text-center">
                    <CheckCircleIcon className="gba:w-16 gba:h-16 gba:text-success" weight="fill" />
                    <div>
                      <h3 className="gba:text-2xl gba:font-semibold gba:text-success gba:mb-2">
                        {t('import-success-title')}
                      </h3>
                      <p className="gba:text-base gba:text-foreground">
                        {t('import-success-message', {
                          count: importResult.successCount,
                          entityType: importResult.successCount === 1 ? entityLabelSingular.toLowerCase() : entityLabel
                        })}
                      </p>
                    </div>
                    <div className="gba:flex gba:gap-3 gba:w-full gba:max-w-md gba:mt-2">
                      <Button
                        variant="outline"
                        onClick={onReset}
                        className="gba:flex-1"
                        data-testid={`${testId}-import-more-button`}
                      >
                        <ArrowCounterClockwiseIcon className="gba:w-4 gba:h-4 gba:mr-2" />
                        {t('import-more-button')}
                      </Button>
                      <Button onClick={onReset} className="gba:flex-1" data-testid={`${testId}-done-button`}>
                        {t('done-button')}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Conversion Success Message (shown when not yet imported) */}
            {!importResult && (
              <div className="gba:flex gba:items-center gba:gap-2 gba:text-sm gba:text-success">
                <CheckCircleIcon className="gba:w-5 gba:h-5 gba:text-success" weight="fill" />
                {t('conversion-success-message', { count: convertedEntities.length, entityType: entityLabel })}
              </div>
            )}

            {/* Selected campaign indicator */}
            {!importResult && campaignName && (
              <div
                className="gba:flex gba:items-center gba:gap-2 gba:text-sm gba:text-muted-foreground"
                data-testid={`${testId}-campaign-label`}
              >
                <MegaphoneSimpleIcon className="gba:w-4 gba:h-4 gba:flex-shrink-0" />
                <span>{t('campaign-label', { name: campaignName })}</span>
              </div>
            )}

            {/* Preview, Warnings, and Import Button (shown when not yet imported) */}
            {!importResult && (
              <>
                {/* Entity Preview Cards */}
                <div className="gba:space-y-2">
                  <h3 className="gba:text-sm gba:font-medium">
                    {t('preview-title', { count: previewEntities.length, entityType: entityLabel })}
                  </h3>
                  {previewEntities.map((entity, idx) => (
                    <Card key={idx} data-testid={`${testId}-preview-${idx}`}>
                      <CardContent className="gba:p-3">
                        <div className="gba:space-y-2">
                          {/* Name and Position */}
                          <div className="gba:flex gba:items-center gba:gap-2 gba:flex-wrap">
                            <span className="gba:font-medium">
                              {(entity as any).name ||
                                [entity.firstName, entity.lastName].filter(Boolean).join(' ') ||
                                entity.companyName ||
                                ''}
                            </span>
                            {(entity.position || entity.jobPosition || (entity as any).opportunityPipelineStageRef) && (
                              <Badge variant="secondary" size="sm">
                                {entity.position ||
                                  entity.jobPosition ||
                                  getRefCode((entity as any).salesPipelineStageRef) ||
                                  getRefCode((entity as any).opportunityPipelineStageRef)}
                              </Badge>
                            )}
                          </div>

                          {/* Company (for leads) */}
                          {entity.companyName && (
                            <div className="gba:flex gba:items-center gba:gap-2 gba:text-sm">
                              <BuildingsIcon className="gba:w-4 gba:h-4 gba:text-muted-foreground" />
                              <span>{entity.companyName}</span>
                              {entity.industryRef && (
                                <Badge variant="success" size="sm">
                                  {t('industry-badge')}
                                </Badge>
                              )}
                              {entity.numberOfEmployeesRef && (
                                <Badge variant="info" size="sm">
                                  {t('size-badge')}
                                </Badge>
                              )}
                            </div>
                          )}

                          {/* Location */}
                          {(entity.city || entity.countryRef) && (
                            <div className="gba:flex gba:items-center gba:gap-2 gba:text-sm">
                              <MapPinIcon className="gba:w-4 gba:h-4 gba:text-muted-foreground" />
                              <span>
                                {entity.city}
                                {entity.city && entity.countryRef && ', '}
                                {entity.countryRef && (
                                  <Badge variant="secondary" size="sm">
                                    {entity.countryRef.split(':').pop()}
                                  </Badge>
                                )}
                              </span>
                            </div>
                          )}

                          {/* Contact */}
                          <div className="gba:flex gba:items-center gba:gap-4 gba:text-sm gba:text-muted-foreground">
                            {entity.email && (
                              <div className="gba:flex gba:items-center gba:gap-1">
                                <EnvelopeIcon className="gba:w-4 gba:h-4" />
                                <span className="gba:text-xs">{entity.email}</span>
                              </div>
                            )}
                            {entity.phoneNumber && (
                              <div className="gba:flex gba:items-center gba:gap-1">
                                <PhoneIcon className="gba:w-4 gba:h-4" />
                                <span className="gba:text-xs">{entity.phoneNumber}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                  {convertedEntities.length > 3 && (
                    <div className="gba:text-sm gba:text-muted-foreground gba:text-center gba:py-2">
                      {t('preview-more-text', { count: convertedEntities.length - 3, entityType: entityLabel })}
                    </div>
                  )}
                </div>

                {/* Data Quality Warnings */}
                {dataQuality.warnings.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="gba:text-base">{t('data-quality-warnings-title')}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="gba:space-y-2">
                        {(showAllWarnings ? dataQuality.warnings : dataQuality.warnings.slice(0, 10)).map(
                          (warning, idx) => (
                            <div
                              key={`warning-${warning}-${idx}`}
                              className="gba:flex gba:items-start gba:gap-2 gba:text-sm"
                              data-testid={`${testId}-warning-${idx}`}
                            >
                              <WarningIcon className="gba:w-4 gba:h-4 gba:text-warning gba:mt-0.5 gba:flex-shrink-0" />
                              <span>{warning}</span>
                            </div>
                          )
                        )}
                        {dataQuality.warnings.length > 10 && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setShowAllWarnings(!showAllWarnings)}
                            className="gba:w-full gba:text-muted-foreground"
                            data-testid={`${testId}-toggle-warnings-button`}
                          >
                            {showAllWarnings
                              ? t('show-less-button')
                              : t('more-warnings-text', { count: dataQuality.warnings.length - 10 })}
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {dataQuality.warnings.length === 0 && (
                  <Card>
                    <CardContent className="gba:p-4">
                      <div className="gba:flex gba:items-center gba:gap-2 gba:text-sm gba:text-success-foreground">
                        <CheckCircleIcon className="gba:w-5 gba:h-5" weight="fill" />
                        <span>{t('all-fields-good-message')}</span>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Import to CRM Button */}
                <Button
                  onClick={onImportToBackend}
                  disabled={isLoading}
                  className="gba:w-full"
                  data-testid={`${testId}-import-button`}
                >
                  {isLoading ? (
                    <>
                      <Spinner className="gba:w-4 gba:h-4 gba:mr-2" />
                      {t('importing-button')}
                    </>
                  ) : (
                    <>
                      <UploadIcon className="gba:w-4 gba:h-4 gba:mr-2" />
                      {t('import-button', { count: convertedEntities.length, entityType: `${entityLabelSingular}s` })}
                    </>
                  )}
                </Button>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
