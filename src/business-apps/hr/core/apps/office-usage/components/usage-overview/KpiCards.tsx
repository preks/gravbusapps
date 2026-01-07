import React from 'react'
import { Card } from '@newwork/nw-design-system'
import { TrendUp, Calendar, MapPin, Users } from '@phosphor-icons/react'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { KpiCardData } from '../../types'

interface KpiCardsProps {
  kpis: KpiCardData
  prefixDataTestId?: string
}

export const KpiCards: React.FC<KpiCardsProps> = ({ kpis, prefixDataTestId = 'kpi-cards' }) => {
  const cards = [
    {
      id: 'avg-occupancy',
      icon: <TrendUp className="gba:w-5 gba:h-5" />,
      label: getTranslationFromI18nKeyAndLabel('lowcoder:office_usage.kpi_avg_occupancy', 'Avg Occupancy'),
      value: `${kpis.averageOccupancy}%`,
      subtitle: getTranslationFromI18nKeyAndLabel(
        'lowcoder:office_usage.kpi_avg_occupancy_subtitle',
        'Average across selected locations'
      ),
      variant: 'default' as const
    },
    {
      id: 'peak-day',
      icon: <Calendar className="gba:w-5 gba:h-5" />,
      label: getTranslationFromI18nKeyAndLabel('lowcoder:office_usage.kpi_peak_day', 'Peak Day'),
      value: `${kpis.peakOccupancy}%`,
      subtitle: kpis.peakDate
        ? `${getTranslationFromI18nKeyAndLabel('lowcoder:office_usage.on', 'on')} ${kpis.peakDate}`
        : getTranslationFromI18nKeyAndLabel('lowcoder:office_usage.no_data', 'No data'),
      variant: 'secondary' as const
    },
    {
      id: 'most-used',
      icon: <MapPin className="gba:w-5 gba:h-5" />,
      label: getTranslationFromI18nKeyAndLabel('lowcoder:office_usage.kpi_most_used_location', 'Most Used Location'),
      value: kpis.mostUsedLocationName || getTranslationFromI18nKeyAndLabel('lowcoder:office_usage.none', 'None'),
      subtitle: kpis.mostUsedLocationOccupancy
        ? `${kpis.mostUsedLocationOccupancy}% ${getTranslationFromI18nKeyAndLabel('lowcoder:office_usage.avg', 'avg')}`
        : '',
      variant: 'default' as const
    },
    {
      id: 'total-office-days',
      icon: <Users className="gba:w-5 gba:h-5" />,
      label: getTranslationFromI18nKeyAndLabel('lowcoder:office_usage.kpi_total_office_days', 'Total Office Days'),
      value: kpis.totalOfficeDays.toString(),
      subtitle: getTranslationFromI18nKeyAndLabel(
        'lowcoder:office_usage.kpi_office_days_subtitle',
        'Logged in selected period'
      ),
      variant: 'default' as const
    }
  ]

  return (
    <div className="gba:grid gba:grid-cols-4 gba:gap-4 gba:mb-6" data-testid={prefixDataTestId}>
      {cards.map(card => (
        <Card key={card.id} className="gba:p-6" data-testid={`${prefixDataTestId}-${card.id}`}>
          <div className="gba:space-y-2">
            <div className="gba:text-sm gba:font-medium gba:text-muted-foreground">{card.label}</div>
            <div className="gba:text-3xl gba:font-bold gba:text-foreground">{card.value}</div>
            {card.subtitle && <p className="gba:text-xs gba:text-muted-foreground">{card.subtitle}</p>}
          </div>
        </Card>
      ))}
    </div>
  )
}
