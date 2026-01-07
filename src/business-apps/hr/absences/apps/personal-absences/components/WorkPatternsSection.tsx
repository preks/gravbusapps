import dayjs from 'dayjs'
import { AlertTriangle, CheckCircle } from 'lucide-react'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { filterAbsencesForEntitlements } from '../utils/absenceFilters'

interface WorkPatternsSectionProps {
  absences: any[]
}

const WorkPatternsSection: React.FC<WorkPatternsSectionProps> = ({ absences }) => {
  const filteredAbsences = filterAbsencesForEntitlements(absences || [])
  const sortedAbsences = [...filteredAbsences].sort((a, b) => dayjs(a.startDate).diff(dayjs(b.startDate)))

  const workPeriods: { start: dayjs.Dayjs; end: dayjs.Dayjs; days: number }[] = []
  let prevEnd = sortedAbsences.length > 0 ? dayjs(sortedAbsences[0].startDate).subtract(1, 'day') : null
  for (let i = 0; i < sortedAbsences.length; i++) {
    const currStart = dayjs(sortedAbsences[i].startDate)
    if (prevEnd && currStart.diff(prevEnd, 'day') > 1) {
      workPeriods.push({
        start: prevEnd.add(1, 'day'),
        end: currStart.subtract(1, 'day'),
        days: currStart.diff(prevEnd, 'day') - 1
      })
    }
    prevEnd = dayjs(sortedAbsences[i].endDate)
  }
  if (prevEnd) {
    const today = dayjs()
    if (today.diff(prevEnd, 'day') > 0) {
      workPeriods.push({
        start: prevEnd.add(1, 'day'),
        end: today,
        days: today.diff(prevEnd, 'day')
      })
    }
  } else if (absences.length === 0) {
    workPeriods.push({
      start: dayjs().subtract(365, 'day'),
      end: dayjs(),
      days: 365
    })
  }

  const currentStreak = workPeriods.length > 0 ? workPeriods[workPeriods.length - 1].days : 0

  const thisYear = dayjs().year()
  const longestStreakPeriod = workPeriods
    .filter(wp => wp.end.year() === thisYear)
    .reduce((max, wp) => (wp.days > (max?.days || 0) ? wp : max), null as null | (typeof workPeriods)[0])
  const longestStreak = longestStreakPeriod ? longestStreakPeriod.days : 0
  const longestStreakRange = longestStreakPeriod
    ? `${longestStreakPeriod.start.format('MMM D')} - ${longestStreakPeriod.end.format('MMM D')}`
    : '-'

  const avgStreak =
    workPeriods.length > 0 ? Math.round(workPeriods.reduce((sum, wp) => sum + wp.days, 0) / workPeriods.length) : 0

  const breakDurations = sortedAbsences
    .map(a => dayjs(a.endDate).diff(dayjs(a.startDate), 'day') + 1)
    .filter(d => d > 0)
  const shortestBreak = breakDurations.length > 0 ? Math.min(...breakDurations) : 0
  let recommendation = "You're maintaining a healthy work pattern."
  let recommendationIcon = <CheckCircle className="gba:w-6 gba:h-6 gba:text-success" />
  if (currentStreak >= avgStreak && avgStreak > 0) {
    recommendation = `Consider taking a break soon. Your current streak of ${currentStreak} days is approaching your average of ${avgStreak} days.`
    recommendationIcon = <AlertTriangle className="gba:w-6 gba:h-6 gba:text-warning" />
  } else if (currentStreak >= longestStreak && longestStreak > 0) {
    recommendation = `You have reached your longest work streak of ${longestStreak} days! Consider a break.`
    recommendationIcon = <AlertTriangle className="gba:w-6 gba:h-6 gba:text-warning" />
  }

  return (
    <div data-testid="work-patterns-section">
      <h3 className="gba:statisticsSectionTitle" data-testid="work-patterns-section-title">
        {getTranslationFromI18nKeyAndLabel('lowcoder:absence_hub.work_patterns', 'Work Patterns')}
      </h3>
      <div className="gba:statisticsSubTitle" data-testid="work-patterns-section-subtitle">
        {getTranslationFromI18nKeyAndLabel(
          'lowcoder:absence_hub.your_consecutive_work_day_analysis',
          'Your consecutive work day analysis'
        )}
      </div>
      <div className="gba:workPatternsCurrentStreakCard">
        <div className="gba:workPatternsCurrentStreakValue" data-testid="current-streak-value">
          {currentStreak}
        </div>
        <div className="gba:workPatternsCurrentStreakLabel" data-testid="work-patterns-section-current-streak-label">
          {getTranslationFromI18nKeyAndLabel(
            'lowcoder:absence_hub.current_consecutive_work_days',
            'Current consecutive work days'
          )}
        </div>
        <div className="gba:workPatternsCurrentStreakSub">
          {getTranslationFromI18nKeyAndLabel('lowcoder:absence_hub.since_last_time_off', 'Since last time off')}
        </div>
      </div>
      <div className="gba:workPatternsStats">
        <div className="gba:workPatternsStat">
          <div className="gba:workPatternsStatRow">
            <div className="gba:workPatternsStatLabel" data-testid="work-patterns-section-longest-streak-label">
              {getTranslationFromI18nKeyAndLabel(
                'lowcoder:absence_hub.longest_streak',
                `Longest Streak (${thisYear})`,
                { thisYear }
              )}
            </div>
            <span
              className="gba:workPatternsStatValue gba:workPatternsStatValue--red"
              data-testid="longest-streak-value"
            >
              {longestStreak}
            </span>
          </div>
          <div className="gba:workPatternsStatRow">
            <div className="gba:workPatternsStatSub" data-testid="work-patterns-section-longest-streak-sub">
              {longestStreakRange}
            </div>
            <span className="gba:workPatternsStatUnit" data-testid="work-patterns-section-longest-streak-unit">
              {getTranslationFromI18nKeyAndLabel('lowcoder:absence_hub.days', 'days')}
            </span>
          </div>
        </div>
        <div className="gba:workPatternsStat">
          <div className="gba:workPatternsStatRow">
            <div className="gba:workPatternsStatLabel" data-testid="work-patterns-section-average-streak-label">
              {getTranslationFromI18nKeyAndLabel('lowcoder:absence_hub.average_streak', 'Average Streak')}
            </div>
            <span
              className="gba:workPatternsStatValue gba:workPatternsStatValue--blue"
              data-testid="average-streak-value"
            >
              {avgStreak}
            </span>
          </div>
          <div className="gba:workPatternsStatRow">
            <div className="gba:workPatternsStatSub" data-testid="work-patterns-section-average-streak-sub">
              {getTranslationFromI18nKeyAndLabel('lowcoder:absence_hub.typical_work_period', 'Typical work period')}
            </div>
            <span className="gba:workPatternsStatUnit" data-testid="work-patterns-section-average-streak-unit">
              {getTranslationFromI18nKeyAndLabel('lowcoder:absence_hub.days', 'days')}
            </span>
          </div>
        </div>
        <div className="gba:workPatternsStat">
          <div className="gba:workPatternsStatRow">
            <div className="gba:workPatternsStatLabel" data-testid="work-patterns-section-shortest-break-label">
              {getTranslationFromI18nKeyAndLabel('lowcoder:absence_hub.shortest_break', 'Shortest Break')}
            </div>
            <span
              className="gba:workPatternsStatValue gba:workPatternsStatValue--green"
              data-testid="shortest-break-value"
            >
              {shortestBreak}
            </span>
          </div>
          <div className="gba:workPatternsStatRow">
            <div className="gba:workPatternsStatSub" data-testid="work-patterns-section-shortest-break-sub">
              {getTranslationFromI18nKeyAndLabel('lowcoder:absence_hub.between_work_periods', 'Between work periods')}
            </div>
            <span className="gba:workPatternsStatUnit" data-testid="work-patterns-section-shortest-break-unit">
              {getTranslationFromI18nKeyAndLabel('lowcoder:absence_hub.days', 'days')}
            </span>
          </div>
        </div>
      </div>
      <div className="gba:workPatternsRecommendation">
        <div className="gba:workPatternsRecommendationIcon">{recommendationIcon}</div>
        <div className="gba:workPatternsRecommendationText">
          <span
            className="gba:workPatternsRecommendationTitle"
            data-testid="work-patterns-section-recommendation-title"
          >
            {getTranslationFromI18nKeyAndLabel('lowcoder:absence_hub.recommendation', 'Recommendation')}
          </span>
          <span className="gba:workPatternsRecommendationBody" data-testid="work-patterns-section-recommendation-body">
            {recommendation}
          </span>
        </div>
      </div>
    </div>
  )
}

export default WorkPatternsSection
