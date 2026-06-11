import React, { useEffect, useMemo, useState } from 'react'
import { Button, PageLayout, Spinner, useTranslation } from '@newwork/nw-design-system'
import { GraduationCapIcon, PlusIcon } from '@phosphor-icons/react'
import type { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useFeature } from '@/common/hooks/useFeature'
import { Feature } from '@/common/types/constants/FeatureHub'
import translations from './_i18n'
import { LEARNING_TAB_KEYS, LearningTabKey, VIEW_OPTIONS } from './constants/learningTabs'
import { CourseBuilderDialog } from './components/CourseBuilderDialog'
import { AssignLearningCourseDialog } from './components/AssignLearningCourseDialog'
import { DashboardTab } from './tabs/DashboardTab'
import { CourseLibraryTab } from './tabs/CourseLibraryTab'
import { AssignmentsTab } from './tabs/AssignmentsTab'
import { AnalyticsTab } from './tabs/AnalyticsTab'
import { AuditTab } from './tabs/AuditTab'
import type { LearningCourseListItem } from './types'

const getInitialView = (): LearningTabKey => {
  if (globalThis.window === undefined) return LearningTabKey.Dashboard
  const params = new URLSearchParams(globalThis.window.location.search)
  const view = params.get('view') as LearningTabKey | null
  return view && LEARNING_TAB_KEYS.includes(view) ? view : LearningTabKey.Dashboard
}

const renderTab = (
  activeTab: LearningTabKey,
  context: BusinessAppContextProps,
  onCreateCourse: () => void,
  onEditCourse: (courseId: string) => void,
  onAssignCourse: (course: LearningCourseListItem) => void,
  onNavigateTab: (tab: LearningTabKey) => void
) => {
  switch (activeTab) {
    case LearningTabKey.Library:
      return <CourseLibraryTab {...context} onEditCourse={onEditCourse} onAssignCourse={onAssignCourse} />
    case LearningTabKey.Assignments:
      return <AssignmentsTab accessToken={context.accessToken} />
    case LearningTabKey.Analytics:
      return <AnalyticsTab />
    case LearningTabKey.Audit:
      return <AuditTab />
    case LearningTabKey.Dashboard:
    default:
      return (
        <DashboardTab
          {...context}
          onCreateCourse={onCreateCourse}
          onEditCourse={onEditCourse}
          onAssignCourse={onAssignCourse}
          onNavigateTab={onNavigateTab}
        />
      )
  }
}

export const Learning: React.FC<BusinessAppContextProps> = context => {
  const { t } = useTranslation(translations)
  const isDevEnabled = useFeature<boolean>(Feature.Dev.Enabled.Key)
  const [activeTab, setActiveTab] = useState<LearningTabKey>(getInitialView)
  const [builderOpen, setBuilderOpen] = useState(false)
  const [editingCourseId, setEditingCourseId] = useState<string | null>(null)
  const [assigningCourse, setAssigningCourse] = useState<LearningCourseListItem | null>(null)
  const handleCreateCourse = () => {
    setEditingCourseId(null)
    setBuilderOpen(true)
  }

  const handleEditCourse = (courseId: string) => {
    setEditingCourseId(courseId)
    setBuilderOpen(true)
  }

  const handleAssignCourse = (course: LearningCourseListItem) => {
    setAssigningCourse(course)
  }

  const handleBuilderOpenChange = (open: boolean) => {
    setBuilderOpen(open)
    if (!open) setEditingCourseId(null)
  }

  const viewOptions = useMemo(
    () =>
      VIEW_OPTIONS.map(option => ({
        value: option.key,
        label: t(option.labelKey),
        icon: option.icon
      })),
    [t]
  )

  useEffect(() => {
    if (globalThis.window === undefined) return
    const params = new URLSearchParams(globalThis.window.location.search)
    params.set('view', activeTab)
    const newUrl = `${globalThis.window.location.pathname}?${params.toString()}`
    globalThis.window.history.replaceState({}, '', newUrl)
  }, [activeTab])

  if (isDevEnabled === false) return null

  if (isDevEnabled === undefined) {
    return (
      <div className="gba:flex gba:min-h-screen gba:items-center gba:justify-center" data-testid="learning-loading">
        <Spinner className="gba:h-8 gba:w-8" />
      </div>
    )
  }

  return (
    <div data-testid="learning-app">
      <PageLayout
        headerPhosphorIcon={{
          icon: GraduationCapIcon,
          variant: 'default',
          size: 'lg',
          label: t('learning-app-title')
        }}
        headerTitle={t('learning-app-title')}
        headerDescription={t('learning-app-description')}
        headerSubViews={{
          value: activeTab,
          onValueChange: value => setActiveTab(value as LearningTabKey),
          items: viewOptions
        }}
        headerContent={
          <Button variant="default" size="sm" onClick={handleCreateCourse} data-testid="create-course-button">
            <PlusIcon className="gba:mr-2 gba:h-4 gba:w-4" />
            {t('learning-create-course')}
          </Button>
        }
        className="gba:min-h-screen"
      >
        <div className="gba:h-full gba:overflow-auto">
          {renderTab(activeTab, context, handleCreateCourse, handleEditCourse, handleAssignCourse, setActiveTab)}
        </div>
        <CourseBuilderDialog
          open={builderOpen}
          onOpenChange={handleBuilderOpenChange}
          context={context}
          mode={editingCourseId ? 'edit' : 'create'}
          courseId={editingCourseId}
        />
        <AssignLearningCourseDialog
          open={Boolean(assigningCourse)}
          onOpenChange={open => {
            if (!open) setAssigningCourse(null)
          }}
          context={context}
          course={assigningCourse}
        />
      </PageLayout>
    </div>
  )
}

export default Learning
