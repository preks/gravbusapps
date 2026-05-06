/**
 * Conversion Result Step Component
 * Generic preview and import for any entity type
 */

import React, { useMemo } from 'react'
import { Card, CardHeader, CardTitle, CardContent, Button, Spinner, useTranslation } from '@newwork/nw-design-system'
import {
  CheckCircleIcon,
  DownloadIcon,
  UploadIcon,
  WarningIcon,
  EnvelopeIcon,
  ArrowCounterClockwiseIcon,
  MegaphoneSimpleIcon,
  ClockIcon
} from '@phosphor-icons/react'
import {
  ConvertedEntity,
  TargetFieldDefinition,
  ImportResult,
  CsvQuality
} from '@/common/components/common-relations/apps/data-import/types'
import { calculateDataQuality } from '@/common/components/common-relations/apps/data-import/utils/dataQualityCalculator'
import { pluralize } from '@/common/utils/pluralize'
import { CsvQualityBanner } from './CsvQualityBanner'
import { EntityPreviewCard } from './EntityPreviewCard'
import translations from './ConversionResultStep/_i18n'

export interface ConversionResultStepProps<T = ConvertedEntity> {
  convertedEntities: T[]
  targetFieldsConfig: TargetFieldDefinition[]
  entityType: string
  isLoading: boolean
  importResult: ImportResult | null
  /** Name of the campaign to associate with the import (CRM only) */
  campaignName?: string
  /** CSV structural quality info from the backend (absent for Excel files) */
  csvQuality?: CsvQuality | null
  /** Warnings from the backend extraction (e.g. unresolved investment names) */
  extractionWarnings?: string[]
  /** Re-extract the file with hard repair mode */
  onHardRepair?: () => Promise<void>
  onDownloadJSON: () => void
  onImportToBackend: () => Promise<void>
  onReset: () => void
  'data-testid'?: string
}

export const ConversionResultStep = <T extends ConvertedEntity = ConvertedEntity>({
  convertedEntities,
  targetFieldsConfig,
  entityType,
  isLoading,
  campaignName,
  extractionWarnings,
  csvQuality,
  onHardRepair,
  onDownloadJSON,
  onImportToBackend,
  onReset,
  'data-testid': testId = 'conversion-result-step'
}: ConversionResultStepProps<T>) => {
  const { t } = useTranslation(translations)

  // State for expandable warnings
  const [showAllWarnings, setShowAllWarnings] = React.useState(false)
  // Flip immediately on click so the "in progress" screen shows without waiting for the API
  const [importStarted, setImportStarted] = React.useState(false)
  const [repairAttempted, setRepairAttempted] = React.useState(false)
  const [isRepairing, setIsRepairing] = React.useState(false)

  const handleHardRepair = async () => {
    if (!onHardRepair) return
    setIsRepairing(true)
    try {
      await onHardRepair()
      setRepairAttempted(true)
    } finally {
      setIsRepairing(false)
    }
  }

  const handleImportToBackend = async () => {
    setImportStarted(true)
    try {
      await onImportToBackend()
    } catch {
      setImportStarted(false)
    }
  }

  // Calculate data quality metrics
  const dataQuality = useMemo(
    () => calculateDataQuality(convertedEntities as ConvertedEntity[], targetFieldsConfig),
    [convertedEntities, targetFieldsConfig]
  )

  // Get first 3 entities for preview
  const previewEntities = convertedEntities.slice(0, 3)
  const entityLabel = pluralize(entityType)
  const entityLabelSingular = entityType.charAt(0).toUpperCase() + entityType.slice(1)

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
            {/* Import in Progress Message */}
            {importStarted && (
              <Card variant="surface" className="gba:border-primary">
                <CardContent className="gba:p-6">
                  <div className="gba:flex gba:flex-col gba:items-center gba:gap-4 gba:text-center">
                    <div className="gba:relative">
                      <ClockIcon className="gba:w-16 gba:h-16 gba:text-primary" weight="fill" />
                    </div>
                    <div>
                      <h3 className="gba:text-2xl gba:font-semibold gba:text-primary gba:mb-2">
                        {t('import-success-title')}
                      </h3>
                      <p className="gba:text-base gba:text-foreground gba:max-w-md">
                        {t('import-success-message', {
                          count: convertedEntities.length,
                          entityType: convertedEntities.length === 1 ? entityLabelSingular.toLowerCase() : entityLabel
                        })}
                      </p>
                    </div>
                    <div className="gba:flex gba:items-center gba:gap-2 gba:text-sm gba:text-muted-foreground gba:bg-muted gba:rounded-md gba:px-4 gba:py-2">
                      <EnvelopeIcon className="gba:w-4 gba:h-4 gba:shrink-0" />
                      <span>{t('import-success-email-hint')}</span>
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
            {!importStarted && (
              <div className="gba:flex gba:items-center gba:gap-2 gba:text-sm gba:text-success">
                <CheckCircleIcon className="gba:w-5 gba:h-5 gba:text-success" weight="fill" />
                {t('conversion-success-message', { count: convertedEntities.length, entityType: entityLabel })}
              </div>
            )}

            {/* Selected campaign indicator */}
            {!importStarted && campaignName && (
              <div
                className="gba:flex gba:items-center gba:gap-2 gba:text-sm gba:text-muted-foreground"
                data-testid={`${testId}-campaign-label`}
              >
                <MegaphoneSimpleIcon className="gba:w-4 gba:h-4 gba:flex-shrink-0" />
                <span>{t('campaign-label', { name: campaignName })}</span>
              </div>
            )}

            {/* CSV Quality Banner (shown when not yet imported and quality data available) */}
            {!importStarted && csvQuality && onHardRepair && (
              <CsvQualityBanner
                csvQuality={csvQuality}
                isRepairing={isRepairing}
                repairAttempted={repairAttempted}
                onRepair={handleHardRepair}
                data-testid={`${testId}-csv-quality-banner`}
              />
            )}

            {/* Preview, Warnings, and Import Button (shown when not yet imported) */}
            {!importStarted && (
              <>
                {/* Entity Preview Cards */}
                <div className="gba:space-y-2">
                  <h3 className="gba:text-sm gba:font-medium">
                    {t('preview-title', { count: previewEntities.length, entityType: entityLabel })}
                  </h3>
                  {previewEntities.map((entity, idx) => (
                    <EntityPreviewCard
                      key={idx}
                      entity={entity as ConvertedEntity}
                      data-testid={`${testId}-preview-${idx}`}
                    />
                  ))}
                  {convertedEntities.length > 3 && (
                    <div className="gba:text-sm gba:text-muted-foreground gba:text-center gba:py-2">
                      {t('preview-more-text', { count: convertedEntities.length - 3, entityType: entityLabel })}
                    </div>
                  )}
                </div>

                {/* Backend Extraction Warnings */}
                {extractionWarnings && extractionWarnings.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="gba:text-base">{t('extraction-warnings-title')}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="gba:space-y-2">
                        {extractionWarnings.map((warning, idx) => (
                          <div
                            key={`extraction-warning-${idx}`}
                            className="gba:flex gba:items-start gba:gap-2 gba:text-sm"
                            data-testid={`${testId}-extraction-warning-${idx}`}
                          >
                            <WarningIcon
                              className="gba:w-4 gba:h-4 gba:text-destructive gba:mt-0.5 gba:flex-shrink-0"
                              weight="fill"
                            />
                            <span>{warning}</span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

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

                {/* Import button (domain-neutral; submission strategy is injected by CRM/IRM wrapper) */}
                <Button
                  onClick={handleImportToBackend}
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
