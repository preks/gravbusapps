import type { LearningAssignmentApi, LearningAttemptApi, LearningCourseListItem } from '../types'

export type LearningAnalyticsDateRange = 'all' | '30d' | '90d'

export interface LearningAnalyticsFilters {
  courseId: string
  dateRange: LearningAnalyticsDateRange
}

export interface LearningAnalyticsAttemptRow {
  id: string
  employeeName: string
  courseId: string
  courseTitle: string
  versionLabel: string
  status: string
  scorePct?: number
  passed?: boolean
  bandLabel?: string
  timeTakenMinutes?: number
  submittedAt?: string
  gradedAt?: string
}

export interface LearningAnalyticsMetricRow {
  label: string
  passRate: number
  averageScore: number
  completed: number
}

export interface LearningAnalyticsModel {
  funnel: Array<{ key: string; labelKey: string; value: number }>
  trend: Array<{ date: string; completed: number; passed: number }>
  timeByCourse: Array<{ courseTitle: string; averageMinutes: number; limitMinutes: number }>
  scoreHistogram: Array<{ bucket: string; count: number; passThreshold: number }>
  bandDistribution: Array<{ band: string; value: number }>
  passRateByCourse: LearningAnalyticsMetricRow[]
  versionComparison: LearningAnalyticsMetricRow[]
  aiQuality: LearningAnalyticsMetricRow[]
  learnerRows: LearningAnalyticsAttemptRow[]
  kpis: {
    assigned: number
    started: number
    completed: number
    passed: number
    averageScore: number
    averageTimeMinutes: number
  }
}

interface InternalAttempt extends LearningAnalyticsAttemptRow {
  courseId: string
  courseTitle: string
  versionId: string
  versionNo?: number
  generatorLabel: string
  startedAt?: string
  submittedAt?: string
  gradedAt?: string
}

function toNumber(value: number | string | null | undefined): number | undefined {
  if (value === null || value === undefined || value === '') return undefined
  const parsed = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(parsed) ? parsed : undefined
}

function formatEmployeeName(attempt: LearningAttemptApi): string {
  const fullName = [attempt.employee?.firstName, attempt.employee?.lastName].filter(Boolean).join(' ').trim()
  return attempt.employee?.displayName?.trim() || fullName || 'Unknown employee'
}

function toTimestamp(value?: string | null): number {
  if (!value) return 0
  const date = new Date(value)
  return Number.isFinite(date.getTime()) ? date.getTime() : 0
}

function isWithinRange(value: string | undefined, dateRange: LearningAnalyticsDateRange): boolean {
  if (dateRange === 'all' || !value) return true
  const days = dateRange === '30d' ? 30 : 90
  return toTimestamp(value) >= Date.now() - days * 24 * 60 * 60 * 1000
}

function calculateRate(numerator: number, denominator: number): number {
  return denominator > 0 ? Math.round((numerator / denominator) * 100) : 0
}

function average(values: number[]): number {
  if (values.length === 0) return 0
  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length)
}

function dayLabel(value?: string): string {
  if (!value) return '-'
  return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' }).format(new Date(value))
}

function resolveCourse(
  courses: LearningCourseListItem[],
  assignment: LearningAssignmentApi
): LearningCourseListItem | undefined {
  return courses.find(course => course.id === (assignment.learningCourseId ?? assignment.learningCourse?.id))
}

function flattenAttempts(
  courses: LearningCourseListItem[],
  assignments: LearningAssignmentApi[],
  filters: LearningAnalyticsFilters
): InternalAttempt[] {
  return assignments.flatMap(assignment => {
    const course = resolveCourse(courses, assignment)
    const courseId = assignment.learningCourseId ?? assignment.learningCourse?.id ?? course?.id ?? 'unknown-course'
    if (filters.courseId !== 'all' && filters.courseId !== courseId) return []
    const courseTitle = course?.title || assignment.learningCourse?.title || assignment.title || 'Untitled course'
    const versionNo = assignment.learningCourseVersion?.versionNo ?? undefined
    const generatorLabel =
      [
        assignment.learningCourseVersion?.generatorAgentId,
        assignment.learningCourseVersion?.generatorModelId,
        assignment.learningCourseVersion?.generatorPromptVersion
          ? `v${assignment.learningCourseVersion.generatorPromptVersion}`
          : undefined
      ]
        .filter(Boolean)
        .join(' / ') || 'Unknown generator'

    return (assignment.learningAttempts ?? []).reduce<InternalAttempt[]>((rows, attempt) => {
      const activityDate = attempt.gradedAt ?? attempt.submittedAt ?? attempt.startedAt ?? undefined
      if (!isWithinRange(activityDate, filters.dateRange)) return rows
      const timeSeconds = toNumber(attempt.timeTakenSeconds)
      rows.push({
        id: attempt.id,
        employeeName: formatEmployeeName(attempt),
        courseId,
        courseTitle,
        versionId: assignment.learningCourseVersionId ?? attempt.learningCourseVersionId ?? 'unknown-version',
        versionNo,
        versionLabel: versionNo ? `${courseTitle} v${versionNo}` : courseTitle,
        generatorLabel,
        status: attempt.status ?? '-',
        scorePct: toNumber(attempt.scorePct),
        passed: attempt.passed ?? undefined,
        bandLabel: attempt.bandLabel ?? undefined,
        timeTakenMinutes: timeSeconds ? Math.round(timeSeconds / 60) : undefined,
        startedAt: attempt.startedAt ?? undefined,
        submittedAt: attempt.submittedAt ?? undefined,
        gradedAt: attempt.gradedAt ?? undefined
      })
      return rows
    }, [])
  })
}

