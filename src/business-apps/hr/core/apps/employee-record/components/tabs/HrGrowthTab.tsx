'use client'

import React, { useState, useEffect } from 'react'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@newwork/nw-design-system'
import { PiGraduationCap, PiChartBar, PiChatCircle } from 'react-icons/pi'
import SkillsTab from './SkillsTab'
import PerformanceTab from './PerformanceTab'
import FeedbackTab from './FeedbackTab'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { Employee, EmployeePerformanceGoal, EmployeeFeedback } from '../../hooks/useEmployeeData'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'

interface HrGrowthTabProps extends BusinessAppContextProps {
  employee: Employee
  employeeId: string
  isSelfView: boolean
  feedbackTabFeatureFlag: boolean
  employeePerformanceGoals?: EmployeePerformanceGoal[]
  feedback?: EmployeeFeedback[]
}

const HR_GROWTH_SUBVIEW_VALUES = ['skills', 'feedback', 'performance'] as const
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
  feedback
}) => {
  const [activeSubView, setActiveSubView] = useState<HrGrowthSubView>(getInitialHrGrowthSubView())

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
      </Tabs>
    </div>
  )
}

export default HrGrowthTab
