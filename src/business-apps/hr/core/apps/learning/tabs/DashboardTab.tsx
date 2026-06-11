import React, { useEffect, useMemo } from 'react'
import { Button, Card, CardContent, CardHeader, CardTitle, Spinner, useTranslation } from '@newwork/nw-design-system'
import { WidgetGroup, type WidgetItem } from '@/components/widget-group'
import type { BusinessAppContextProps } from '@/common/BusinessAppContext'
import {
  CalendarIcon,
  CheckCircleIcon,
  GraduationCapIcon,
  PlusIcon,
  TrophyIcon,
  UsersIcon,
  WarningIcon
} from '@phosphor-icons/react'
import translations from '../_i18n'
import { LEARNING_STATUS } from '../constants/learningStatus'
import { LearningTabKey } from '../constants/learningTabs'
import { useLearningAssignments } from '../hooks/useLearningAssignments'
import { useLearningCourses } from '../hooks/useLearningCourses'
import type { LearningCourseListItem } from '../types'
import {
  AssignmentGroupItem,
  CourseListItem,
  DashboardCarousel,
  EmptyState,
  LearnerRowList,
  ListSection,
  PerformanceList,
  RecentActivityList
} from './LearningDashboardSections'
import { buildLearningDashboardModel } from './learningDashboardModel'

interface DashboardTabProps extends BusinessAppContextProps {
  onCreateCourse: () => void
  onEditCourse: (courseId: string) => void
  onAssignCourse: (course: LearningCourseListItem) => void
  onNavigateTab: (tab: LearningTabKey) => void
}

