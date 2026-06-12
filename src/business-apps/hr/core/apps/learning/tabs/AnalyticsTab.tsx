import React, { useEffect, useMemo, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, Spinner, useTranslation } from '@newwork/nw-design-system'
import { ChartBarIcon, CheckCircleIcon, ClockIcon, UsersIcon } from '@phosphor-icons/react'
import { WidgetGroup, type WidgetItem } from '@/components/widget-group'
import translations from '../_i18n'
import { useLearningAssignments } from '../hooks/useLearningAssignments'
import { useLearningCourses } from '../hooks/useLearningCourses'
import {
  CompletionFunnelChart,
  CompletionTrendChart,
  ScoreHistogramChart,
  TimeComparisonChart
} from './LearningAnalyticsCharts'
import { DashboardCarousel, type DashboardCarouselSlide } from './LearningDashboardSections'
import { LearnerDrillDownTable, PassRateTable } from './LearningAnalyticsSections'
import {
  buildLearningAnalyticsModel,
  type LearningAnalyticsDateRange,
  type LearningAnalyticsFilters
} from './learningAnalyticsModel'

interface AnalyticsTabProps {
  accessToken?: string
}

const DATE_RANGE_OPTIONS: Array<{ value: LearningAnalyticsDateRange; labelKey: string }> = [
  { value: 'all', labelKey: 'learning-analytics-filter-date-all' },
  { value: '30d', labelKey: 'learning-analytics-filter-date-30d' },
  { value: '90d', labelKey: 'learning-analytics-filter-date-90d' }
]

