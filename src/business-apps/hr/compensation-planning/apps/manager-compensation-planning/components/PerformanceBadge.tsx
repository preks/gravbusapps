import React from 'react'
import { Badge, useTranslation } from '@newwork/nw-design-system'
import { formatLocaleDecimal, formatLocaleInteger } from '../../../utils/budgetCalculations'
import translations from '../_i18n'

interface PerformanceBadgeProps {
  rating: string | null
  numericRating: number | null
}

function getBadgeVariant(numeric: number | null): 'success' | 'destructive' | 'warning' | 'secondary' | 'outline' {
  if (numeric == null) return 'secondary'
  if (numeric >= 4) return 'success'
  if (numeric >= 3) return 'outline'
  if (numeric >= 2) return 'warning'
  return 'destructive'
}

export const PerformanceBadge: React.FC<PerformanceBadgeProps> = ({ rating, numericRating }) => {
  const { t } = useTranslation(translations)

  if (!rating) {
    return <span className="gba:text-xs gba:text-muted-foreground">{t('performance-no-evaluation')}</span>
  }

  const ratingNumLabel =
    numericRating != null
      ? Number.isInteger(numericRating)
        ? formatLocaleInteger(numericRating)
        : formatLocaleDecimal(numericRating, 0, 2)
      : ''

  return (
    <Badge variant={getBadgeVariant(numericRating)}>
      {numericRating != null && `${ratingNumLabel} · `}
      {rating}
    </Badge>
  )
}