function buildGroupedMetric(
  attempts: InternalAttempt[],
  getLabel: (attempt: InternalAttempt) => string
): LearningAnalyticsMetricRow[] {
  const groups = new Map<string, InternalAttempt[]>()
  attempts.forEach(attempt => {
    const label = getLabel(attempt)
    groups.set(label, [...(groups.get(label) ?? []), attempt])
  })
  return Array.from(groups.entries()).map(([label, rows]) => {
    const graded = rows.filter(row => row.scorePct !== undefined)
    return {
      label,
      passRate: calculateRate(rows.filter(row => row.passed).length, graded.length),
      averageScore: average(graded.map(row => row.scorePct ?? 0)),
      completed: graded.length
    }
  })
}

export function buildLearningAnalyticsModel(
  courses: LearningCourseListItem[],
  assignments: LearningAssignmentApi[],
  filters: LearningAnalyticsFilters
): LearningAnalyticsModel {
  const visibleAssignments = assignments.filter(assignment => {
    const courseId = assignment.learningCourseId ?? assignment.learningCourse?.id ?? 'unknown-course'
    return filters.courseId === 'all' || filters.courseId === courseId
  })
  const attempts = flattenAttempts(courses, visibleAssignments, filters)
  const completed = attempts.filter(attempt => attempt.submittedAt || attempt.gradedAt)
  const graded = attempts.filter(attempt => attempt.scorePct !== undefined)
  const assigned = visibleAssignments.reduce(
    (sum, assignment) => sum + (assignment.learningAssignmentTargets?.length ?? 0),
    0
  )
  const started = attempts.filter(attempt => attempt.startedAt).length
  const passed = attempts.filter(attempt => attempt.passed).length
  const passThreshold =
    filters.courseId === 'all' ? 70 : (courses.find(course => course.id === filters.courseId)?.passThreshold ?? 70)

  const trendMap = new Map<string, { date: string; completed: number; passed: number }>()
  completed.forEach(attempt => {
    const sourceDate = attempt.gradedAt ?? attempt.submittedAt
    const key = sourceDate?.slice(0, 10) ?? '-'
    const row = trendMap.get(key) ?? { date: dayLabel(sourceDate), completed: 0, passed: 0 }
    row.completed += 1
    if (attempt.passed) row.passed += 1
    trendMap.set(key, row)
  })
  const trend = Array.from(trendMap.entries())
  trend.sort(([left], [right]) => left.localeCompare(right))
  const learnerRows = [...attempts]
  learnerRows.sort(
    (left, right) =>
      toTimestamp(right.gradedAt ?? right.submittedAt ?? right.startedAt) -
      toTimestamp(left.gradedAt ?? left.submittedAt ?? left.startedAt)
  )

  const scoreBuckets = [
    { bucket: '0-20', min: 0, max: 20 },
    { bucket: '21-40', min: 21, max: 40 },
    { bucket: '41-60', min: 41, max: 60 },
    { bucket: '61-80', min: 61, max: 80 },
    { bucket: '81-100', min: 81, max: 100 }
  ]

  return {
    funnel: [
      { key: 'assigned', labelKey: 'learning-analytics-funnel-assigned', value: assigned },
      { key: 'started', labelKey: 'learning-analytics-funnel-started', value: started },
      { key: 'submitted', labelKey: 'learning-analytics-funnel-submitted', value: completed.length },
      { key: 'graded', labelKey: 'learning-analytics-funnel-graded', value: graded.length },
      { key: 'passed', labelKey: 'learning-analytics-funnel-passed', value: passed }
    ],
    trend: trend.map(([, value]) => value),
    timeByCourse: courses
      .filter(course => filters.courseId === 'all' || course.id === filters.courseId)
      .map(course => {
        const courseAttempts = attempts.filter(attempt => attempt.courseId === course.id && attempt.timeTakenMinutes)
        return {
          courseTitle: course.title || 'Untitled course',
          averageMinutes: average(courseAttempts.map(attempt => attempt.timeTakenMinutes ?? 0)),
          limitMinutes: course.timeLimitMinutes ?? 0
        }
      })
      .filter(row => row.averageMinutes > 0 || row.limitMinutes > 0),
    scoreHistogram: scoreBuckets.map(bucket => ({
      bucket: bucket.bucket,
      count: graded.filter(attempt => {
        const score = attempt.scorePct ?? 0
        return score >= bucket.min && score <= bucket.max
      }).length,
      passThreshold
    })),
    bandDistribution: Array.from(
      attempts.reduce((map, attempt) => {
        const band = attempt.bandLabel?.trim()
        if (!band) return map
        map.set(band, (map.get(band) ?? 0) + 1)
        return map
      }, new Map<string, number>())
    ).map(([band, value]) => ({ band, value })),
    passRateByCourse: buildGroupedMetric(attempts, attempt => attempt.courseTitle),
    versionComparison: buildGroupedMetric(attempts, attempt => attempt.versionLabel),
    aiQuality: buildGroupedMetric(attempts, attempt => attempt.generatorLabel),
    learnerRows: learnerRows.slice(0, 25),
    kpis: {
      assigned,
      started,
      completed: completed.length,
      passed,
      averageScore: average(graded.map(attempt => attempt.scorePct ?? 0)),
      averageTimeMinutes: average(attempts.map(attempt => attempt.timeTakenMinutes ?? 0).filter(Boolean))
    }
  }
}
