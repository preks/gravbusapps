import React, { useMemo } from 'react'
import dayjs from 'dayjs'
import { Card, CardHeader, CardTitle, CardContent, Progress } from '@newwork/nw-design-system'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'

interface OrgWorkPatternsPanelProps {
  absences: any[]
  accessToken?: string
}

const getMonthLabel = (index: number): string => {
  const monthKeys = [
    'lowcoder:absence_hub.month_jan',
    'lowcoder:absence_hub.month_feb',
    'lowcoder:absence_hub.month_mar',
    'lowcoder:absence_hub.month_apr',
    'lowcoder:absence_hub.month_may',
    'lowcoder:absence_hub.month_jun',
    'lowcoder:absence_hub.month_jul',
    'lowcoder:absence_hub.month_aug',
    'lowcoder:absence_hub.month_sep',
    'lowcoder:absence_hub.month_oct',
    'lowcoder:absence_hub.month_nov',
    'lowcoder:absence_hub.month_dec'
  ]
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  return getTranslationFromI18nKeyAndLabel(monthKeys[index], monthNames[index])
}

const getDayLabel = (index: number): string => {
  const dayKeys = [
    'lowcoder:absence_hub.day_mon',
    'lowcoder:absence_hub.day_tue',
    'lowcoder:absence_hub.day_wed',
    'lowcoder:absence_hub.day_thu',
    'lowcoder:absence_hub.day_fri',
    'lowcoder:absence_hub.day_sat',
    'lowcoder:absence_hub.day_sun'
  ]
  const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
  return getTranslationFromI18nKeyAndLabel(dayKeys[index], dayNames[index])
}

