'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { Tabs, TabsList, TabsTrigger, TabsContent, useTranslation } from '@newwork/nw-design-system'
import { GraduationCapIcon, ChartBarIcon, ChatCircleIcon } from '@phosphor-icons/react'
import SkillsTab from './SkillsTab'
import PerformanceTab from './PerformanceTab'
import FeedbackTab from './FeedbackTab'
import PerformanceEvaluationTab from './performance-evaluation/PerformanceEvaluationTab'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { Employee, EmployeePerformanceGoal, EmployeeFeedback } from '../../hooks/useEmployeeData'
import { useEmployeePermissions } from '../../hooks/useEmployeePermissions'
import { useScopePermissionCheck } from '@/common/hooks/useScopePermissionCheck'
import translations from '../../_i18n'
import SkillsTabOld from './SkillsTabOld'

export type HrGrowthUrlMode = 'employeeRecord' | 'standalone'

interface HrGrowthTabProps extends BusinessAppContextProps {
  employee: Employee
  employeeId: string
  isSelfView: boolean
  devFeatureFlag: boolean
  employeePerformanceGoals?: EmployeePerformanceGoal[]
  feedback?: EmployeeFeedback[]
  /** `standalone`: My Development page — URL uses only `subView`, no `tab=hrGrowth`. */
  urlMode?: HrGrowthUrlMode
}

const HR_GROWTH_SUBVIEW_VALUES = ['skills', 'feedback', 'performance', 'performanceEvaluation'] as const
type HrGrowthSubView = (typeof HR_GROWTH_SUBVIEW_VALUES)[number]

const getInitialHrGrowthSubView = (): HrGrowthSubView => {
  if (typeof window === 'undefined') return 'skills'
  const urlParams = new URLSearchParams(window.location.search)
  const subViewFromUrl = urlParams.get('subView')

  if (subViewFromUrl && HR_GROWTH_SUBVIEW_VALUES.includes(subViewFromUrl as HrGrowthSubView)) {
    return subViewFromUrl as HrGrowthSubView
  }

  return 'skills'
}

