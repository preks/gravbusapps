'use client'

import React, { useState, useEffect } from 'react'
import { Tabs, TabsList, TabsTrigger, TabsContent, useTranslation, useLocale } from '@newwork/nw-design-system'
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
import translations from '../../_i18n'

interface HrGrowthTabProps extends BusinessAppContextProps {
  employee: Employee
  employeeId: string
  isSelfView: boolean
  feedbackTabFeatureFlag: boolean
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
  feedbackTabFeatureFlag,
  employeePerformanceGoals,
  feedback,
  additionalData
}) => {
  const [activeSubView, setActiveSubView] = useState<HrGrowthSubView>(getInitialHrGrowthSubView())
  const { t } = useTranslation(translations)
  const { locale: currentLocale } = useLocale()

  // Lazy load compensation data only when compensation tabs are active
  const shouldLoadCompensationData = activeSubView === 'currentCompensation' || activeSubView === 'compensationHistory'

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

  useEffect(() => {
    if (typeof window === 'undefined') return

    if (!feedbackTabFeatureFlag && activeSubView === 'feedback') {
      setActiveSubView('skills')
    }
  }, [feedbackTabFeatureFlag, activeSubView])

  useEffect(() => {
    if (typeof window === 'undefined') return

    const searchParams = new URLSearchParams(window.location.search)
    searchParams.set('tab', 'hrGrowth')
    searchParams.set('subView', activeSubView)

    const currentUserEmployeeId = userInfo?.employeeDetails?.employeeId || ''
    if (employeeId && employeeId !== currentUserEmployeeId) {
      searchParams.set('employeeId', employeeId)
    } else {
      searchParams.delete('employeeId')
      searchParams.delete('id')
    }

    const newUrl = `${window.location.pathname}?${searchParams.toString()}`
    window.history.replaceState({}, '', newUrl)
  }, [activeSubView, employeeId, userInfo])

  useEffect(() => {
    const handlePopState = () => {
      const newSubView = getInitialHrGrowthSubView()
      setActiveSubView(newSubView)
    }

    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [])

  const handleSubViewChange = (value: string) => {
    setActiveSubView(value as HrGrowthSubView)
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
          {feedbackTabFeatureFlag && (
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
          <TabsTrigger
            value="currentCompensation"
            data-testid="hr-growth-current-compensation-subtab"
            className="gba:flex-1"
          >
            <div className="gba:flex gba:items-center gba:gap-2 gba:justify-center">
              <PiCurrencyEur />
              <span>{t('tab-current-compensation')}</span>
            </div>
          </TabsTrigger>
          <TabsTrigger
            value="compensationHistory"
            data-testid="hr-growth-compensation-history-subtab"
            className="gba:flex-1"
          >
            <div className="gba:flex gba:items-center gba:gap-2 gba:justify-center">
              <PiClockCounterClockwise />
              <span>{t('tab-compensation-history')}</span>
            </div>
          </TabsTrigger>
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

        {feedbackTabFeatureFlag && (
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

        <TabsContent
          value="currentCompensation"
          data-testid="hr-growth-current-compensation-content"
          className="gba:mt-4"
        >
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
          />
        </TabsContent>

        <TabsContent
          value="compensationHistory"
          data-testid="hr-growth-compensation-history-content"
          className="gba:mt-4"
        >
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
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default HrGrowthTab
