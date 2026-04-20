import React from 'react'
import { Button, Spinner, useTranslation } from '@newwork/nw-design-system'
import { InfoIcon, CheckCircleIcon } from '@phosphor-icons/react'
import { CsvQuality } from '@/common/components/common-relations/apps/data-import/types'
import translations from './ConversionResultStep/_i18n'

export interface CsvQualityBannerProps {
  csvQuality: CsvQuality
  isRepairing: boolean
  repairAttempted: boolean
  onRepair: () => void
  'data-testid'?: string
}

export const CsvQualityBanner: React.FC<CsvQualityBannerProps> = ({
  csvQuality,
  isRepairing,
  repairAttempted,
  onRepair,
  'data-testid': testId = 'csv-quality-banner'
}) => {
  const { t } = useTranslation(translations)

  if (!repairAttempted && csvQuality.repairAvailable) {
    return (
      <div className="gba:bg-info-secondary gba:border gba:border-info gba:rounded-lg gba:p-4" data-testid={testId}>
        <div className="gba:flex gba:items-start gba:gap-3">
          <InfoIcon className="gba:w-5 gba:h-5 gba:text-info gba:mt-0.5 gba:flex-shrink-0" weight="fill" />
          <div className="gba:flex-1 gba:space-y-2">
            <p className="gba:font-semibold gba:text-sm gba:text-info">{t('csv-quality-warning-title')}</p>
            <p className="gba:text-sm gba:text-muted-foreground">
              {t('csv-quality-warning-message', {
                shiftedRows: csvQuality.shiftedRows,
                totalRows: csvQuality.totalRows
              })}
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={onRepair}
              disabled={isRepairing}
              data-testid={`${testId}-repair-button`}
            >
              {isRepairing ? (
                <>
                  <Spinner className="gba:w-4 gba:h-4 gba:mr-2" />
                  {t('csv-quality-repairing-button')}
                </>
              ) : (
                t('csv-quality-repair-button')
              )}
            </Button>
          </div>
        </div>
      </div>
    )
  }

  if (repairAttempted && csvQuality.repairAvailable) {
    return (
      <div className="gba:bg-muted gba:border gba:border-border gba:rounded-lg gba:p-4" data-testid={testId}>
        <div className="gba:flex gba:items-start gba:gap-3">
          <InfoIcon className="gba:w-5 gba:h-5 gba:text-muted-foreground gba:mt-0.5 gba:flex-shrink-0" weight="fill" />
          <p className="gba:text-sm gba:text-muted-foreground">
            {t('csv-quality-residual-message', { shiftedRows: csvQuality.shiftedRows })}
          </p>
        </div>
      </div>
    )
  }

  if (repairAttempted && !csvQuality.repairAvailable) {
    return (
      <div className="gba:flex gba:items-center gba:gap-2 gba:text-sm gba:text-success" data-testid={testId}>
        <CheckCircleIcon className="gba:w-5 gba:h-5 gba:text-success" weight="fill" />
        {t('csv-quality-success-message')}
      </div>
    )
  }

  return null
}