const HrGrowthTab: React.FC<HrGrowthTabProps> = ({
  employee,
  employeeId,
  accessToken,
  userInfo,
  isSelfView,
  devFeatureFlag,
  employeePerformanceGoals,
  feedback,
  urlMode = 'employeeRecord'
}) => {
  const { t } = useTranslation(translations)
  const [activeSubView, setActiveSubView] = useState<HrGrowthSubView>(getInitialHrGrowthSubView())

  const { loading: permissionsLoading } = useEmployeePermissions(employeeId, accessToken)

  const employeeRecordAllHrBackoffice = useScopePermissionCheck(
    '/platform/employee-record',
    'employee-record-all-hr-backoffice',
    accessToken
  )

  const employeeGrowthPermission = useScopePermissionCheck('/platform/employee-record', 'employee-growth', accessToken)

  const currentUserEmployeeId = userInfo?.employeeDetails?.employeeId || ''
  const supervisorEmployeeId = employee?.employeePosition?.supervisorEmployeeId
  const supervisorIdFromRelation = employee?.employeePosition?.supervisor?.id
  const managerId = supervisorEmployeeId || supervisorIdFromRelation
  const isManager = !!(managerId && currentUserEmployeeId && managerId === currentUserEmployeeId)
  const hasManagerEmployeeGrowthPermission =
    isManager && !employeeGrowthPermission.loading && employeeGrowthPermission.hasPermission === true

  const hasPerformancePermission =
    permissionsLoading || employeeRecordAllHrBackoffice.loading || employeeGrowthPermission.loading
      ? false
      : isSelfView || hasManagerEmployeeGrowthPermission || employeeRecordAllHrBackoffice?.hasPermission === true

  const updateUrl = useCallback(
    (subView: HrGrowthSubView) => {
      if (typeof window === 'undefined') return

      const searchParams = new URLSearchParams(window.location.search)

      if (urlMode === 'employeeRecord') {
        searchParams.set('tab', 'hrGrowth')
        if (subView !== 'skills') {
          searchParams.set('subView', subView)
        } else {
          searchParams.delete('subView')
        }

        const currentUserEmployeeId = userInfo?.employeeDetails?.employeeId || ''
        if (employeeId && employeeId !== currentUserEmployeeId) {
          searchParams.set('employeeId', employeeId)
        } else {
          searchParams.delete('employeeId')
          searchParams.delete('id')
        }
      } else {
        if (subView !== 'skills') {
          searchParams.set('subView', subView)
        } else {
          searchParams.delete('subView')
        }
        searchParams.delete('tab')
        searchParams.delete('employeeId')
        searchParams.delete('id')
      }

      const query = searchParams.toString()
      const newUrl = query ? `${window.location.pathname}?${query}` : window.location.pathname
      window.history.replaceState({}, '', newUrl)
    },
    [employeeId, userInfo?.employeeDetails?.employeeId, urlMode]
  )

  useEffect(() => {
    if (typeof window === 'undefined') return

    if (!devFeatureFlag && activeSubView === 'performanceEvaluation') {
      const newSubView = 'skills'
      setActiveSubView(newSubView)
      updateUrl(newSubView)
    }

    if (
      !permissionsLoading &&
      !employeeRecordAllHrBackoffice.loading &&
      !employeeGrowthPermission.loading &&
      !hasPerformancePermission &&
      activeSubView === 'performance'
    ) {
      const newSubView = 'skills'
      setActiveSubView(newSubView)
      updateUrl(newSubView)
    }
  }, [
    devFeatureFlag,
    activeSubView,
    permissionsLoading,
    hasPerformancePermission,
    employeeRecordAllHrBackoffice.loading,
    employeeGrowthPermission.loading,
    updateUrl
  ])

  // Ensure URL is properly set on initial load (employee profile deep links)
  useEffect(() => {
    if (typeof window === 'undefined') return
    if (urlMode === 'standalone') return
    const urlParams = new URLSearchParams(window.location.search)
    if (!urlParams.has('tab') || urlParams.get('tab') !== 'hrGrowth') {
      updateUrl(activeSubView)
    }
  }, [])

  useEffect(() => {
    const handlePopState = () => {
      const newSubView = getInitialHrGrowthSubView()
      setActiveSubView(newSubView)
    }

    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [])

  const handleSubViewChange = (value: string) => {
    const newSubView = value as HrGrowthSubView
    setActiveSubView(newSubView)
    updateUrl(newSubView)
  }

  return (
    <div data-testid="hr-growth-tab-container" className="gba:w-full">
      <Tabs value={activeSubView} onValueChange={handleSubViewChange} className="gba:w-full">
        <TabsList className="gba:mb-4 gba:w-full" data-testid="hr-growth-tabs-list">
          <TabsTrigger value="skills" data-testid="hr-growth-skills-subtab" className="gba:flex-1">
            <div className="gba:flex gba:items-center gba:gap-2 gba:justify-center">
              <GraduationCapIcon />
              <span>{t('hr-growth-skills')}</span>
            </div>
          </TabsTrigger>
          <TabsTrigger value="feedback" data-testid="hr-growth-feedback-subtab" className="gba:flex-1">
            <div className="gba:flex gba:items-center gba:gap-2 gba:justify-center">
              <ChatCircleIcon />
              <span>{t('hr-growth-feedback')}</span>
            </div>
          </TabsTrigger>
          {(permissionsLoading ||
            employeeRecordAllHrBackoffice.loading ||
            employeeGrowthPermission.loading ||
            hasPerformancePermission) && (
            <TabsTrigger
              value="performance"
              data-testid="hr-growth-performance-subtab"
              className="gba:flex-1"
              disabled={permissionsLoading || employeeRecordAllHrBackoffice.loading || employeeGrowthPermission.loading}
            >
              <div className="gba:flex gba:items-center gba:gap-2 gba:justify-center">
                <ChartBarIcon />
                <span>{t('hr-growth-performance')}</span>
              </div>
            </TabsTrigger>
          )}
          {devFeatureFlag && (
            <TabsTrigger
              value="performanceEvaluation"
              data-testid="hr-growth-performance-evaluation-subtab"
              className="gba:flex-1"
            >
              <div className="gba:flex gba:items-center gba:gap-2 gba:justify-center">
                <ChartBarIcon />
                <span>{t('employee-record-tab-performance-evaluation')}</span>
              </div>
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="skills" data-testid="hr-growth-skills-content" className="gba:mt-4">
          {devFeatureFlag ? (
            <SkillsTab employee={employee} accessToken={accessToken} employeeId={employeeId} userInfo={userInfo} />
          ) : (
            <SkillsTabOld employee={employee} accessToken={accessToken} employeeId={employeeId} userInfo={userInfo} />
          )}
        </TabsContent>

        <TabsContent value="feedback" data-testid="hr-growth-feedback-content" className="gba:mt-4">
          <FeedbackTab
            employee={employee}
            accessToken={accessToken}
            employeeId={employeeId}
            userInfo={userInfo}
            employeeFeedback={feedback}
            isSelfView={isSelfView}
            canViewAiInsights={
              isSelfView || hasManagerEmployeeGrowthPermission || employeeRecordAllHrBackoffice?.hasPermission === true
            }
            canRequestFeedbackOnBehalf={
              !isSelfView &&
              (hasManagerEmployeeGrowthPermission || employeeRecordAllHrBackoffice?.hasPermission === true)
            }
          />
        </TabsContent>

        {hasPerformancePermission && (
          <TabsContent value="performance" data-testid="hr-growth-performance-content" className="gba:mt-4">
            <PerformanceTab
              employee={employee}
              accessToken={accessToken}
              employeeId={employeeId}
              userInfo={userInfo}
              employeePerformanceGoals={employeePerformanceGoals}
              canDeleteGoals={
                hasManagerEmployeeGrowthPermission || employeeRecordAllHrBackoffice?.hasPermission === true
              }
            />
          </TabsContent>
        )}

        {devFeatureFlag && (
          <TabsContent
            value="performanceEvaluation"
            data-testid="hr-growth-performance-evaluation-content"
            className="gba:mt-4"
          >
            <PerformanceEvaluationTab employee={employee} accessToken={accessToken} employeeId={employeeId} />
          </TabsContent>
        )}
      </Tabs>
    </div>
  )
}

export default HrGrowthTab
