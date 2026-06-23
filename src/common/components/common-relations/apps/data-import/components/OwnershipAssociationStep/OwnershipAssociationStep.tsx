/**
 * Step 4 — Ownership association flow for Investment Company import.
 * Auto-detects Owned By / Owns columns without a separate mapping step.
 */

import React, { useMemo } from 'react'
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Input,
  Label,
  Spinner,
  useTranslation
} from '@newwork/nw-design-system'
import { CheckCircleIcon, UploadIcon, WarningIcon, ArrowCounterClockwiseIcon } from '@phosphor-icons/react'
import type {
  ImportConfig,
  ImportResult,
  InvestmentCompanyOwnershipUpdate
} from '@/common/components/common-relations/apps/data-import/types'
import {
  formatOwnershipCompanyNames,
  summarizeOwnershipUpdates
} from '@/common/components/common-relations/apps/data-import/utils/ownershipSummaryUtils'
import conversionResultTranslations from '../ConversionResultStep/_i18n'
import translations from './_i18n'

export interface OwnershipAssociationStepProps {
  config: ImportConfig
  ownershipFile: File | null
  ownershipUpdates: InvestmentCompanyOwnershipUpdate[]
  ownershipExtractionWarnings: string[]
  ownershipImportResult: ImportResult | null
  hasPreviousFile: boolean
  isLoading: boolean
  onOwnershipFileChange: (file: File | null) => void
  onUsePreviousFile: () => void
  onExtract: () => Promise<void>
  onImportOwnership: () => Promise<void>
  onSkip: () => void
  onDone: () => void
  'data-testid'?: string
}

