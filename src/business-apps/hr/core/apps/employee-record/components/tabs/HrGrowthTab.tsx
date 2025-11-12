'use client'

import React, { useState, useEffect, useCallback } from 'react'
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  useTranslation,
  useLocale,
  Skeleton,
  Card,
  CardHeader,
  CardContent
} from '@newwork/nw-design-system'
import { PiGraduationCap, PiChartBar, PiChatCircle, PiCurrencyEur, PiClockCounterClockwise } from 'react-icons/pi'
import SkillsTab from './SkillsTab'
import PerformanceTab from './PerformanceTab'
import FeedbackTab from './FeedbackTab'
import CurrentCompensationView from './compensation/views/CurrentCompensationView'
import PayHistoryView from './compensation/views/PayHistoryView'
import { useCompensationData } from './compensation/hooks/useCompensationData'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { Employee, EmployeePerformanceGoal, EmployeeFeedback } from '../../hooks/useEmployeeData'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { useEmployeePermissions, TAB_KEYS } from '../../hooks/useEmployeePermissions'
import translations from '../../_i18n'

interface HrGrowthTabProps extends BusinessAppContextProps {
  employee: Employee
  employeeId: string
  isSelfView: boolean
  devFeatureFlag: boolean
  employeePerformanceGoals?: EmployeePerformanceGoal[]
  feedback?: EmployeeFeedback[]
}