export const DashboardTab: React.FC<DashboardTabProps> = ({
  accessToken,
  userInfo,
  onCreateCourse,
  onEditCourse,
  onAssignCourse,
  onNavigateTab
}) => {
  const { t } = useTranslation(translations)
  const coursesState = useLearningCourses(accessToken)
  const assignmentsState = useLearningAssignments(accessToken)
  const ownerEmployeeId = userInfo?.employeeDetails?.employeeId ?? userInfo?.id
  const publishedCourse = coursesState.courses.find(course => course.status === LEARNING_STATUS.PUBLISHED)
  const isLoading = coursesState.loading || assignmentsState.loading
  const error = coursesState.error ?? assignmentsState.error

  useEffect(() => {
    const handleCourseCreated = () => {
      coursesState.refetch().catch(() => undefined)
    }
    const handleAssignmentCreated = () => {
      assignmentsState.refetch().catch(() => undefined)
    }
    globalThis.addEventListener('learning-course-created', handleCourseCreated)
    globalThis.addEventListener('learning-assignment-created', handleAssignmentCreated)
    return () => {
      globalThis.removeEventListener('learning-course-created', handleCourseCreated)
      globalThis.removeEventListener('learning-assignment-created', handleAssignmentCreated)
    }
  }, [assignmentsState, coursesState])

  const dashboard = useMemo(
    () => buildLearningDashboardModel(coursesState.courses, assignmentsState.groups, ownerEmployeeId),
    [assignmentsState.groups, coursesState.courses, ownerEmployeeId]
  )

  const refetchDashboard = () => {
    void Promise.all([coursesState.refetch(), assignmentsState.refetch()])
  }

  const widgets: WidgetItem[] = [
    {
      key: 'active-assignments',
      title: t('learning-dashboard-kpi-active-assignments'),
      value: dashboard.activeAssignments,
      prefix: <CalendarIcon className="gba:h-5 gba:w-5 gba:text-blue-600" />,
      color: '#1890ff',
      description: t('learning-dashboard-kpi-active-assignments-description')
    },
    {
      key: 'assigned-learners',
      title: t('learning-dashboard-kpi-assigned-learners'),
      value: dashboard.assignedLearners,
      prefix: <UsersIcon className="gba:h-5 gba:w-5 gba:text-purple-600" />,
      color: '#722ed1',
      description: t('learning-dashboard-kpi-assigned-learners-description')
    },
    {
      key: 'completion-rate',
      title: t('learning-dashboard-kpi-completion-rate'),
      value: dashboard.completionRate,
      suffix: '%',
      prefix: <CheckCircleIcon className="gba:h-5 gba:w-5 gba:text-green-600" />,
      color: '#52c41a',
      description: t('learning-dashboard-kpi-completion-rate-description')
    },
    {
      key: 'pass-rate',
      title: t('learning-dashboard-kpi-pass-rate'),
      value: dashboard.passRate,
      suffix: '%',
      prefix: <TrophyIcon className="gba:h-5 gba:w-5 gba:text-green-600" />,
      color: '#3f8600',
      description: t('learning-dashboard-kpi-pass-rate-description')
    },
    {
      key: 'overdue',
      title: t('learning-dashboard-kpi-overdue'),
      value: dashboard.overdueCount,
      prefix: <WarningIcon className="gba:h-5 gba:w-5 gba:text-orange-600" />,
      color: '#fa8c16',
      description: t('learning-dashboard-kpi-overdue-description')
    },
    {
      key: 'published-vs-draft',
      title: t('learning-dashboard-kpi-published-draft'),
      value: `${dashboard.publishedCourses}/${dashboard.draftCourses}`,
      valueIsString: true,
      prefix: <GraduationCapIcon className="gba:h-5 gba:w-5 gba:text-blue-600" />,
      color: '#1677ff',
      description: t('learning-dashboard-kpi-published-draft-description')
    }
  ]

  const carouselSlides = [
    {
      key: 'overdue',
      title: t('learning-dashboard-overdue-title'),
      content: (
        <ListSection
          title={t('learning-dashboard-overdue-title')}
          description={t('learning-dashboard-overdue-description')}
          testId="learning-dashboard-overdue"
          className="gba:flex gba:h-full gba:min-h-0 gba:flex-col"
          contentClassName="gba:min-h-0 gba:flex-1 gba:overflow-y-auto"
        >
          <LearnerRowList
            rows={dashboard.overdueRows}
            emptyText={t('learning-dashboard-overdue-empty')}
            emptyTestId="learning-dashboard-overdue-empty"
            dateField="availableUntil"
          />
        </ListSection>
      )
    },
    {
      key: 'awaiting',
      title: t('learning-dashboard-awaiting-title'),
      content: (
        <ListSection
          title={t('learning-dashboard-awaiting-title')}
          description={t('learning-dashboard-awaiting-description')}
          testId="learning-dashboard-awaiting"
          className="gba:flex gba:h-full gba:min-h-0 gba:flex-col"
          contentClassName="gba:min-h-0 gba:flex-1 gba:overflow-y-auto"
        >
          {dashboard.scheduledAssignments.length === 0 && dashboard.draftCoursesAwaitingAction.length === 0 ? (
            <EmptyState testId="learning-dashboard-awaiting-empty">{t('learning-dashboard-awaiting-empty')}</EmptyState>
          ) : (
            <>
              {dashboard.scheduledAssignments.map(group => (
                <AssignmentGroupItem key={group.courseId} group={group} t={t} />
              ))}
              {dashboard.draftCoursesAwaitingAction.map(course => (
                <CourseListItem
                  key={course.id}
                  course={course}
                  actionLabel={t('learning-edit-course')}
                  onAction={() => onEditCourse(course.id)}
                  testId={`learning-dashboard-draft-course-${course.id}`}
                />
              ))}
            </>
          )}
        </ListSection>
      )
    },
    {
      key: 'recent-courses',
      title: t('learning-dashboard-recent-courses-title'),
      content: (
        <ListSection
          title={t('learning-dashboard-recent-courses-title')}
          testId="learning-dashboard-recent-courses"
          className="gba:flex gba:h-full gba:min-h-0 gba:flex-col"
          contentClassName="gba:min-h-0 gba:flex-1 gba:overflow-y-auto"
        >
          {dashboard.recentCourses.length === 0 ? (
            <EmptyState testId="learning-dashboard-recent-courses-empty">
              {t('learning-dashboard-recent-courses-empty')}
            </EmptyState>
          ) : (
            dashboard.recentCourses.map(course => (
              <CourseListItem
                key={course.id}
                course={course}
                actionLabel={t('learning-assign-course')}
                onAction={() => onAssignCourse(course)}
                testId={`learning-dashboard-recent-course-${course.id}`}
              />
            ))
          )}
        </ListSection>
      )
    },
    {
      key: 'in-progress',
      title: t('learning-dashboard-in-progress-title'),
      content: (
        <ListSection
          title={t('learning-dashboard-in-progress-title')}
          testId="learning-dashboard-in-progress"
          className="gba:flex gba:h-full gba:min-h-0 gba:flex-col"
          contentClassName="gba:min-h-0 gba:flex-1 gba:overflow-y-auto"
        >
          <LearnerRowList
            rows={dashboard.inProgressRows}
            emptyText={t('learning-dashboard-in-progress-empty')}
            emptyTestId="learning-dashboard-in-progress-empty"
            dateField="startedAt"
          />
        </ListSection>
      )
    },
    {
      key: 'my-courses',
      title: t('learning-dashboard-my-courses-title'),
      content: (
        <ListSection
          title={t('learning-dashboard-my-courses-title')}
          testId="learning-dashboard-my-courses"
          className="gba:flex gba:h-full gba:min-h-0 gba:flex-col"
          contentClassName="gba:min-h-0 gba:flex-1 gba:overflow-y-auto"
        >
          {dashboard.myCourses.length === 0 ? (
            <EmptyState testId="learning-dashboard-my-courses-empty">
              {t('learning-dashboard-my-courses-empty')}
            </EmptyState>
          ) : (
            dashboard.myCourses.map(course => (
              <CourseListItem
                key={course.id}
                course={course}
                actionLabel={t('learning-edit-course')}
                onAction={() => onEditCourse(course.id)}
                testId={`learning-dashboard-my-course-${course.id}`}
              />
            ))
          )}
        </ListSection>
      )
    },
    {
      key: 'recent-activity',
      title: t('learning-dashboard-recent-activity-title'),
      content: (
        <ListSection
          title={t('learning-dashboard-recent-activity-title')}
          testId="learning-dashboard-recent-activity"
          className="gba:flex gba:h-full gba:min-h-0 gba:flex-col"
          contentClassName="gba:min-h-0 gba:flex-1 gba:overflow-y-auto"
        >
          <RecentActivityList
            items={dashboard.recentActivity}
            emptyText={t('learning-dashboard-recent-activity-empty')}
          />
        </ListSection>
      )
    },
    {
      key: 'performance',
      title: t('learning-dashboard-performance-title'),
      content: (
        <ListSection
          title={t('learning-dashboard-performance-title')}
          testId="learning-dashboard-performance"
          className="gba:flex gba:h-full gba:min-h-0 gba:flex-col"
          contentClassName="gba:min-h-0 gba:flex-1 gba:overflow-y-auto"
        >
          <div className="gba:space-y-4">
            <div>
              <div className="gba:mb-2 gba:text-xs gba:font-semibold gba:text-muted-foreground">
                {t('learning-dashboard-top-performing')}
              </div>
              <PerformanceList
                items={dashboard.topPerforming}
                emptyText={t('learning-dashboard-performance-empty')}
                completedLabel={t('learning-dashboard-performance-completed')}
                testId="learning-dashboard-top-performing"
              />
            </div>
            <div>
              <div className="gba:mb-2 gba:text-xs gba:font-semibold gba:text-muted-foreground">
                {t('learning-dashboard-lowest-performing')}
              </div>
              <PerformanceList
                items={dashboard.lowestPerforming}
                emptyText={t('learning-dashboard-performance-empty')}
                completedLabel={t('learning-dashboard-performance-completed')}
                testId="learning-dashboard-lowest-performing"
              />
            </div>
          </div>
        </ListSection>
      )
    }
  ]

  return (
    <div
      className="gba:flex gba:h-[calc(100vh-16rem)] gba:min-h-0 gba:flex-col gba:space-y-3"
      data-testid="learning-dashboard-tab"
    >
      <WidgetGroup
        widgets={widgets}
        isLoading={isLoading}
        error={error}
        onRetry={refetchDashboard}
        skeletonCount={6}
        data-testid="learning-dashboard-kpis"
      />

      <Card data-testid="learning-dashboard-quick-actions">
        <CardHeader>
          <CardTitle>{t('learning-dashboard-quick-actions-title')}</CardTitle>
          <p className="gba:mt-1 gba:text-sm gba:text-muted-foreground">
            {t('learning-dashboard-quick-actions-description')}
          </p>
        </CardHeader>
        <CardContent className="gba:flex gba:flex-wrap gba:gap-2">
          <Button type="button" onClick={onCreateCourse} data-testid="learning-dashboard-create-course-button">
            <PlusIcon className="gba:mr-2 gba:h-4 gba:w-4" />
            {t('learning-create-course')}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => onNavigateTab(LearningTabKey.Library)}
            data-testid="learning-dashboard-library-button"
          >
            {t('learning-dashboard-open-library')}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => onNavigateTab(LearningTabKey.Assignments)}
            data-testid="learning-dashboard-assignments-button"
          >
            <CalendarIcon className="gba:mr-2 gba:h-4 gba:w-4" />
            {t('learning-dashboard-open-assignments')}
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={!publishedCourse}
            onClick={() => publishedCourse && onAssignCourse(publishedCourse)}
            data-testid="learning-dashboard-assign-course-button"
          >
            {t('learning-dashboard-assign-course')}
          </Button>
        </CardContent>
      </Card>

      {isLoading && <Spinner className="gba:h-5 gba:w-5" data-testid="learning-dashboard-loading" />}

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
  )
}
