import React from 'react'
import { useTranslation } from '@newwork/nw-design-system'
import { formatCurrency } from '@/common/utils/numberFormatter'
import translations from '../_i18n'

interface CompaRatioBarProps {
  band: {
    minSalary: number
    maxSalary: number
  } | null
  currentSalary: number | null
  currencyCode: string
  proposedSalary?: number | null
  align?: 'center' | 'start'
  fullWidth?: boolean
}

function getCurrentSalaryMarkerClass(currentSalary: number, band: NonNullable<CompaRatioBarProps['band']>): string {
  if (currentSalary < band.minSalary || currentSalary > band.maxSalary) {
    return 'gba:bg-destructive gba:text-destructive-foreground'
  }

  return 'gba:bg-foreground gba:text-background'
}

export const CompaRatioBar: React.FC<CompaRatioBarProps> = ({
  band,
  currentSalary,
  currencyCode,
  proposedSalary,
  align = 'center',
  fullWidth = false
}) => {
  const { t } = useTranslation(translations)
  const noBandFallback = (
    <span className="gba:block gba:text-center gba:text-sm gba:text-muted-foreground">{t('compa-no-band')}</span>
  )

  if (band == null || currentSalary == null) {
    return noBandFallback
  }

  const range = band.maxSalary - band.minSalary
  if (range <= 0) return noBandFallback

  const currentPosition = Math.max(0, Math.min(100, ((currentSalary - band.minSalary) / range) * 100))
  const proposedPosition =
    proposedSalary == null ? null : Math.max(0, Math.min(100, ((proposedSalary - band.minSalary) / range) * 100))
  const currentSalaryMarkerClass = getCurrentSalaryMarkerClass(currentSalary, band)
  const alignmentClass = align === 'start' ? 'gba:mr-auto' : 'gba:mx-auto'
  const widthClass = fullWidth ? 'gba:max-w-none' : 'gba:max-w-48'

  return (
    <div className={`gba:w-full gba:min-w-32 gba:pt-6 ${alignmentClass} ${widthClass}`}>
      <div className="gba:relative gba:flex gba:h-3 gba:overflow-visible gba:rounded-full gba:bg-muted">
        <div className="gba:h-full gba:w-1/3 gba:rounded-l-full gba:bg-red-200" />
        <div className="gba:h-full gba:w-1/3 gba:bg-yellow-100" />
        <div className="gba:h-full gba:w-1/3 gba:rounded-r-full gba:bg-green-100" />
        <div className="gba:absolute gba:top-0 gba:h-full gba:w-px gba:bg-border gba:left-1/2" />
        <div
          className="gba:absolute gba:top-1/2 gba:z-10 gba:flex gba:-translate-x-1/2 gba:-translate-y-1/2 gba:flex-col gba:items-center"
          style={{ left: `${currentPosition}%` }}
        >
          <span
            className={`gba:absolute gba:bottom-5 gba:whitespace-nowrap gba:rounded gba:px-1.5 gba:py-0.5 gba:text-xs gba:font-medium gba:tabular-nums gba:shadow-sm ${currentSalaryMarkerClass}`}
          >
            {formatCurrency(currentSalary, currencyCode)}
          </span>
          <span
            className={`gba:absolute gba:bottom-2 gba:h-3 gba:w-0.5 gba:rounded-full gba:shadow-sm ${currentSalaryMarkerClass}`}
          />
          <span
            className={`gba:h-2.5 gba:w-2.5 gba:rounded-full gba:border-2 gba:border-background gba:shadow-sm ${currentSalaryMarkerClass}`}
          />
        </div>
        {proposedPosition != null && proposedPosition !== currentPosition && (
          <div
            className="gba:absolute gba:-top-2 gba:z-20 gba:flex gba:-translate-x-1/2 gba:flex-col gba:items-center"
            style={{ left: `${proposedPosition}%` }}
          >
            <span className="gba:h-2 gba:w-0.5 gba:rounded-full gba:bg-success gba:shadow-sm" />
            <span className="gba:h-2.5 gba:w-2.5 gba:rounded-full gba:border-2 gba:border-background gba:bg-success gba:shadow-sm" />
          </div>
        )}
      </div>
      <div className="gba:mt-1 gba:flex gba:items-center gba:justify-between gba:gap-2 gba:text-xs gba:tabular-nums gba:text-muted-foreground">
        <span>{formatCurrency(band.minSalary, currencyCode)}</span>
        <span>{formatCurrency(band.maxSalary, currencyCode)}</span>
      </div>
    </div>
  )
}
