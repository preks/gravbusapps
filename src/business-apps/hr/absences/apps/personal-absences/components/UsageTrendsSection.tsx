import React from 'react'
import dayjs from 'dayjs'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { filterAbsencesForEntitlements } from '../utils/absenceFilters'

interface UsageTrendsSectionProps {
  absences: any[]
}

const months = [
  getTranslationFromI18nKeyAndLabel('lowcoder:absence_hub.month_jan', 'Jan'),
  getTranslationFromI18nKeyAndLabel('lowcoder:absence_hub.month_feb', 'Feb'),
  getTranslationFromI18nKeyAndLabel('lowcoder:absence_hub.month_mar', 'Mar'),
  getTranslationFromI18nKeyAndLabel('lowcoder:absence_hub.month_apr', 'Apr'),
  getTranslationFromI18nKeyAndLabel('lowcoder:absence_hub.month_may', 'May'),
  getTranslationFromI18nKeyAndLabel('lowcoder:absence_hub.month_jun', 'Jun'),
  getTranslationFromI18nKeyAndLabel('lowcoder:absence_hub.month_jul', 'Jul'),
  getTranslationFromI18nKeyAndLabel('lowcoder:absence_hub.month_aug', 'Aug'),
  getTranslationFromI18nKeyAndLabel('lowcoder:absence_hub.month_sep', 'Sep'),
  getTranslationFromI18nKeyAndLabel('lowcoder:absence_hub.month_oct', 'Oct'),
  getTranslationFromI18nKeyAndLabel('lowcoder:absence_hub.month_nov', 'Nov'),
  getTranslationFromI18nKeyAndLabel('lowcoder:absence_hub.month_dec', 'Dec')
]
const days = [
  getTranslationFromI18nKeyAndLabel('lowcoder:absence_hub.day_mon', 'Mon'),
  getTranslationFromI18nKeyAndLabel('lowcoder:absence_hub.day_tue', 'Tue'),
  getTranslationFromI18nKeyAndLabel('lowcoder:absence_hub.day_wed', 'Wed'),
  getTranslationFromI18nKeyAndLabel('lowcoder:absence_hub.day_thu', 'Thu'),
  getTranslationFromI18nKeyAndLabel('lowcoder:absence_hub.day_fri', 'Fri'),
  getTranslationFromI18nKeyAndLabel('lowcoder:absence_hub.day_sat', 'Sat'),
  getTranslationFromI18nKeyAndLabel('lowcoder:absence_hub.day_sun', 'Sun')
]

function getMonthlyUsage(absences: any[], year: number) {
  const usage = Array(12).fill(0)
  absences.forEach(a => {
    if (!a.startDate) return
    const date = dayjs(a.startDate)
    if (date.year() === year) {
      usage[date.month()] += 1
    }
  })
  return usage
}

function getDayOfWeekUsage(absences: any[]) {
  const usage = Array(7).fill(0)
  absences.forEach(a => {
    if (!a.startDate) return
    const date = dayjs(a.startDate)
    usage[date.day() === 0 ? 6 : date.day() - 1] += 1
  })
  return usage
}

