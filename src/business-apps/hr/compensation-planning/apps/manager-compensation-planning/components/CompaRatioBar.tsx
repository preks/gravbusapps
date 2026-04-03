import React from 'react'
import { useTranslation } from '@newwork/nw-design-system'
import { formatNumberFunction } from '@/common/utils/windowUtils'
import translations from '../_i18n'

interface CompaRatioBarProps {
  compaRatio: number | null
  band: {
    minSalary: number
    maxSalary: number
  } | null
  currentSalary: number | null
  proposedSalary?: number | null
}

export const CompaRatioBar: React.FC<CompaRatioBarProps> = ({ compaRatio, band, currentSalary, proposedSalary }) => {
  const { t } = useTranslation(translations)

  if (band == null || currentSalary == null) {
    return <span className="gba:text-sm gba:text-muted-foreground">{t('compa-no-band')}</span>
  }

  const range = band.maxSalary - band.minSalary
  if (range <= 0) return null

  const currentPosition = Math.max(0, Math.min(100, ((currentSalary - band.minSalary) / range) * 100))
  const proposedPosition =
    proposedSalary == null ? null : Math.max(0, Math.min(100, ((proposedSalary - band.minSalary) / range) * 100))

  return (
    <div className="gba:w-full gba:min-w-32 gba:max-w-48">
      <div className="gba:relative gba:h-3 gba:bg-muted gba:rounded-full gba:overflow-visible">
        <div className="gba:absolute gba:top-0 gba:h-full gba:w-full gba:bg-primary/10 gba:rounded-full gba:left-0" />
        <div className="gba:absolute gba:top-0 gba:h-full gba:w-px gba:bg-border gba:left-1/2" />
        <div
          className="gba:absolute gba:top-1/2 gba:-translate-y-1/2 gba:w-3 gba:h-3 gba:rounded-full gba:bg-primary gba:border-2 gba:border-background gba:shadow-sm gba:z-10"
          style={{ left: `${currentPosition}%`, marginLeft: '-6px' }}
        />
        {proposedPosition != null && proposedPosition !== currentPosition && (
          <div
            className="gba:absolute gba:top-1/2 gba:-translate-y-1/2 gba:w-3 gba:h-3 gba:rounded-full gba:bg-success gba:border-2 gba:border-background gba:shadow-sm gba:z-20"
            style={{ left: `${proposedPosition}%`, marginLeft: '-6px' }}
          />
        )}
      </div>
      {compaRatio != null && (
        <div className="gba:text-sm gba:text-muted-foreground gba:mt-0.5 gba:text-center">
          {t('compa-ratio-label', { ratio: formatNumberFunction(String(compaRatio), '0.00[,]00') })}
        </div>
      )}
    </div>
  )
}
