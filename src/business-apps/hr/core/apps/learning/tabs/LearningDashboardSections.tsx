import React, { useState } from 'react'
import { Button, Card, CardContent, CardHeader, CardTitle } from '@newwork/nw-design-system'
import { CaretLeftIcon, CaretRightIcon } from '@phosphor-icons/react'
import { CourseStatusBadge } from '../components/CourseStatusBadge'
import type { LearningAssignmentGroup, LearningAssignmentProgressRow, LearningCourseListItem } from '../types'
import type { LearningDashboardActivityItem, LearningDashboardPerformanceItem } from './learningDashboardModel'

function formatDate(value?: string): string {
  if (!value) return '-'
  const date = new Date(value)
  if (!Number.isFinite(date.getTime())) return '-'
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(date)
}

function formatPercent(value: number): string {
  return `${value}%`
}

export const EmptyState: React.FC<{ children: React.ReactNode; testId: string }> = ({ children, testId }) => (
  <div
    className="gba:rounded-lg gba:border gba:border-dashed gba:p-4 gba:text-sm gba:text-muted-foreground"
    data-testid={testId}
  >
    {children}
  </div>
)

export const ListSection: React.FC<{
  title: string
  description?: string
  testId: string
  children: React.ReactNode
  className?: string
  contentClassName?: string
}> = ({ title, description, testId, children, className, contentClassName }) => (
  <Card className={className} data-testid={testId}>
    <CardHeader className="gba:flex-none">
      <CardTitle className="gba:text-base">{title}</CardTitle>
      {description && <p className="gba:mt-1 gba:text-sm gba:text-muted-foreground">{description}</p>}
    </CardHeader>
    <CardContent className={`gba:space-y-3 ${contentClassName ?? ''}`}>{children}</CardContent>
  </Card>
)

export const CourseListItem: React.FC<{
  course: LearningCourseListItem
  actionLabel?: string
  onAction?: () => void
  testId: string
}> = ({ course, actionLabel, onAction, testId }) => (
  <div
    className="gba:flex gba:items-center gba:justify-between gba:gap-3 gba:rounded-lg gba:border gba:p-3"
    data-testid={testId}
  >
    <div className="gba:min-w-0">
      <div className="gba:truncate gba:text-sm gba:font-medium">{course.title || '-'}</div>
      <div className="gba:mt-1 gba:flex gba:flex-wrap gba:items-center gba:gap-2 gba:text-xs gba:text-muted-foreground">
        <CourseStatusBadge status={course.status} />
        <span>{formatDate(course.updatedAt)}</span>
      </div>
    </div>
    {actionLabel && onAction && (
      <Button type="button" variant="outline" size="sm" onClick={onAction} data-testid={`${testId}-action-button`}>
        {actionLabel}
      </Button>
    )}
  </div>
)

export const AssignmentGroupItem: React.FC<{
  group: LearningAssignmentGroup
  t: (key: string, params?: Record<string, unknown>) => string
}> = ({ group, t }) => (
  <div
    className="gba:rounded-lg gba:border gba:p-3"
    data-testid={`learning-dashboard-scheduled-assignment-${group.courseId}`}
  >
    <div className="gba:text-sm gba:font-medium">{group.courseTitle}</div>
    <div className="gba:mt-1 gba:text-xs gba:text-muted-foreground">
      {t('learning-assignments-card-subtitle', { count: group.assignments.length })}
    </div>
  </div>
)

export const LearnerRowList: React.FC<{
  rows: Array<LearningAssignmentProgressRow & { courseTitle: string }>
  emptyText: string
  emptyTestId: string
  dateField: 'availableUntil' | 'startedAt'
}> = ({ rows, emptyText, emptyTestId, dateField }) => {
  if (rows.length === 0) return <EmptyState testId={emptyTestId}>{emptyText}</EmptyState>
  return (
    <>
      {rows.map(row => (
        <div
          key={`${row.employeeId}-${row.attemptId ?? row.availableUntil}`}
          className="gba:rounded-lg gba:border gba:p-3"
        >
          <div className="gba:text-sm gba:font-medium">{row.employeeName}</div>
          <div className="gba:mt-1 gba:text-xs gba:text-muted-foreground">
            {row.courseTitle} · {formatDate(row[dateField])}
          </div>
        </div>
      ))}
    </>
  )
}

