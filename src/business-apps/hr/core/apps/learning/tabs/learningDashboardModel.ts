import { LEARNING_STATUS } from '../constants/learningStatus'
import type { LearningAssignmentGroup, LearningAssignmentProgressRow, LearningCourseListItem } from '../types'

export interface LearningDashboardActivityItem {
  id: string
  courseTitle: string
  employeeName: string
  activityAt: string
  statusLabel: string
  scorePct?: number
}

export interface LearningDashboardPerformanceItem {
  courseId: string
  courseTitle: string
  passRate: number
  completed: number
  assigned: number
}

export interface LearningDashboardModel {
  activeAssignments: number
  assignedLearners: number
  completionRate: number
  passRate: number
  overdueCount: number
  publishedCourses: number
  draftCourses: number
  overdueRows: Array<LearningAssignmentProgressRow & { courseTitle: string }>
  scheduledAssignments: LearningAssignmentGroup[]
  draftCoursesAwaitingAction: LearningCourseListItem[]
  recentCourses: LearningCourseListItem[]
  inProgressRows: Array<LearningAssignmentProgressRow & { courseTitle: string }>
  myCourses: LearningCourseListItem[]
  recentActivity: LearningDashboardActivityItem[]
  topPerforming: LearningDashboardPerformanceItem[]
  lowestPerforming: LearningDashboardPerformanceItem[]
}

function toTimestamp(value?: string): number {
  if (!value) return 0
  const date = new Date(value)
  return Number.isFinite(date.getTime()) ? date.getTime() : 0
}

function isOverdue(row: LearningAssignmentProgressRow): boolean {
  return Boolean(
    row.availableUntil && !row.submittedAt && !row.gradedAt && toTimestamp(row.availableUntil) < Date.now()
  )
}

function calculateRate(numerator: number, denominator: number): number {
  if (denominator <= 0) return 0
  return Math.round((numerator / denominator) * 100)
}

function uniqueAssignmentCount(groups: LearningAssignmentGroup[], status: string): number {
  return groups.reduce(
    (count, group) => count + group.assignments.filter(assignment => assignment.status === status).length,
    0
  )
}

function flattenRows(groups: LearningAssignmentGroup[]) {
  return groups.flatMap(group => group.rows.map(row => ({ ...row, courseTitle: group.courseTitle })))
}

function buildRecentActivity(groups: LearningAssignmentGroup[]): LearningDashboardActivityItem[] {
  return flattenRows(groups)
    .reduce<LearningDashboardActivityItem[]>((items, row) => {
      const activityAt = row.gradedAt ?? row.submittedAt
      if (!activityAt) return items
      items.push({
        id: `${row.employeeId}-${row.attemptId ?? activityAt}`,
        courseTitle: row.courseTitle,
        employeeName: row.employeeName,
        activityAt,
        statusLabel: row.attemptStatusLabel,
        scorePct: row.scorePct
      })
      return items
    }, [])
    .sort((left, right) => toTimestamp(right.activityAt) - toTimestamp(left.activityAt))
    .slice(0, 5)
}

function buildPerformance(groups: LearningAssignmentGroup[]): LearningDashboardPerformanceItem[] {
  return groups
    .filter(group => group.summary.submittedOrGraded > 0)
    .map(group => ({
      courseId: group.courseId,
      courseTitle: group.courseTitle,
      passRate: calculateRate(group.summary.passed, group.summary.submittedOrGraded),
      completed: group.summary.submittedOrGraded,
      assigned: group.summary.assigned
    }))
}

export function buildLearningDashboardModel(
  courses: LearningCourseListItem[],
  groups: LearningAssignmentGroup[],
  ownerEmployeeId?: string
): LearningDashboardModel {
  const totals = groups.reduce(
    (acc, group) => {
      acc.assigned += group.summary.assigned
      acc.completed += group.summary.submittedOrGraded
      acc.passed += group.summary.passed
      acc.overdue += group.summary.overdue
      return acc
    },
    { assigned: 0, completed: 0, passed: 0, overdue: 0 }
  )
  const rows = flattenRows(groups)
  const performance = buildPerformance(groups)

  return {
    activeAssignments: uniqueAssignmentCount(groups, 'ACTIVE_LEARNING_ASSIGNMENT'),
    assignedLearners: totals.assigned,
    completionRate: calculateRate(totals.completed, totals.assigned),
    passRate: calculateRate(totals.passed, totals.completed),
    overdueCount: totals.overdue,
    publishedCourses: courses.filter(course => course.status === LEARNING_STATUS.PUBLISHED).length,
    draftCourses: courses.filter(course => course.status === LEARNING_STATUS.DRAFT).length,
    overdueRows: rows.filter(isOverdue).slice(0, 5),
    scheduledAssignments: groups
      .filter(group => group.assignments.some(assignment => assignment.status === 'SCHEDULED_LEARNING_ASSIGNMENT'))
      .slice(0, 4),
    draftCoursesAwaitingAction: courses.filter(course => course.status === LEARNING_STATUS.DRAFT).slice(0, 4),
    recentCourses: courses
      .filter(course => course.status === LEARNING_STATUS.PUBLISHED)
      .sort((left, right) => toTimestamp(right.updatedAt) - toTimestamp(left.updatedAt))
      .slice(0, 4),
    inProgressRows: rows.filter(row => row.attemptStatus === 'IN_PROGRESS_LEARNING_ATTEMPT').slice(0, 5),
    myCourses: ownerEmployeeId ? courses.filter(course => course.ownerEmployeeId === ownerEmployeeId).slice(0, 4) : [],
    recentActivity: buildRecentActivity(groups),
    topPerforming: [...performance].sort((left, right) => right.passRate - left.passRate).slice(0, 3),
    lowestPerforming: [...performance].sort((left, right) => left.passRate - right.passRate).slice(0, 3)
  }
}
