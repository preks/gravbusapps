import React from 'react'
import dayjs from 'dayjs'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { filterAbsencesForEntitlements } from '../utils/absenceFilters'

interface YearComparisonSectionProps {
  absences: any[]
}

function getLastNYears(n: number) {
  const currentYear = dayjs().year()
  return Array.from({ length: n }, (_, i) => currentYear - i)
}

function getYearLabel(year: number, currentYear: number) {
  return year === currentYear ? `${year} (Current)` : `${year}`
}

const YearComparisonSection: React.FC<YearComparisonSectionProps> = ({ absences }) => {
  const approvedAbsences = filterAbsencesForEntitlements(absences || [])
  const years = getLastNYears(3)
  const currentYear = years[0]
  const yearData = years.map((year, idx) => {
    const value = approvedAbsences.filter(a => dayjs(a.startDate).year() === year).length
    return {
      year,
      label: getYearLabel(year, currentYear),
      value,
      color: idx === 0 ? 'var(--nw-chart-4)' : 'var(--nw-muted-foreground)'
    }
  })

  const leaveTypeData = years.map(year => {
    const yearAbsences = approvedAbsences.filter(a => dayjs(a.startDate).year() === year)
    const total = yearAbsences.length
    const typeMap: Record<string, { label: string; value: number; color: string }> = {}
    yearAbsences.forEach(a => {
      const label = a.type || 'Other'
      const key = (label || 'other').toLowerCase()
      const color = `#${a.typeColor}`
      if (!typeMap[key]) {
        typeMap[key] = { label, value: 0, color }
      }
      typeMap[key].value += 1
    })
    const types = Object.values(typeMap).sort((a, b) => b.value - a.value)
    return {
      year,
      total,
      types
    }
  })

  const prev = yearData[1]?.value || 0
  const curr = yearData[0]?.value || 0
  let improvementMsg = ''
  let improvementIcon = ''
  if (prev === 0 && curr === 0) {
    improvementMsg = getTranslationFromI18nKeyAndLabel(
      'lowcoder:absence_hub.no_change_last_year',
      'No change from last year'
    )
    improvementIcon = ''
  } else if (prev === 0 && curr > 0) {
    improvementMsg = getTranslationFromI18nKeyAndLabel(
      'lowcoder:absence_hub.new_absences_this_year',
      'New absences this year'
    )
    improvementIcon = '↑'
  } else if (prev > 0 && curr === 0) {
    improvementMsg = getTranslationFromI18nKeyAndLabel(
      'lowcoder:absence_hub.all_absences_cleared_last_year',
      'All absences cleared from last year'
    )
    improvementIcon = '↓'
  } else {
    const diffPct = Math.round(((curr - prev) / prev) * 100)
    improvementMsg =
      diffPct < 0
        ? getTranslationFromI18nKeyAndLabel(
            'lowcoder:absence_hub.decrease_from_last_year',
            '{{pct}}% decrease from last year – Good work-life balance improvement',
            { pct: Math.abs(diffPct) }
          )
        : diffPct > 0
          ? getTranslationFromI18nKeyAndLabel(
              'lowcoder:absence_hub.increase_from_last_year',
              '{{pct}}% increase from last year – More absences taken',
              { pct: diffPct }
            )
          : getTranslationFromI18nKeyAndLabel('lowcoder:absence_hub.no_change_last_year', 'No change from last year')
    improvementIcon = diffPct < 0 ? '↓' : diffPct > 0 ? '↑' : ''
  }

  return (
    <div data-testid="year-comparison-section">
      <h3 className="gba:statisticsSectionTitle" data-testid="year-comparison-section-title">
        {getTranslationFromI18nKeyAndLabel(
          'lowcoder:absence_hub.year_over_year_comparison',
          'Year-over-Year Comparison'
        )}
      </h3>
      <div className="gba:statisticsSubTitle" data-testid="year-comparison-section-subtitle">
        {getTranslationFromI18nKeyAndLabel(
          'lowcoder:absence_hub.absence_patterns_changed',
          'How your absence patterns have changed over time'
        )}
      </div>
      <div className="gba:yearComparisonRows">
        {yearData.map((row: { year: number; label: string; value: number; color: string }) => (
          <div className="gba:yearComparisonRow gba:flex gba:items-center" key={row.year}>
            <span className="gba:yearComparisonLabel gba:flex-1 gba:text-left">{row.label}</span>
            <div className="gba:flex gba:items-center gba:gap-3">
              <div className="gba:yearComparisonBarBg">
                <div
                  className="gba:yearComparisonBarFg"
                  style={{ width: `${row.value * 6}px`, background: row.color }}
                />
              </div>
              <span className="gba:yearComparisonValue">
                {row.value}{' '}
                {getTranslationFromI18nKeyAndLabel(
                  row.value === 1 ? 'lowcoder:absence_hub.day' : 'lowcoder:absence_hub.days',
                  row.value === 1 ? 'day' : 'days'
                )}
              </span>
            </div>
          </div>
        ))}
      </div>
      <div className="gba:yearComparisonImprovement" data-testid="year-comparison-section-improvement">
        <span className="gba:improvementIcon">{improvementIcon}</span> {improvementMsg}
      </div>
      <div className="gba:leaveTypeTitle" data-testid="year-comparison-section-leave-type-title">
        {getTranslationFromI18nKeyAndLabel('lowcoder:absence_hub.leave_type_title', `Leave Type Distribution by Year`)}
      </div>
      <div className="gba:leaveTypeRows" data-testid="year-comparison-section-leave-type-rows">
        {leaveTypeData.map(
          (row: { year: number; total: number; types: { label: string; value: number; color: string }[] }) => (
            <div className="gba:leaveTypeRow" key={row.year}>
              <div className="gba:leaveTypeYear" data-testid="year-comparison-section-leave-type-year">
                {row.year}
                <span style={{}}>
                  {row.total}{' '}
                  {getTranslationFromI18nKeyAndLabel('lowcoder:absence_management_hub_backoffice.days', 'days')} total
                </span>
              </div>
              <div className="gba:leaveTypeBarBg" data-testid="year-comparison-section-leave-type-bar-bg">
                {row.types.map((type: { label: string; value: number; color: string }, idx: number) => (
                  <div
                    key={type.label}
                    className="gba:leaveTypeBarFg"
                    style={{
                      width: `${row.total > 0 ? (type.value / row.total) * 100 : 0}%`,
                      background: type.color,
                      borderTopLeftRadius: idx === 0 ? 14 : 0,
                      borderBottomLeftRadius: idx === 0 ? 14 : 0,
                      borderTopRightRadius: idx === row.types.length - 1 ? 14 : 0,
                      borderBottomRightRadius: idx === row.types.length - 1 ? 14 : 0
                    }}
                  />
                ))}
              </div>
              <div className="gba:leaveTypeLegendTypes" data-testid="year-comparison-section-leave-type-legend-types">
                {row.types.map((type: { label: string; value: number; color: string }) => (
                  <span
                    key={type.label}
                    className="gba:text-muted-foreground gba:font-medium gba:text-xs gba:text-center gba:whitespace-nowrap"
                    data-testid="year-comparison-section-leave-type-legend-type"
                  >
                    {type.label}: {type.value}d
                  </span>
                ))}
              </div>
            </div>
          )
        )}
      </div>
    </div>
  )
}

export default YearComparisonSection
