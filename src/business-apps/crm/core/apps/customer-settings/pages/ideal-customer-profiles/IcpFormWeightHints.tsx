import React from 'react'
import { Alert, AlertDescription, AlertTitle, useTranslation } from '@newwork/nw-design-system'
import customerSettingsI18n from '../../_i18n'

export interface IcpFormWeightHintsProps {
  overLimit: boolean
  sumPct: number
  dataTestIdPrefix: string
}

export const IcpFormWeightHints: React.FC<IcpFormWeightHintsProps> = ({ overLimit, sumPct, dataTestIdPrefix }) => {
  const { t } = useTranslation(customerSettingsI18n)

  const weightHint =
    !overLimit && sumPct > 0 && sumPct !== 100 ? (
      <p className="gba:text-sm gba:text-muted-foreground" data-testid={`${dataTestIdPrefix}-weight-sum-hint`}>
        {t('icp-weights-sum-hint-prefix')}{' '}
        <span className="gba:font-medium gba:text-foreground gba:tabular-nums">{sumPct}%</span>
        {t('icp-weights-sum-hint-suffix')}
      </p>
    ) : null

  return (
    <>
      {overLimit && (
        <Alert
          variant="destructive"
          className="gba:w-full gba:items-start gba:gap-3 gba:p-4"
          data-testid={`${dataTestIdPrefix}-weights-over-limit`}
        >
          <AlertTitle className="gba:mb-0 gba:leading-snug">{t('icp-weights-exceed-title')}</AlertTitle>
          <AlertDescription className="gba:min-w-0 gba:w-full gba:text-sm gba:leading-relaxed gba:text-foreground">
            {t('icp-weights-exceed-prefix')} <span className="gba:font-semibold gba:tabular-nums">{sumPct}%</span>{' '}
            {t('icp-weights-exceed-suffix')}
          </AlertDescription>
        </Alert>
      )}
      {weightHint}
    </>
  )
}
