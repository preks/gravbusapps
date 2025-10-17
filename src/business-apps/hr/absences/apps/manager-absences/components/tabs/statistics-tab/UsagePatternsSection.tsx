import React from 'react'
import dayjs from 'dayjs'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { Card } from '@newwork/nw-design-system'

interface UsagePatternsSectionProps {
  data: any
}

const days = [
  getTranslationFromI18nKeyAndLabel('lowcoder:absence_hub.day_mon', 'Mon'),
  getTranslationFromI18nKeyAndLabel('lowcoder:absence_hub.day_tue', 'Tue'),
  getTranslationFromI18nKeyAndLabel('lowcoder:absence_hub.day_wed', 'Wed'),
  getTranslationFromI18nKeyAndLabel('lowcoder:absence_hub.day_thu', 'Thu'),
  getTranslationFromI18nKeyAndLabel('lowcoder:absence_hub.day_fri', 'Fri'),
  getTranslationFromI18nKeyAndLabel('lowcoder:absence_hub.day_sat', 'Sat'),
  getTranslationFromI18nKeyAndLabel('lowcoder:absence_hub.day_sun', 'Sun')
]

function getDayOfWeekUsage(absences: any[]) {
  const usage = Array(7).fill(0)
  absences.forEach(a => {
    if (!a.startDate) return

    const startDate = dayjs(a.startDate)
    const endDate = a.endDate ? dayjs(a.endDate) : startDate
    const currentYear = dayjs().year()

    // For absences that start in current year, use start date
    if (startDate.year() === currentYear) {
      usage[startDate.day() === 0 ? 6 : startDate.day() - 1] += 1
    }
    // For ongoing absences that start before current year but end in current year,
    // use end date (when they're active in current year)
    else if (startDate.year() < currentYear && endDate.year() === currentYear) {
      usage[endDate.day() === 0 ? 6 : endDate.day() - 1] += 1
    }
  })
  return usage
}

export const UsagePatternsSection: React.FC<UsagePatternsSectionProps> = ({ data }) => {
  const absences = data?.absences || []
  const currentYear = dayjs().year()

  // Filter absences for current year, approved status, and valid absence groups only
  const currentYearAbsences = absences.filter((a: any) => {
    // Must have start date
    if (!a.startDate) return false

    // Must be approved
    if ((a.status || '').toLowerCase() !== 'approved') return false

    // Must belong to a valid absence group (have parentEntryId)
    if (!a.type?.parentEntryId) return false

    // Must be active in current year (either start in current year OR ongoing from previous year)
    const startDate = dayjs(a.startDate)
    const endDate = a.endDate ? dayjs(a.endDate) : startDate

    // Include if:
    // 1. Starts in current year, OR
    // 2. Starts before current year but ends in current year (ongoing absences)
    const isActiveInCurrentYear =
      startDate.year() === currentYear || (startDate.year() < currentYear && endDate.year() === currentYear)

    if (!isActiveInCurrentYear) return false

    return true
  })

  const dayOfWeekUsage = getDayOfWeekUsage(currentYearAbsences)
  const maxDay = Math.max(...dayOfWeekUsage)
  const total = dayOfWeekUsage.reduce((a, b) => a + b, 0)

  // Find all days that have the maximum value (handle ties)
  const mostCommonDays = dayOfWeekUsage
    .map((val, index) => ({ val, index }))
    .filter(item => item.val === maxDay)
    .map(item => days[item.index])

  const mostCommonPct = total > 0 ? Math.round((maxDay / total) * 100) : 0
  const mostCommonText = mostCommonDays.length > 1 ? mostCommonDays.join(', ') : mostCommonDays[0] || 'None'

  return (
    <section className="gba:mb-6" data-testid="usage-patterns-section">
      <h3 className="gba:text-lg gba:font-bold gba:mb-4" data-testid="usage-patterns-section-title">
        {getTranslationFromI18nKeyAndLabel('lowcoder:absence_management_hub_manager.usage_patterns', 'Usage Patterns')}
      </h3>
      <Card className="gba:hover:shadow-md gba:transition-shadow gba:w-full gba:h-[510px]">
        <div className="gba:flex gba:flex-row gba:items-center gba:justify-between gba:pb-1 gba:p-6">
          <div>
            <h5 className="gba:text-sm gba:font-medium">
              {getTranslationFromI18nKeyAndLabel(
                'lowcoder:absence_management_hub_manager.day_of_week_preferences',
                'Day of Week Preferences'
              )}
            </h5>
            <p className="gba:text-xs gba:text-muted-foreground">
              {getTranslationFromI18nKeyAndLabel('lowcoder:absence_management_hub_manager.most_common', 'Most common')}:{' '}
              {mostCommonText}
            </p>
            <div className="gba:text-2xl gba:font-bold gba:pt-2 gba:text-left">{mostCommonPct}%</div>
            <div className="gba:text-xs gba:text-muted-foreground gba:text-left gba:pb-3">
              {getTranslationFromI18nKeyAndLabel(
                'lowcoder:absence_management_hub_manager.most_common_day',
                'Most Common Day'
              )}
            </div>
          </div>
        </div>
        <div className="gba:h-[415px] gba:w-full gba:px-6 gba:pb-6">
          <div
            className="gba:flex gba:items-end gba:gap-4 gba:h-full"
            data-testid="usage-patterns-section-subsection-week-bar-chart"
          >
            {dayOfWeekUsage.map((val, i) => (
              <div
                className="gba:flex gba:flex-col gba:items-center gba:flex-1 gba:relative gba:w-full"
                key={days[i]}
                aria-label={`weekday-bar-${days[i]}`}
                data-testid={`weekday-bar-${days[i]}`}
              >
                <div className="gba:w-full gba:bg-muted gba:rounded-lg gba:relative gba:overflow-hidden gba:mb-2 gba:flex gba:items-end gba:flex-1">
                  <div
                    className="gba:bg-success gba:rounded-md gba:transition-all gba:duration-300 gba:w-full"
                    style={{
                      height: `${val > 0 ? val * 8 + 6 : 4}px`
                    }}
                  />
                </div>
                <div
                  className="gba:text-sm gba:text-muted-foreground gba:mt-1"
                  data-testid="usage-patterns-section-subsection-week-bar-chart-day"
                >
                  {days[i]}
                </div>
                <div
                  className="gba:text-base gba:font-semibold gba:text-foreground gba:mt-1"
                  data-testid="usage-patterns-section-subsection-week-bar-chart-value"
                >
                  {val}
                </div>
              </div>
            ))}
          </div>
          <div className="gba:text-xs gba:text-muted-foreground gba:mt-4 gba:text-center">
            {getTranslationFromI18nKeyAndLabel('lowcoder:absence_management_hub_manager.most_common', 'Most common')}:{' '}
            <span className="gba:font-semibold">{mostCommonText}</span> ({mostCommonPct}%{' '}
            {getTranslationFromI18nKeyAndLabel(
              'lowcoder:absence_management_hub_manager.of_all_absences',
              'of all absences'
            )}
            )
          </div>
        </div>
      </Card>
    </section>
  )
}