const UsageTrendsSection: React.FC<UsageTrendsSectionProps> = ({ absences }) => {
  const approvedAbsences = filterAbsencesForEntitlements(absences || [])
  const currentYear = dayjs().year()
  const monthlyUsage = getMonthlyUsage(approvedAbsences, currentYear)
  const dayOfWeekUsage = getDayOfWeekUsage(approvedAbsences)
  const maxDay = Math.max(...dayOfWeekUsage)
  const mostCommonIdx = dayOfWeekUsage.findIndex(v => v === maxDay)
  const total = dayOfWeekUsage.reduce((a, b) => a + b, 0)
  const mostCommonPct = total > 0 ? Math.round((maxDay / total) * 100) : 0

  return (
    <section
      className="gba:statisticsTrends"
      aria-label={getTranslationFromI18nKeyAndLabel(
        'lowcoder:absence_hub.usage_trends_patterns',
        'Usage Trends & Patterns'
      )}
      data-testid="usage-trends-section"
    >
      <h3 className="gba:statisticsSectionTitle" data-testid="usage-trends-section-title">
        {getTranslationFromI18nKeyAndLabel('lowcoder:absence_hub.usage_trends_patterns', 'Usage Trends & Patterns')}
      </h3>
      <div className="gba:statisticsSubTitle" data-testid="usage-trends-section-subtitle">
        {getTranslationFromI18nKeyAndLabel(
          'lowcoder:absence_hub.your_absence_patterns_over_time',
          'Your absence patterns over time'
        )}
      </div>
      <div className="gba:statisticsSubSection" data-testid="usage-trends-section-subsection">
        <div className="gba:statisticsSubSectionTitle" data-testid="usage-trends-section-subsection-title">
          {getTranslationFromI18nKeyAndLabel('lowcoder:absence_hub.monthly_usage', 'Monthly Usage', { currentYear })}
        </div>
        <div className="gba:statisticsMonthlyBarChart" data-testid="usage-trends-section-subsection-bar-chart">
          {monthlyUsage.map((val, i) => (
            <div className="gba:monthlyBarCol" key={months[i]}>
              <div
                className="gba:monthlyBarBg"
                style={{
                  height: 64,
                  display: 'flex',
                  alignItems: 'flex-end',
                  background: 'var(--nw-muted)',
                  borderRadius: 6,
                  width: '100%'
                }}
              >
                <div
                  style={{
                    width: '100%',
                    height: `${val > 0 ? val * 10 + 8 : 4}px`,
                    background: 'var(--nw-chart-4)',
                    borderRadius: 6,
                    transition: 'height 0.18s'
                  }}
                  aria-label={`month-bar-${months[i]}`}
                  data-testid={`month-bar-${months[i]}`}
                />
              </div>
              <div className="gba:monthlyBarMonth" data-testid="usage-trends-section-subsection-bar-chart-month">
                {months[i]}
              </div>
              <div className="gba:monthlyBarValue" data-testid={`month-value-${months[i]}`}>
                {val}
              </div>
            </div>
          ))}
        </div>
        <div
          className="gba:statisticsSubSectionTitle"
          data-testid="usage-trends-section-subsection-week-bar-chart-title"
        >
          Day of Week Preferences
        </div>
        <div className="gba:statisticsWeekBarChart" data-testid="usage-trends-section-subsection-week-bar-chart">
          {dayOfWeekUsage.map((val, i) => (
            <div
              className={`gba:weekBarCol${i === mostCommonIdx && val > 0 ? ' gba:weekBarCol--highlight' : ''}`}
              key={days[i]}
              aria-label={`weekday-bar-${days[i]}`}
              data-testid={`weekday-bar-${days[i]}`}
            >
              <div className="gba:weekBarBg">
                <div
                  className="gba:weekBarFg"
                  style={{
                    height: `${val > 0 ? val * 10 + 6 : 4}px`
                  }}
                />
              </div>
              <div className="gba:weekBarDay" data-testid="usage-trends-section-subsection-week-bar-chart-day">
                {days[i]}
              </div>
              <div className="gba:weekBarValue" data-testid="usage-trends-section-subsection-week-bar-chart-value">
                {val}{' '}
                {getTranslationFromI18nKeyAndLabel(
                  val === 1 ? 'lowcoder:absence_hub.day' : 'lowcoder:absence_hub.days',
                  val === 1 ? 'day' : 'days'
                )}
              </div>
            </div>
          ))}
        </div>
        <div className="gba:weekBarNote" data-testid="usage-trends-section-subsection-week-bar-chart-note">
          Most common:{' '}
          <span
            className="gba:font-semibold"
            data-testid="usage-trends-section-subsection-week-bar-chart-note-most-common"
          >
            {days[mostCommonIdx]}
          </span>{' '}
          ({mostCommonPct}% of all absences)
        </div>
      </div>
    </section>
  )
}

export default UsageTrendsSection
