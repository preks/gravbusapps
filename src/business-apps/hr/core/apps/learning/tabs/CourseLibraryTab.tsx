import React, { useEffect } from 'react'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Button,
  Spinner,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  useTranslation
} from '@newwork/nw-design-system'
import { BookOpen } from 'lucide-react'
import type { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { LEARNING_STATUS } from '../constants/learningStatus'
import { useLearningCourses } from '../hooks/useLearningCourses'
import { CourseStatusBadge } from '../components/CourseStatusBadge'
import translations from '../_i18n'
import type { LearningCourseListItem } from '../types'

function formatDate(value?: string): string {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(date)
}

function formatPassThreshold(value?: number): string {
  if (value === undefined) return '-'
  return `${value}%`
}

interface CourseLibraryTabProps extends BusinessAppContextProps {
  onEditCourse?: (courseId: string) => void
  onAssignCourse?: (course: LearningCourseListItem) => void
}

export const CourseLibraryTab: React.FC<CourseLibraryTabProps> = ({ accessToken, onEditCourse, onAssignCourse }) => {
  const { t } = useTranslation(translations)
  const { courses, loading, error, refetch } = useLearningCourses(accessToken)

  useEffect(() => {
    const handleCourseCreated = () => {
      refetch().catch(() => undefined)
    }
    globalThis.addEventListener('learning-course-created', handleCourseCreated)
    return () => globalThis.removeEventListener('learning-course-created', handleCourseCreated)
  }, [refetch])

  const renderCourseRows = () => {
    if (loading && courses.length === 0) {
      return (
        <TableRow>
          <TableCell colSpan={7} className="gba:py-8 gba:text-center">
            <Spinner className="gba:mx-auto gba:h-8 gba:w-8" />
            <span className="gba:sr-only">{t('learning-library-loading')}</span>
          </TableCell>
        </TableRow>
      )
    }

    if (courses.length === 0) {
      return (
        <TableRow>
          <TableCell colSpan={7} className="gba:py-8 gba:text-center gba:text-muted-foreground">
            {t('learning-library-empty')}
          </TableCell>
        </TableRow>
      )
    }

    return courses.map(course => {
      const canAssign = course.status === LEARNING_STATUS.PUBLISHED
      return (
        <TableRow key={course.id}>
          <TableCell className="gba:font-medium">{course.title || '-'}</TableCell>
          <TableCell className="gba:max-w-[360px] gba:truncate">{course.description || '-'}</TableCell>
          <TableCell>
            <CourseStatusBadge status={course.status} />
          </TableCell>
          <TableCell>{formatPassThreshold(course.passThreshold)}</TableCell>
          <TableCell>{course.ownerEmployeeName || '-'}</TableCell>
          <TableCell>{formatDate(course.updatedAt)}</TableCell>
          <TableCell>
            <div className="gba:flex gba:flex-wrap gba:gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => onEditCourse?.(course.id)}
                data-testid={`learning-edit-course-${course.id}`}
              >
                {t('learning-edit-course')}
              </Button>
              <Button
                type="button"
                variant="default"
                size="sm"
                onClick={() => onAssignCourse?.(course)}
                disabled={canAssign === false}
                title={canAssign ? undefined : t('learning-assign-published-only')}
                data-testid={`learning-assign-course-${course.id}`}
              >
                {t('learning-assign-course')}
              </Button>
            </div>
          </TableCell>
        </TableRow>
      )
    })
  }

  return (
    <Card data-testid="learning-course-library">
      <CardHeader>
        <div className="gba:flex gba:items-center gba:justify-between">
          <div>
            <CardTitle className="gba:flex gba:items-center gba:gap-2">
              <BookOpen className="gba:h-5 gba:w-5" />
              {t('learning-library-title')}
            </CardTitle>
            <p className="gba:mt-1 gba:text-sm gba:text-muted-foreground">{t('learning-library-description')}</p>
          </div>
          {loading && <Spinner className="gba:h-5 gba:w-5" data-testid="learning-library-loading" />}
        </div>
      </CardHeader>
      <CardContent>
        {error && (
          <div
            className="gba:mb-4 gba:rounded-lg gba:bg-destructive/10 gba:px-4 gba:py-3 gba:text-sm gba:text-destructive"
            data-testid="learning-library-error"
          >
            {error || t('learning-library-error')}
          </div>
        )}
        <div className="gba:overflow-hidden gba:rounded-lg gba:border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('learning-table-title')}</TableHead>
                <TableHead>{t('learning-table-description')}</TableHead>
                <TableHead>{t('learning-table-status')}</TableHead>
                <TableHead>{t('learning-table-pass-threshold')}</TableHead>
                <TableHead>{t('learning-table-owner')}</TableHead>
                <TableHead>{t('learning-table-modified')}</TableHead>
                <TableHead>{t('learning-table-actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>{renderCourseRows()}</TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}
