'use client'

import React, { useState, useEffect } from 'react'
import { useEmployeeData } from './hooks/useEmployeeData'
import { useEmployeePermissions } from './hooks/useEmployeePermissions'
import ProfileHeader from './components/ProfileHeader'
import { ScreenBody, Spinner, notification, Tabs } from '@newwork/gravity-ui-catalog'
import { ProfileLayout } from '@/components/layout/profileLayout'
import { useScopePermissionCheck } from '@/common/hooks/useScopePermissionCheck'
import { PiUser, PiBriefcase, PiChartBar, PiCalendar, PiClockCounterClockwise, PiReceipt } from 'react-icons/pi'
import SummaryTab from './components/tabs/SummaryTab'
import AbsencesTab from './components/tabs/AbsencesTab'
import ServiceRequestsTab from './components/tabs/ServiceRequestsTab'
import HrAdminTab from './components/tabs/HrAdminTab'
import HrGrowthTab from './components/tabs/HrGrowthTab'
import { BusinessAppContextProps } from '../../../../../common/BusinessAppContext'
import { getCurrentActiveStructureId, getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { useFeature } from '@/common/hooks/useFeature'
import TimeTrackingTab from './components/tabs/TimeTrackingTab'
import { Feature } from '@/common/types/constants/FeatureHub'

const TAB_KEYS = {
  summary: 'summary',
  timeTracking: 'timeTracking',
  absences: 'absences',
  hrAdmin: 'hrAdmin',
  hrGrowth: 'hrGrowth',
  serviceRequests: 'serviceRequests'
}

const getUrlParams = () => {
  if (typeof window === 'undefined') return { tab: null, employeeId: null, subView: null }
  const searchParams = new URLSearchParams(window.location.search)
  return {
    tab: searchParams.get('tab'),
    employeeId: searchParams.get('employeeId') ?? searchParams.get('id'),
    subView: searchParams.get('subView')
  }
}

const LoadingUI = () => (
  <div className="gba:flex gba:justify-center gba:items-center gba:h-full">
    <Spinner size="small" />
  </div>
)

const ErrorUI = () => {
  React.useEffect(() => {
    notification.error({
      message: 'Error',
      description: 'Error loading employee data.',
      placement: 'bottomRight'
    })
  }, [])

  return (
    <div className="gba:flex gba:justify-center gba:items-center gba:h-full gba:text-destructive">
      <p className="gba:text-xl gba:font-medium">Error</p>
      <p>Error loading employee data.</p>
    </div>
  )
}

const NotFoundUI = () => (
  <div className="gba:flex gba:justify-center gba:items-center gba:h-full gba:text-muted-foreground">
    <p className="gba:text-xl gba:font-medium">Not Found</p>
    <p>Employee not found.</p>
  </div>
)

export const EmployeeRecord: React.FC<BusinessAppContextProps> = props => {
  const urlParams = getUrlParams()

  const urlEmployeeId = urlParams.employeeId
  const currentUserEmployeeId = props.userInfo?.employeeDetails?.employeeId || ''

  const employeeIdToShow = urlEmployeeId || currentUserEmployeeId

  const getInitialTab = () => {
    if (!urlParams.tab) return TAB_KEYS.summary

    if (Object.values(TAB_KEYS).includes(urlParams.tab)) {
      return urlParams.tab
    }

    const legacyHrAdminTabs = ['details', 'employment', 'documents', 'changeLog', 'hrNotes']
    if (legacyHrAdminTabs.includes(urlParams.tab)) {
      if (typeof window !== 'undefined') {
        const searchParams = new URLSearchParams(window.location.search)
        searchParams.set('tab', TAB_KEYS.hrAdmin)
        const subViewMap: Record<string, string> = {
          details: 'details',
          employment: 'employment',
          documents: 'documents',
          changeLog: 'changeLog',
          hrNotes: 'hrNotes'
        }
        if (subViewMap[urlParams.tab]) {
          searchParams.set('subView', subViewMap[urlParams.tab])
        }
        const newUrl = `${window.location.pathname}?${searchParams.toString()}`
        window.history.replaceState({}, '', newUrl)
      }
      return TAB_KEYS.hrAdmin
    }

    const legacyHrGrowthTabs = ['skills', 'feedback', 'performance']
    if (legacyHrGrowthTabs.includes(urlParams.tab)) {
      if (typeof window !== 'undefined') {
        const searchParams = new URLSearchParams(window.location.search)
        searchParams.set('tab', TAB_KEYS.hrGrowth)
        const subViewMap: Record<string, string> = {
          skills: 'skills',
          feedback: 'feedback',
          performance: 'performance'
        }
        if (subViewMap[urlParams.tab]) {
          searchParams.set('subView', subViewMap[urlParams.tab])
        }
        const newUrl = `${window.location.pathname}?${searchParams.toString()}`
        window.history.replaceState({}, '', newUrl)
      }
      return TAB_KEYS.hrGrowth
    }

    return TAB_KEYS.summary
  }

  const initialActiveTab = getInitialTab()

  return (
    <EmployeeRecordContent
      {...props}
      urlEmployeeId={urlEmployeeId}
      currentUserEmployeeId={currentUserEmployeeId}
      employeeIdToShow={employeeIdToShow}
      initialActiveTab={initialActiveTab}
    />
  )
}

interface EmployeeRecordContentProps extends BusinessAppContextProps {
  urlEmployeeId: string | null
  currentUserEmployeeId: string
  employeeIdToShow: string
  initialActiveTab: string
}

const EmployeeRecordContent: React.FC<EmployeeRecordContentProps> = ({
  accessToken,
  currentUserEmployeeId,
  employeeIdToShow,
  initialActiveTab,
  userInfo,
  additionalData
}) => {
  const [activeTab, setActiveTab] = useState(initialActiveTab)
  const activeStructureId = getCurrentActiveStructureId()
  const devFeatureFlag = useFeature(Feature.Dev.Enabled.Key)
  const changeLogFeatureFlag = useFeature('dev.employee-record.changelog.enabled')

  useEffect(() => {
    if (typeof window === 'undefined') return

    const searchParams = new URLSearchParams(window.location.search)
    searchParams.set('tab', activeTab)

    if (activeTab !== TAB_KEYS.hrAdmin && activeTab !== TAB_KEYS.hrGrowth) {
      searchParams.delete('subView')
    }

    if (employeeIdToShow && employeeIdToShow !== currentUserEmployeeId) {
      searchParams.set('employeeId', employeeIdToShow)
    } else {
      searchParams.delete('employeeId')
      searchParams.delete('id')
    }

    const newUrl = `${window.location.pathname}?${searchParams.toString()}`
    window.history.replaceState({}, '', newUrl)
  }, [activeTab, employeeIdToShow, currentUserEmployeeId])

  const { loading, error, employee, feedback, absenceEntitlements, performanceGoals, refetch } = useEmployeeData(
    accessToken,
    activeStructureId,
    employeeIdToShow
  )

  useEffect(() => {
    const handleProcessCompletion = (event: Event) => {
      const customEvent = event as CustomEvent<{ resolution: 'success' | 'failure' }>
      const resolution = customEvent.detail.resolution
      if (resolution === 'success') {
        refetch()
      }
    }

    window.addEventListener('com.newwork.process.processCompletion', handleProcessCompletion)

    return () => {
      window.removeEventListener('com.newwork.process.processCompletion', handleProcessCompletion)
    }
  }, [refetch])

  const renderContent = () => {
    if (loading) {
      return <LoadingUI />
    }

    if (error) {
      return <ErrorUI />
    }

    if (!employee) {
      return <NotFoundUI />
    }

    return (
      <div className="gba:employee-profile gba:w-full gba:h-full">
        <ScreenBody className="gba:h-full gba:w-full">
          <ProfileLayout
            headerContent={<ProfileHeader accessToken={accessToken} employee={employee} />}
            contentHeader={tabNavigation}
            contentContainer={getTabContent()}
            headerPlacement="left"
            className="gba:w-full gba:max-w-full gba:mx-auto gba:px-4"
          />
        </ScreenBody>
      </div>
    )
  }

  const { tabPermissions } = useEmployeePermissions(employeeIdToShow, accessToken)

  const {
    hasPermission: hasNotesScopePermission,
    loading: scopePermissionLoading,
    error: scopePermissionError
  } = useScopePermissionCheck('/platform/employee-record', 'employee-record-notes', accessToken)
  const absencesScopeCheck = useScopePermissionCheck(
    '/platform/employee-record',
    'employee-record-absences',
    accessToken
  )
  const isSelfView: boolean = !!(currentUserEmployeeId && employeeIdToShow === currentUserEmployeeId)

  const getTabItems = () => {
    if (!employee) return []

    const allTabs = [
      {
        key: TAB_KEYS.summary,
        label: (
          <div className="gba:flex gba:items-center gba:gap-2">
            <PiUser className="gba:text-xl gba:inline-block gba:align-middle" />
            <span className="gba:inline-block gba:align-middle">
              {getTranslationFromI18nKeyAndLabel('lowcoder:employee_profile.employee_tabs.summary', 'Summary')}
            </span>
          </div>
        ),
        children: (
          <SummaryTab
            employee={employee}
            employeeAbsenceEntitlement={absenceEntitlements ?? []}
            accessToken={accessToken}
            currentUserEmployeeId={currentUserEmployeeId}
            userInfo={userInfo}
          />
        )
      },
      ...(devFeatureFlag
        ? [
            {
              key: TAB_KEYS.timeTracking,
              label: (
                <div className="gba:flex gba:items-center gba:gap-2">
                  <PiClockCounterClockwise className="gba:text-xl gba:inline-block gba:align-middle" />
                  <span className="gba:inline-block gba:align-middle">
                    {getTranslationFromI18nKeyAndLabel('lowcoder:time_tracking.title', 'Time Tracking')}
                  </span>
                </div>
              ),
              children: (
                <TimeTrackingTab
                  employee={employee}
                  accessToken={accessToken}
                  employeeId={employeeIdToShow}
                  userInfo={userInfo}
                  isSelfView={isSelfView}
                />
              )
            }
          ]
        : []),
      {
        key: TAB_KEYS.absences,
        label: (
          <div className="gba:flex gba:items-center gba:gap-2">
            <PiCalendar className="gba:text-xl gba:inline-block gba:align-middle" />
            <span className="gba:inline-block gba:align-middle">
              {getTranslationFromI18nKeyAndLabel('lowcoder:absence_table.title', 'Absences')}
            </span>
          </div>
        ),
        children: (
          <AbsencesTab
            employee={employee}
            employeeAbsenceEntitlement={absenceEntitlements ?? []}
            accessToken={accessToken}
            employeeId={employeeIdToShow}
            userInfo={userInfo}
            isSelfView={isSelfView}
          />
        )
      },
      {
        key: TAB_KEYS.hrAdmin,
        label: (
          <div className="gba:flex gba:items-center gba:gap-2">
            <PiBriefcase className="gba:text-xl gba:inline-block gba:align-middle" />
            <span className="gba:inline-block gba:align-middle">
              {getTranslationFromI18nKeyAndLabel('lowcoder:employee_profile.employee_tabs.hr_admin', 'HR Admin')}
            </span>
          </div>
        ),
        children: (() => {
          let hasHrNotesAccess = false
          if (!scopePermissionLoading && !isSelfView) {
            const hasRegularPermission = tabPermissions?.['hrNotes']?.hasAccess === true
            const hasScope = hasNotesScopePermission === true
            if (scopePermissionError && hasRegularPermission) {
              hasHrNotesAccess = true
            } else {
              hasHrNotesAccess = hasRegularPermission && hasScope
            }
          }

          return (
            <HrAdminTab
              employee={employee}
              employeeId={employeeIdToShow}
              accessToken={accessToken}
              userInfo={userInfo}
              isSelfView={isSelfView}
              changeLogTabFeatureFlag={changeLogFeatureFlag as boolean}
              hasHrNotesAccess={hasHrNotesAccess}
              scopePermissionLoading={scopePermissionLoading}
              additionalData={additionalData}
            />
          )
        })()
      },
      {
        key: TAB_KEYS.hrGrowth,
        label: (
          <div className="gba:flex gba:items-center gba:gap-2">
            <PiChartBar className="gba:text-xl gba:inline-block gba:align-middle" />
            <span className="gba:inline-block gba:align-middle">
              {getTranslationFromI18nKeyAndLabel('lowcoder:employee_profile.employee_tabs.hr_growth', 'HR Growth')}
            </span>
          </div>
        ),
        children: (
          <HrGrowthTab
            employee={employee}
            employeeId={employeeIdToShow}
            accessToken={accessToken}
            userInfo={userInfo}
            isSelfView={isSelfView}
            feedbackTabFeatureFlag={devFeatureFlag as boolean}
            employeePerformanceGoals={performanceGoals}
            feedback={feedback}
            additionalData={additionalData}
          />
        )
      },
      {
        key: TAB_KEYS.serviceRequests,
        label: (
          <div className="gba:flex gba:items-center gba:gap-2">
            <PiReceipt className="gba:text-xl gba:inline-block gba:align-middle" />
            <span className="gba:inline-block gba:align-middle">
              {getTranslationFromI18nKeyAndLabel(
                'lowcoder:employee_profile.employee_tabs.service_requests',
                'Service Requests'
              )}
            </span>
          </div>
        ),
        children: (
          <ServiceRequestsTab
            employee={employee}
            accessToken={accessToken}
            employeeId={employeeIdToShow}
            userInfo={userInfo}
            isSelfView={isSelfView}
          />
        )
      }
    ]
    return allTabs.filter(tab => {
      const tabKey = tab.key as string

      if (isSelfView) {
        return true
      }

      if (tabKey === TAB_KEYS.absences) {
        return tabPermissions?.[tabKey]?.hasAccess === true || absencesScopeCheck?.hasPermission === true
      }

      if (tabKey === TAB_KEYS.serviceRequests || tabKey === TAB_KEYS.timeTracking) {
        return tabPermissions?.[tabKey]?.hasAccess === true
      }

      if (tabKey === TAB_KEYS.hrAdmin) {
        const hasEmploymentAccess = tabPermissions?.['employment']?.hasAccess === true
        const hasDocumentsAccess = tabPermissions?.['documents']?.hasAccess === true
        const hasChangeLogAccess = devFeatureFlag && tabPermissions?.['changeLog']?.hasAccess === true

        let hasHrNotesAccess = false
        if (!scopePermissionLoading) {
          const hasRegularPermission = tabPermissions?.['hrNotes']?.hasAccess === true
          const hasScope = hasNotesScopePermission === true
          if (scopePermissionError && hasRegularPermission) {
            hasHrNotesAccess = true
          } else {
            hasHrNotesAccess = hasRegularPermission && hasScope
          }
        }

        return hasEmploymentAccess || hasDocumentsAccess || hasChangeLogAccess || hasHrNotesAccess || devFeatureFlag
      }

      if (tabKey === TAB_KEYS.hrGrowth) {
        const hasSkillsAccess = tabPermissions?.['skills']?.hasAccess !== false
        const hasFeedbackAccess = devFeatureFlag && tabPermissions?.['feedback']?.hasAccess === true
        const hasPerformanceAccess = tabPermissions?.['performance']?.hasAccess !== false

        return hasSkillsAccess || hasFeedbackAccess || hasPerformanceAccess || devFeatureFlag
      }

      return true
    })
  }

  const tabItems = getTabItems()

  useEffect(() => {
    if (tabItems.length === 0) return

    const activeTabExists = tabItems.some(tab => tab.key === activeTab)

    if (!activeTabExists) {
      const firstVisibleTab = tabItems[0]?.key || TAB_KEYS.summary
      setActiveTab(firstVisibleTab)
    }
  }, [tabItems, activeTab])

  const tabNavigation = (
    <Tabs
      activeKey={activeTab}
      onChange={setActiveTab}
      items={tabItems.map(item => ({ key: item.key, label: item.label }))}
      className="gba:w-full"
      destroyOnHidden
    />
  )

  const getTabContent = () => {
    const activeTabItem = tabItems.find(tab => tab.key === activeTab)
    return activeTabItem ? (
      <div className="gba:bg-primary-foreground gba:p-4 gba:rounded-md">{activeTabItem.children}</div>
    ) : null
  }

  return renderContent()
}

export default EmployeeRecord