export const RecentActivityList: React.FC<{ items: LearningDashboardActivityItem[]; emptyText: string }> = ({
  items,
  emptyText
}) => {
  if (items.length === 0) return <EmptyState testId="learning-dashboard-recent-activity-empty">{emptyText}</EmptyState>
  return (
    <div className="gba:space-y-2" data-testid="learning-dashboard-recent-activity-list">
      {items.map(item => (
        <div key={item.id} className="gba:rounded-lg gba:border gba:p-3">
          <div className="gba:text-sm gba:font-medium">{item.employeeName}</div>
          <div className="gba:mt-1 gba:text-xs gba:text-muted-foreground">
            {item.courseTitle} · {formatDate(item.activityAt)}
          </div>
          <div className="gba:mt-1 gba:text-xs">
            {item.statusLabel}
            {item.scorePct === undefined ? '' : ` · ${formatPercent(item.scorePct)}`}
          </div>
        </div>
      ))}
    </div>
  )
}

export const PerformanceList: React.FC<{
  items: LearningDashboardPerformanceItem[]
  emptyText: string
  completedLabel: string
  testId: string
}> = ({ items, emptyText, completedLabel, testId }) => {
  if (items.length === 0) return <EmptyState testId={`${testId}-empty`}>{emptyText}</EmptyState>
  return (
    <div className="gba:space-y-2" data-testid={testId}>
      {items.map(item => (
        <div
          key={item.courseId}
          className="gba:flex gba:items-center gba:justify-between gba:gap-3 gba:rounded-lg gba:border gba:p-3"
        >
          <div className="gba:min-w-0">
            <div className="gba:truncate gba:text-sm gba:font-medium">{item.courseTitle}</div>
            <div className="gba:mt-1 gba:text-xs gba:text-muted-foreground">
              {completedLabel}: {item.completed}/{item.assigned}
            </div>
          </div>
          <div className="gba:text-sm gba:font-semibold">{formatPercent(item.passRate)}</div>
        </div>
      ))}
    </div>
  )
}

export interface DashboardCarouselSlide {
  key: string
  title: string
  content: React.ReactNode
}

export const DashboardCarousel: React.FC<{
  slides: DashboardCarouselSlide[]
  previousLabel: string
  nextLabel: string
  statusLabel: (current: number, total: number, title: string) => string
}> = ({ slides, previousLabel, nextLabel, statusLabel }) => {
  const [currentIndex, setCurrentIndex] = useState(0)
  const activeSlide = slides[currentIndex]

  if (!activeSlide) return null

  return (
    <div
      className="gba:flex gba:min-h-0 gba:flex-1 gba:flex-col gba:space-y-3"
      data-testid="learning-dashboard-carousel"
    >
      <div className="gba:flex gba:items-center gba:justify-between gba:gap-3">
        <p className="gba:text-sm gba:text-muted-foreground" data-testid="learning-dashboard-carousel-status">
          {statusLabel(currentIndex + 1, slides.length, activeSlide.title)}
        </p>
        <div className="gba:flex gba:items-center gba:gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setCurrentIndex(index => Math.max(0, index - 1))}
            disabled={currentIndex === 0}
            data-testid="learning-dashboard-carousel-previous-button"
          >
            <CaretLeftIcon className="gba:mr-1 gba:h-4 gba:w-4" />
            {previousLabel}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setCurrentIndex(index => Math.min(slides.length - 1, index + 1))}
            disabled={currentIndex === slides.length - 1}
            data-testid="learning-dashboard-carousel-next-button"
          >
            {nextLabel}
            <CaretRightIcon className="gba:ml-1 gba:h-4 gba:w-4" />
          </Button>
        </div>
      </div>

      <div className="gba:min-h-0 gba:flex-1" data-testid={`learning-dashboard-carousel-slide-${activeSlide.key}`}>
        {activeSlide.content}
      </div>

      <div
        className="gba:flex gba:flex-wrap gba:justify-center gba:gap-2"
        data-testid="learning-dashboard-carousel-pagination"
      >
        {slides.map((slide, index) => (
          <button
            key={slide.key}
            type="button"
            className={`gba:h-2 gba:w-8 gba:rounded-full gba:transition ${
              index === currentIndex ? 'gba:bg-primary' : 'gba:bg-muted-foreground/30'
            }`}
            aria-label={slide.title}
            onClick={() => setCurrentIndex(index)}
            data-testid={`learning-dashboard-carousel-page-${slide.key}`}
          />
        ))}
      </div>
    </div>
  )
}