const HR_GROWTH_SUBVIEW_VALUES = [
  'skills',
  'feedback',
  'performance',
  'currentCompensation',
  'compensationHistory'
] as const
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
  additionalData
}) => {
  const [activeSubView, setActiveSubView] = useState<HrGrowthSubView>(getInitialHrGrowthSubView())
  const { t } = useTranslation(translations)
  const { locale: currentLocale } = useLocale()

  // Check permissions for compensation data access
  const { tabPermissions, loading: permissionsLoading } = useEmployeePermissions(employeeId, accessToken)
  const compensationPermission = tabPermissions?.[TAB_KEYS.compensation]?.hasAccess

  // Determine if user has compensation permission (only when permissions are loaded)
  const hasCompensationPermission = permissionsLoading ? false : compensationPermission === true || isSelfView
  // Show compensation tabs only when dev feature flag is enabled and user has permission (or during loading to prevent layout shift)
  const shouldShowCompensationTabs = devFeatureFlag && (permissionsLoading || hasCompensationPermission)
  const shouldLoadCompensationData =
    devFeatureFlag &&
    !permissionsLoading &&
    hasCompensationPermission &&
    (activeSubView === 'currentCompensation' || activeSubView === 'compensationHistory')

  const {
    loading: compensationLoading,
    error: compensationError,
    compensationData,
    historyData,
    refetch: refetchCompensation
  } = useCompensationData(
    shouldLoadCompensationData ? employeeId : '',
    shouldLoadCompensationData ? accessToken : '',
    currentLocale
  )

  // Update URL when subView changes
  const updateUrl = useCallback(
    (subView: HrGrowthSubView) => {
      if (typeof window === 'undefined') return

      const searchParams = new URLSearchParams(window.location.search)
      searchParams.set('tab', 'hrGrowth')
      searchParams.set('subView', subView)

      const currentUserEmployeeId = userInfo?.employeeDetails?.employeeId || ''
      if (employeeId && employeeId !== currentUserEmployeeId) {
        searchParams.set('employeeId', employeeId)
      } else {
        searchParams.delete('employeeId')
        searchParams.delete('id')
      }

      const newUrl = `${window.location.pathname}?${searchParams.toString()}`
      window.history.replaceState({}, '', newUrl)
    },
    [employeeId, userInfo?.employeeDetails?.employeeId]
  )

  useEffect(() => {
    if (typeof window === 'undefined') return

    if (!devFeatureFlag && activeSubView === 'feedback') {
      const newSubView = 'skills'
      setActiveSubView(newSubView)
      updateUrl(newSubView)
    }

    // Redirect compensation tabs to skills if dev feature flag is disabled or user doesn't have permission
    if (
      (!devFeatureFlag || (!permissionsLoading && !hasCompensationPermission)) &&
      (activeSubView === 'currentCompensation' || activeSubView === 'compensationHistory')
    ) {
      const newSubView = 'skills'
      setActiveSubView(newSubView)
      updateUrl(newSubView)
    }
  }, [devFeatureFlag, activeSubView, permissionsLoading, hasCompensationPermission, updateUrl])

  // Ensure URL is properly set on initial load
  // Intentionally empty dependency array - this should only run once on mount
  useEffect(() => {
    if (typeof window === 'undefined') return
    const urlParams = new URLSearchParams(window.location.search)
    if (!urlParams.has('tab') || urlParams.get('tab') !== 'hrGrowth') {
      updateUrl(activeSubView)
    }
  }, [])

  // Listen for browser back/forward navigation
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
    // Update URL with new subView when tab changes
    updateUrl(newSubView)
  }

  return (
    <div data-testid="hr-growth-tab-container" className="gba:w-full">
      <Tabs value={activeSubView} onValueChange={handleSubViewChange} className="gba:w-full">
        <TabsList className="gba:mb-4 gba:w-full" data-testid="hr-growth-tabs-list">
          <TabsTrigger value="skills" data-testid="hr-growth-skills-subtab" className="gba:flex-1">
            <div className="gba:flex gba:items-center gba:gap-2 gba:justify-center">
              <PiGraduationCap />
              <span>
                {getTranslationFromI18nKeyAndLabel(
                  'lowcoder:employee_profile.summary_layout.skills_section.skills_title',
                  'Skills'
                )}
              </span>
            </div>
          </TabsTrigger>
          {devFeatureFlag && (
            <TabsTrigger value="feedback" data-testid="hr-growth-feedback-subtab" className="gba:flex-1">
              <div className="gba:flex gba:items-center gba:gap-2 gba:justify-center">
                <PiChatCircle />
                <span>
                  {getTranslationFromI18nKeyAndLabel(
                    'lowcoder:employee_profile.summary_layout.skills_section.feedback_generic_module_title',
                    'Feedback'
                  )}
                </span>
              </div>
            </TabsTrigger>
          )}
          <TabsTrigger value="performance" data-testid="hr-growth-performance-subtab" className="gba:flex-1">
            <div className="gba:flex gba:items-center gba:gap-2 gba:justify-center">
              <PiChartBar />
              <span>
                {getTranslationFromI18nKeyAndLabel(
                  'lowcoder:absence_management_hub_backoffice.performance',
                  'Performance'
                )}
              </span>
            </div>
          </TabsTrigger>
          {shouldShowCompensationTabs && (
            <TabsTrigger
              value="currentCompensation"
              data-testid="hr-growth-current-compensation-subtab"
              className="gba:flex-1"
              disabled={permissionsLoading}
            >
              <div className="gba:flex gba:items-center gba:gap-2 gba:justify-center">
                <PiCurrencyEur />
                <span>{t('tab-current-compensation')}</span>
              </div>
            </TabsTrigger>
          )}
          {shouldShowCompensationTabs && (
            <TabsTrigger
              value="compensationHistory"
              data-testid="hr-growth-compensation-history-subtab"
              className="gba:flex-1"
              disabled={permissionsLoading}
            >
              <div className="gba:flex gba:items-center gba:gap-2 gba:justify-center">
                <PiClockCounterClockwise />
                <span>{t('tab-compensation-history')}</span>
              </div>
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="skills" data-testid="hr-growth-skills-content" className="gba:mt-4">
          <SkillsTab
            employee={employee}
            accessToken={accessToken}
            employeeId={employeeId}
            userInfo={userInfo}
            isSelfView={isSelfView}
          />
        </TabsContent>

        {devFeatureFlag && (
          <TabsContent value="feedback" data-testid="hr-growth-feedback-content" className="gba:mt-4">
            <FeedbackTab
              employee={employee}
              accessToken={accessToken}
              employeeId={employeeId}
              userInfo={userInfo}
              employeeFeedback={feedback}
              isSelfView={isSelfView}
            />
          </TabsContent>
        )}

        <TabsContent value="performance" data-testid="hr-growth-performance-content" className="gba:mt-4">
          <PerformanceTab
            employee={employee}
            accessToken={accessToken}
            employeeId={employeeId}
            userInfo={userInfo}
            employeePerformanceGoals={employeePerformanceGoals}
            isSelfView={isSelfView}
          />
        </TabsContent>

        {shouldShowCompensationTabs && (
          <TabsContent
            value="currentCompensation"
            data-testid="hr-growth-current-compensation-content"
            className="gba:mt-4"
          >
            {permissionsLoading ? (
              <div className="gba:space-y-6" data-testid="current-compensation-permissions-loading">
                <Card>
                  <CardHeader>
                    <Skeleton className="gba:h-6 gba:w-48" />
                  </CardHeader>
                  <CardContent className="gba:space-y-4">
                    <Skeleton className="gba:h-32 gba:w-full" />
                    <div className="gba:space-y-2">
                      <Skeleton className="gba:h-4 gba:w-full" />
                      <Skeleton className="gba:h-4 gba:w-3/4" />
                      <Skeleton className="gba:h-4 gba:w-1/2" />
                    </div>
                    <div className="gba:grid gba:grid-cols-2 gba:gap-4">
                      <Skeleton className="gba:h-24 gba:w-full" />
                      <Skeleton className="gba:h-24 gba:w-full" />
                    </div>
                  </CardContent>
                </Card>
              </div>
            ) : (
              <CurrentCompensationView
                t={t}
                compensationData={compensationData}
                loading={compensationLoading}
                error={compensationError}
                onRetry={refetchCompensation}
                employeeId={employeeId}
                accessToken={accessToken}
                userInfo={userInfo}
                additionalData={additionalData}
                locale={currentLocale}
                isSelfView={isSelfView}
              />
            )}
          </TabsContent>
        )}

        {shouldShowCompensationTabs && (
          <TabsContent
            value="compensationHistory"
            data-testid="hr-growth-compensation-history-content"
            className="gba:mt-4"
          >
            {permissionsLoading ? (
              <div className="gba:space-y-6" data-testid="compensation-history-permissions-loading">
                <Card>
                  <CardHeader>
                    <Skeleton className="gba:h-6 gba:w-48" />
                  </CardHeader>
                  <CardContent>
                    <div className="gba:text-center gba:text-muted-foreground gba:py-8">
                      {t('loading-compensation-history')}
                    </div>
                  </CardContent>
                </Card>
              </div>
            ) : (
              <PayHistoryView
                t={t}
                historyData={historyData}
                loading={compensationLoading}
                error={compensationError}
                onRetry={refetchCompensation}
                locale={currentLocale}
                accessToken={accessToken}
                userInfo={userInfo}
                additionalData={additionalData}
              />
            )}
          </TabsContent>
        )}
      </Tabs>
    </div>
  )
}

export default HrGrowthTab