export const OwnershipAssociationStep: React.FC<OwnershipAssociationStepProps> = ({
  config,
  ownershipFile,
  ownershipUpdates,
  ownershipExtractionWarnings,
  ownershipImportResult,
  hasPreviousFile,
  isLoading,
  onOwnershipFileChange,
  onUsePreviousFile,
  onExtract,
  onImportOwnership,
  onSkip,
  onDone,
  'data-testid': testId = 'ownership-association-step'
}) => {
  const { t } = useTranslation(translations)
  const { t: tResult } = useTranslation(conversionResultTranslations)

  const ownershipSummary = useMemo(() => summarizeOwnershipUpdates(ownershipUpdates), [ownershipUpdates])
  const relationshipColumnHints = config.ownershipStep?.relationshipColumnHints ?? []
  const importCompleted = ownershipImportResult !== null

  const handleFileInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0] ?? null
    onOwnershipFileChange(selectedFile)
  }

  return (
    <div className="gba:space-y-4" data-testid={testId}>
      <Card>
        <CardHeader>
          <CardTitle>{t('ownership-step-title')}</CardTitle>
        </CardHeader>
        <CardContent className="gba:space-y-4">
          <p className="gba:text-sm gba:text-muted-foreground">{t('ownership-step-description')}</p>

          {relationshipColumnHints.length > 0 && (
            <ul className="gba:list-disc gba:pl-5 gba:space-y-1 gba:text-sm gba:text-muted-foreground">
              {relationshipColumnHints.map(hint => (
                <li key={hint}>{t(hint)}</li>
              ))}
            </ul>
          )}

          {!importCompleted && (
            <>
              <div className="gba:space-y-2">
                <Label htmlFor={`${testId}-ownership-file`}>{t('ownership-upload-label')}</Label>
                <Input
                  id={`${testId}-ownership-file`}
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  onChange={handleFileInputChange}
                  data-testid={`${testId}-ownership-file-input`}
                />
                {ownershipFile && (
                  <p className="gba:text-sm gba:text-muted-foreground" data-testid={`${testId}-selected-file`}>
                    {ownershipFile.name}
                  </p>
                )}
              </div>

              {hasPreviousFile && (
                <Button
                  variant="outline"
                  onClick={onUsePreviousFile}
                  disabled={isLoading}
                  data-testid={`${testId}-use-previous-file-button`}
                >
                  <ArrowCounterClockwiseIcon className="gba:w-4 gba:h-4 gba:mr-2" />
                  {t('ownership-use-previous-file-button')}
                </Button>
              )}

              <Button
                variant="outline"
                onClick={onExtract}
                disabled={isLoading || !ownershipFile}
                className="gba:w-full"
                data-testid={`${testId}-extract-button`}
              >
                {isLoading ? (
                  <>
                    <Spinner className="gba:w-4 gba:h-4 gba:mr-2" />
                    {t('ownership-extracting-button')}
                  </>
                ) : (
                  t('ownership-extract-button')
                )}
              </Button>

              {!ownershipFile && (
                <p className="gba:text-sm gba:text-muted-foreground">{t('ownership-no-file-message')}</p>
              )}

              {ownershipFile &&
                ownershipUpdates.length === 0 &&
                !isLoading &&
                ownershipExtractionWarnings.length === 0 && (
                  <p className="gba:text-sm gba:text-muted-foreground">{t('ownership-no-relationships-message')}</p>
                )}
            </>
          )}

          {ownershipUpdates.length > 0 && !importCompleted && (
            <Card data-testid={`${testId}-ownership-summary`}>
              <CardHeader>
                <CardTitle className="gba:text-base">{tResult('ownership-summary-title')}</CardTitle>
              </CardHeader>
              <CardContent className="gba:space-y-3">
                <div className="gba:text-sm gba:text-muted-foreground">
                  {tResult('ownership-summary-description', {
                    count: ownershipSummary.relationshipCount,
                    unresolvedCount: ownershipSummary.unresolvedCount
                  })}
                </div>
                <div className="gba:space-y-2">
                  {ownershipUpdates.slice(0, 5).map(update => (
                    <div
                      key={`${update.rowIndex}-${update.companyName ?? 'company'}`}
                      className="gba:rounded-md gba:border gba:p-3 gba:text-sm"
                    >
                      <div className="gba:font-medium">
                        {update.companyName || tResult('ownership-summary-unknown-company')}
                      </div>
                      {update.ownerCompanyNames.length > 0 && (
                        <div className="gba:mt-1 gba:text-muted-foreground">
                          {tResult('ownership-summary-owned-by', {
                            names: formatOwnershipCompanyNames(
                              update.ownerCompanyNames,
                              update.ownerCompanyIds,
                              update.ownerCompanyPercentages,
                              tResult('ownership-company-unresolved-suffix')
                            )
                          })}
                        </div>
                      )}
                      {update.ownedCompanyNames.length > 0 && (
                        <div className="gba:mt-1 gba:text-muted-foreground">
                          {tResult('ownership-summary-owns', {
                            names: formatOwnershipCompanyNames(
                              update.ownedCompanyNames,
                              update.ownedCompanyIds,
                              update.ownedCompanyPercentages,
                              tResult('ownership-company-unresolved-suffix')
                            )
                          })}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {ownershipExtractionWarnings.length > 0 && !importCompleted && (
            <Card data-testid={`${testId}-extraction-warnings`}>
              <CardHeader>
                <CardTitle className="gba:text-base">{tResult('extraction-warnings-title')}</CardTitle>
              </CardHeader>
              <CardContent className="gba:space-y-2">
                {ownershipExtractionWarnings.map(warning => (
                  <div key={`ownership-warning-${warning}`} className="gba:flex gba:items-start gba:gap-2 gba:text-sm">
                    <WarningIcon
                      className="gba:w-4 gba:h-4 gba:text-destructive gba:mt-0.5 gba:shrink-0"
                      weight="fill"
                    />
                    <span>{warning}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {importCompleted && ownershipImportResult && (
            <Card variant="surface" className="gba:border-primary">
              <CardContent className="gba:p-6 gba:space-y-4 gba:text-center">
                <CheckCircleIcon className="gba:w-12 gba:h-12 gba:text-primary gba:mx-auto" weight="fill" />
                <div>
                  <h3 className="gba:text-xl gba:font-semibold">{t('ownership-import-success-title')}</h3>
                  <p className="gba:text-sm gba:text-muted-foreground gba:mt-2">
                    {t('ownership-import-success-message', {
                      successCount:
                        ownershipImportResult.relationshipSuccessCount ?? ownershipImportResult.successCount,
                      errorCount: ownershipImportResult.relationshipErrorCount ?? ownershipImportResult.errorCount
                    })}
                  </p>
                </div>
                <Button onClick={onDone} className="gba:w-full" data-testid={`${testId}-done-button`}>
                  {t('ownership-done-button')}
                </Button>
              </CardContent>
            </Card>
          )}

          {!importCompleted && (
            <div className="gba:flex gba:flex-col gba:gap-3">
              <Button
                onClick={onImportOwnership}
                disabled={isLoading || ownershipUpdates.length === 0}
                className="gba:w-full"
                data-testid={`${testId}-import-button`}
              >
                {isLoading ? (
                  <>
                    <Spinner className="gba:w-4 gba:h-4 gba:mr-2" />
                    {t('ownership-importing-button')}
                  </>
                ) : (
                  <>
                    <UploadIcon className="gba:w-4 gba:h-4 gba:mr-2" />
                    {t('ownership-import-button')}
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                onClick={onSkip}
                disabled={isLoading}
                className="gba:w-full"
                data-testid={`${testId}-skip-button`}
              >
                {t('ownership-skip-button')}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default OwnershipAssociationStep