export const AnalyticsTab: React.FC<AnalyticsTabProps> = ({ accessToken }) => {
  const { t } = useTranslation(translations)
  const coursesState = useLearningCourses(accessToken)
  const assignmentsState = useLearningAssignments(accessToken)
  const [filters, setFilters] = useState<LearningAnalyticsFilters>({ courseId: 'all', dateRange: 'all' })
  const isLoading = coursesState.loading || assignmentsState.loading
  const error = coursesState.error ?? assignmentsState.error

  useEffect(() => {
    const refetch = () => {
      void Promise.all([coursesState.refetch(), assignmentsState.refetch()])
    }
    globalThis.addEventListener('learning-course-created', refetch)
    globalThis.addEventListener('learning-assignment-created', refetch)
    return () => {
      globalThis.removeEventListener('learning-course-created', refetch)
      globalThis.removeEventListener('learning-assignment-created', refetch)
    }
  }, [assignmentsState, coursesState])

  const analytics = useMemo(
    () => buildLearningAnalyticsModel(coursesState.courses, assignmentsState.assignments, filters),
    [assignmentsState.assignments, coursesState.courses, filters]
  )

  const widgets: WidgetItem[] = [
    {
      key: 'assigned',
      title: t('learning-analytics-kpi-assigned'),
      value: analytics.kpis.assigned,
      prefix: <UsersIcon className="gba:h-5 gba:w-5 gba:text-blue-600" />,
      color: '#1677ff',
      description: t('learning-analytics-kpi-assigned-description')
    },
    {
      key: 'completion',
      title: t('learning-analytics-kpi-completion-rate'),
      value: `${analytics.kpis.assigned > 0 ? Math.round((analytics.kpis.completed / analytics.kpis.assigned) * 100) : 0}%`,
      valueIsString: true,
      prefix: <CheckCircleIcon className="gba:h-5 gba:w-5 gba:text-emerald-600" />,
      color: '#16a34a',
      description: t('learning-analytics-kpi-completion-rate-description')
    },
    {
      key: 'score',
      title: t('learning-analytics-kpi-average-score'),
      value: `${analytics.kpis.averageScore}%`,
      valueIsString: true,
      prefix: <ChartBarIcon className="gba:h-5 gba:w-5 gba:text-purple-600" />,
      color: '#9333ea',
      description: t('learning-analytics-kpi-average-score-description')
    },
    {
      key: 'time',
      title: t('learning-analytics-kpi-average-time'),
      value: `${analytics.kpis.averageTimeMinutes}m`,
      valueIsString: true,
      prefix: <ClockIcon className="gba:h-5 gba:w-5 gba:text-amber-600" />,
      color: '#d97706',
      description: t('learning-analytics-kpi-average-time-description')
    }
  ]

  const metricLabels = {
    name: t('learning-analytics-table-name'),
    completed: t('learning-analytics-table-completed'),
    passRate: t('learning-analytics-table-pass-rate'),
    averageScore: t('learning-analytics-table-average-score')
  }
  const learnerLabels = {
    learner: t('learning-analytics-table-learner'),
    course: t('learning-analytics-table-course'),
    status: t('learning-analytics-table-status'),
    score: t('learning-analytics-table-score'),
    time: t('learning-analytics-table-time')
  }

  const carouselSlides: DashboardCarouselSlide[] = [
    {
      key: 'engagement-performance',
      title: t('learning-analytics-carousel-engagement-performance'),
      content: (
        <div className="gba:grid gba:gap-4 gba:lg:grid-cols-2" data-testid="learning-analytics-chart-slide">
          <CompletionFunnelChart
            title={t('learning-analytics-funnel-title')}
            emptyLabel={t('learning-analytics-empty')}
            data={analytics.funnel}
            labelFor={t}
          />
          <CompletionTrendChart
            title={t('learning-analytics-trend-title')}
            emptyLabel={t('learning-analytics-empty')}
            data={analytics.trend}
          />
          <ScoreHistogramChart
            title={t('learning-analytics-score-title')}
            emptyLabel={t('learning-analytics-empty')}
            data={analytics.scoreHistogram}
          />
          <TimeComparisonChart
            title={t('learning-analytics-time-title')}
            emptyLabel={t('learning-analytics-empty')}
            data={analytics.timeByCourse}
          />
        </div>
      )
    },
    {
      key: 'quality-drilldown',
      title: t('learning-analytics-carousel-quality-drilldown'),
      content: (
        <div className="gba:space-y-4" data-testid="learning-analytics-insight-slide">
          <div className="gba:grid gba:gap-4 gba:xl:grid-cols-2">
            <PassRateTable
              title={t('learning-analytics-course-pass-title')}
              emptyLabel={t('learning-analytics-empty')}
              rows={analytics.passRateByCourse}
              labels={metricLabels}
              testId="learning-analytics-course-pass-table"
            />
            <PassRateTable
              title={t('learning-analytics-version-title')}
              emptyLabel={t('learning-analytics-empty')}
              rows={analytics.versionComparison}
              labels={metricLabels}
              testId="learning-analytics-version-table"
            />
          </div>

          <div className="gba:grid gba:gap-4 gba:xl:grid-cols-2">
            <PassRateTable
              title={t('learning-analytics-ai-title')}
              emptyLabel={t('learning-analytics-empty')}
              rows={analytics.aiQuality}
              labels={metricLabels}
              testId="learning-analytics-ai-table"
            />
            <LearnerDrillDownTable
              title={t('learning-analytics-learner-title')}
              emptyLabel={t('learning-analytics-empty')}
              rows={analytics.learnerRows}
              labels={learnerLabels}
            />
          </div>
        </div>
      )
    }
  ]

  return (
    <div className="gba:space-y-4" data-testid="learning-analytics-tab">
      <Card data-testid="learning-analytics-filters">
        <CardHeader>
          <CardTitle className="gba:text-base">{t('learning-analytics-filters-title')}</CardTitle>
        </CardHeader>
        <CardContent className="gba:flex gba:flex-wrap gba:gap-3">
          <label className="gba:flex gba:flex-col gba:gap-1 gba:text-sm">
            <span className="gba:text-muted-foreground">{t('learning-analytics-filter-course')}</span>
            <select
              className="gba:min-w-64 gba:rounded-md gba:border gba:bg-background gba:px-3 gba:py-2"
              value={filters.courseId}
              onChange={event => setFilters(current => ({ ...current, courseId: event.target.value }))}
              data-testid="learning-analytics-course-filter"
            >
              <option value="all">{t('learning-analytics-filter-course-all')}</option>
              {coursesState.courses.map(course => (
                <option key={course.id} value={course.id}>
                  {course.title}
                </option>
              ))}
            </select>
          </label>
          <label className="gba:flex gba:flex-col gba:gap-1 gba:text-sm">
            <span className="gba:text-muted-foreground">{t('learning-analytics-filter-date')}</span>
            <select
              className="gba:min-w-48 gba:rounded-md gba:border gba:bg-background gba:px-3 gba:py-2"
              value={filters.dateRange}
              onChange={event =>
                setFilters(current => ({ ...current, dateRange: event.target.value as LearningAnalyticsDateRange }))
              }
              data-testid="learning-analytics-date-filter"
            >
              {DATE_RANGE_OPTIONS.map(option => (
                <option key={option.value} value={option.value}>
                  {t(option.labelKey)}
                </option>
              ))}
            </select>
          </label>
        </CardContent>
      </Card>

      {error && (
        <Card className="gba:border-destructive/40 gba:bg-destructive/5" data-testid="learning-analytics-error">
          <CardContent className="gba:py-3 gba:text-sm gba:text-destructive">{error}</CardContent>
        </Card>
      )}
      {isLoading && <Spinner className="gba:h-5 gba:w-5" data-testid="learning-analytics-loading" />}

      <WidgetGroup widgets={widgets} skeletonCount={4} data-testid="learning-analytics-widgets" />

      <div className="gba:flex gba:min-h-[680px] gba:flex-col" data-testid="learning-analytics-carousel">
        <DashboardCarousel
          slides={carouselSlides}
          previousLabel={t('learning-dashboard-carousel-previous')}
          nextLabel={t('learning-dashboard-carousel-next')}
          statusLabel={(current, total, title) =>
            t('learning-dashboard-carousel-status', {
              current,
              total,
              title
            })
          }
        />
      </div>
    </div>
  )
}