export const OrgWorkPatternsPanel: React.FC<OrgWorkPatternsPanelProps> = ({ absences }) => {
  const currentYear = dayjs().year()

  const { dayCounts, dayPercents, monthlyCounts, monthlyPercents, peakMonth, lowMonth } = useMemo(() => {
    const approved = (absences || []).filter((a: any) => String(a.status || '').toUpperCase() === 'APPROVED')

    const dayCounts = new Array(7).fill(0)
    const monthCounts = new Array(12).fill(0)

    approved.forEach((a: any) => {
      if (a.startDate) {
        const d = dayjs(a.startDate)
        // Day-of-week (Mon=0..Sun=6)
        const idx = d.day() === 0 ? 6 : d.day() - 1
        dayCounts[idx] += 1
        // Monthly (current year only)
        if (d.year() === currentYear) {
          monthCounts[d.month()] += 1
        }
      }
    })

    const dayTotal = dayCounts.reduce((s: number, c: number) => s + c, 0) || 1
    // For backoffice visuals, keep monthly patterns request-based (approved) for stronger contrast and to match the status note.
    const baseMonthCounts = monthCounts
    const monthlyTotal = baseMonthCounts.reduce((s: number, c: number) => s + c, 0) || 1

    const dayPercents = dayCounts.map((c: number) => Math.round((c / dayTotal) * 100))
    const monthlyPercents = baseMonthCounts.map((c: number) => Math.round((c / monthlyTotal) * 100))

    // Compute peaks consistently from the same monthly source used for rendering
    const peakIdx = baseMonthCounts.indexOf(Math.max(...baseMonthCounts))
    const lowIdx = baseMonthCounts.indexOf(Math.min(...baseMonthCounts))

    return {
      dayCounts,
      dayPercents,
      monthlyCounts: baseMonthCounts,
      monthlyPercents,
      peakMonth: { label: getMonthLabel(peakIdx), percent: monthlyPercents[peakIdx] },
      lowMonth: { label: getMonthLabel(lowIdx), percent: monthlyPercents[lowIdx] }
    }
  }, [absences, currentYear])

  const renderBar = (value: number, percent: number) => (
    <div className="gba:flex gba:items-center gba:gap-3 gba:w-full">
      <Progress value={Math.min(100, percent)} className="gba:h-2.5 gba:flex-1" />
      <div className="gba:w-10 gba:text-right gba:text-sm">{value}</div>
      <div className="gba:w-10 gba:text-right gba:text-sm">{percent}%</div>
    </div>
  )

  return (
    <Card>
      <CardHeader className="gba:pb-2">
        <CardTitle className="gba:text-base">
          {getTranslationFromI18nKeyAndLabel('lowcoder:absence_hub.work_patterns', 'Work Patterns')}
        </CardTitle>
      </CardHeader>
      <CardContent className="gba:pt-0">
        <div className="gba:grid gba:grid-cols-1 gba:md:grid-cols-2 gba:gap-6">
          {/* Day of Week Preferences */}
          <div>
            <div className="gba:text-sm gba:font-medium gba:mb-2">
              {getTranslationFromI18nKeyAndLabel(
                'lowcoder:absence_management_hub_manager.day_of_week_preferences',
                'Day of Week Preferences'
              )}
            </div>
            <div className="gba:space-y-2.5">
              {Array.from({ length: 7 }, (_, i) => (
                <div key={i} className="gba:flex gba:items-center gba:gap-3" data-testid={`work-patterns-dow-${i}`}>
                  <div
                    className="gba:w-10 gba:text-sm gba:text-foreground"
                    data-testid={`work-patterns-dow-label-${i}`}
                  >
                    {getDayLabel(i)}
                  </div>
                  {renderBar(dayCounts[i], dayPercents[i])}
                </div>
              ))}
            </div>
            <div className="gba:text-xs gba:text-muted-foreground gba:mt-2">{`${getTranslationFromI18nKeyAndLabel(
              'lowcoder:absence_management_hub_manager.most_common',
              'Most common'
            )}: ${getDayLabel(dayPercents.indexOf(Math.max(...dayPercents)))} (${Math.max(...dayPercents)}% ${getTranslationFromI18nKeyAndLabel(
              'lowcoder:absence_hub.work_patterns_of_all_absences',
              'of all absences'
            )})`}</div>
          </div>

          {/* Monthly Absence Patterns */}
          <div>
            <div className="gba:text-sm gba:font-medium gba:mb-2">
              {getTranslationFromI18nKeyAndLabel(
                'lowcoder:absence_hub.work_patterns_monthly',
                'Monthly Absence Patterns'
              )}
            </div>
            <div className="gba:space-y-2.5">
              {Array.from({ length: 12 }, (_, i) => (
                <div key={i} className="gba:flex gba:items-center gba:gap-3" data-testid={`work-patterns-month-${i}`}>
                  <div
                    className="gba:w-10 gba:text-sm gba:text-foreground"
                    data-testid={`work-patterns-month-label-${i}`}
                  >
                    {getMonthLabel(i)}
                  </div>
                  {renderBar(monthlyCounts[i], monthlyPercents[i])}
                </div>
              ))}
            </div>
            <div className="gba:text-xs gba:text-muted-foreground gba:mt-2">{`${getTranslationFromI18nKeyAndLabel(
              'lowcoder:absence_hub.work_patterns_peak_season',
              'Peak season'
            )}: ${peakMonth.label} (${peakMonth.percent}% ${getTranslationFromI18nKeyAndLabel(
              'lowcoder:absence_hub.work_patterns_of_all_absences',
              'of all absences'
            )}) · ${getTranslationFromI18nKeyAndLabel(
              'lowcoder:absence_hub.work_patterns_lowest',
              'Lowest'
            )}: ${lowMonth.label} (${lowMonth.percent}% ${getTranslationFromI18nKeyAndLabel(
              'lowcoder:absence_hub.work_patterns_of_all_absences',
              'of all absences'
            )})`}</div>
          </div>
        </div>
        <div
          className="gba:mt-4 gba:text-xs gba:bg-info-secondary gba:border gba:border-info gba:rounded gba:p-3"
          data-testid="work-patterns-seasonal-insight"
        >
          {`${getTranslationFromI18nKeyAndLabel(
            'lowcoder:absence_hub.work_patterns_seasonal_insight',
            'Seasonal Insight'
          )}: ${getTranslationFromI18nKeyAndLabel(
            'lowcoder:absence_hub.work_patterns_peak_month',
            'Peak month'
          )} ${peakMonth.label} (${peakMonth.percent}% ${getTranslationFromI18nKeyAndLabel(
            'lowcoder:absence_hub.work_patterns_of_all_absences',
            'of all absences'
          )}) · ${getTranslationFromI18nKeyAndLabel(
            'lowcoder:absence_hub.work_patterns_lowest',
            'Lowest'
          )} ${lowMonth.label} (${lowMonth.percent}% ${getTranslationFromI18nKeyAndLabel(
            'lowcoder:absence_hub.work_patterns_of_all_absences',
            'of all absences'
          )}). ${getTranslationFromI18nKeyAndLabel(
            'lowcoder:absence_hub.work_patterns_staffing_recommendation',
            'Consider staffing adjustments during peak periods.'
          )}`}
        </div>
        <div className="gba:mt-2 gba:text-xs gba:text-muted-foreground" data-testid="work-patterns-status-note">
          {getTranslationFromI18nKeyAndLabel(
            'lowcoder:absence_hub.statuses_considered_approved_counts',
            'Statuses considered: Approved; values represent request counts.'
          )}
        </div>
      </CardContent>
    </Card>
  )
}

export default OrgWorkPatternsPanel
