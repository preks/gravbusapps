'use client'

import React, { useState, useEffect } from 'react'
import { useEmployeeData } from './hooks/useEmployeeData'
import { useEmployeePermissions } from './hooks/useEmployeePermissions'
import { useCompensationPermissions } from './components/tabs/compensation/hooks/useCompensationPermissions'
import ProfileHeader from './components/ProfileHeader'
import { ScreenBody, Spinner, notification, Tabs } from '@newwork/gravity-ui-catalog'
import { ProfileLayout } from '@/components/layout/profileLayout'
import { useScopePermissionCheck } from '@/common/hooks/useScopePermissionCheck'
import {
  PiUser,
  PiBriefcase,
  PiChartBar,
  PiCalendar,
  PiClockCounterClockwise,
  PiReceipt,
  PiPackage,
  PiCurrencyEur
} from 'react-icons/pi'
import SummaryTab from './components/tabs/SummaryTab'
import AbsencesTab from './components/tabs/AbsencesTab'
import ServiceRequestsTab from './components/tabs/ServiceRequestsTab'
import HrAdminTab from './components/tabs/HrAdminTab'
import HrGrowthTab from './components/tabs/HrGrowthTab'
import CompensationTab from './components/tabs/CompensationTab'
import AssetsTab from './components/tabs/AssetsTab'
import { BusinessAppContextProps } from '../../../../../common/BusinessAppContext'
import { getCurrentActiveStructureId, getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { useFeature } from '@/common/hooks/useFeature'
import TimeTrackingTab from './components/tabs/TimeTrackingTab'
import { Feature } from '@/common/types/constants/FeatureHub'

const TAB_KEYS = {
  summary: 'summary',
  timeTracking: 'timeTracking',
  assets: 'assets',
  absences: 'absences',
  hrAdmin: 'hrAdmin',
  hrGrowth: 'hrGrowth',
  compensation: 'compensation',
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
      message: getTranslationFromI18nKeyAndLabel('lowcoder:employee_profile.error.title', 'Error'),
      description: getTranslationFromI18nKeyAndLabel(
        'lowcoder:employee_profile.error.loading_data',
        'Error loading employee data.'
      ),
      placement: 'bottomRight'
    })
  }, [])

  return (
    <div className="gba:flex gba:justify-center gba:items-center gba:h-full gba:text-destructive">
      <p className="gba:text-xl gba:font-medium">
        {getTranslationFromI18nKeyAndLabel('lowcoder:employee_profile.error.title', 'Error')}
      </p>
      <p>
        {getTranslationFromI18nKeyAndLabel(
          'lowcoder:employee_profile.error.loading_data',
          'Error loading employee data.'
        )}
      </p>
    </div>
  )
}

const NotFoundUI = () => (
  <div className="gba:flex gba:justify-center gba:items-center gba:h-full gba:text-muted-foreground">
    <p className="gba:text-xl gba:font-medium">
      {getTranslationFromI18nKeyAndLabel('lowcoder:employee_profile.not_found.title', 'Not Found')}
    </p>
    <p>{getTranslationFromI18nKeyAndLabel('lowcoder:employee_profile.not_found.message', 'Employee not found.')}</p>
  </div>
)

export const EmployeeRecord: React.FC<BusinessAppContextProps> = props => {
  const urlParams = getUrlParams()
  const urlEmployeeId = urlParams.employeeId
  const currentUserEmployeeId = props.userInfo?.employeeDetails?.employeeId || ''
  const employeeIdToShow = urlEmployeeId || currentUserEmployeeId

  const updateUrlWithSubView = (targetTab: string, subView: string) => {
    if (typeof window !== 'undefined') {
      const searchParams = new URLSearchParams(window.location.search)
      searchParams.set('tab', targetTab)
      searchParams.set('subView', subView)
      const newUrl = `${window.location.pathname}?${searchParams.toString()}`
      window.history.replaceState({}, '', newUrl)
    }
  }

  const getInitialTab = () => {
    if (!urlParams.tab) return TAB_KEYS.summary

    if (Object.values(TAB_KEYS).includes(urlParams.tab)) {
      return urlParams.tab
    }

    const tabMappings: Record<string, { targetTab: string; subViewMap: Record<string, string> }> = {
      hrAdmin: {
        targetTab: TAB_KEYS.hrAdmin,
        subViewMap: {
          details: 'details',
          employment: 'employment',
          documents: 'documents',
          changeLog: 'changeLog',
          hrNotes: 'hrNotes'
        }
      },
      hrGrowth: {
        targetTab: TAB_KEYS.hrGrowth,
        subViewMap: {
          skills: 'skills',
          feedback: 'feedback',
          performance: 'performance'
        }
      },
      compensation: {
        targetTab: TAB_KEYS.compensation,
        subViewMap: {
          currentCompensation: 'currentCompensation',
          compensationHistory: 'compensationHistory'
        }
      }
    }

    for (const [, config] of Object.entries(tabMappings)) {
      if (urlParams.tab in config.subViewMap) {
        updateUrlWithSubView(config.targetTab, config.subViewMap[urlParams.tab])
        return config.targetTab
      }
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
  const servicesFeatureFlag = useFeature('services.enabled')

  useEffect(() => {
    if (typeof window === 'undefined') return

    const searchParams = new URLSearchParams(window.location.search)
    searchParams.set('tab', activeTab)

    if (activeTab !== TAB_KEYS.hrAdmin && activeTab !== TAB_KEYS.hrGrowth && activeTab !== TAB_KEYS.compensation) {
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
            headerContent={<ProfileHeader accessToken={accessToken} employee={employee} isSelfView={isSelfView} />}
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
  const employeeRecordHrBackoffice = useScopePermissionCheck(
    '/platform/employee-record',
    'employee-record-hr-backoffice',
    accessToken
  )

  const employeeRecordAllHrBackoffice = useScopePermissionCheck(
    '/platform/employee-record',
    'employee-record-all-hr-backoffice',
    accessToken
  )

  const employeeRecordAllItAdmin = useScopePermissionCheck(
    '/platform/employee-record',
    'employee-record-all-IT-admin',
    accessToken
  )

  const employeeRecordAllEmployees = useScopePermissionCheck(
    '/platform/employee-record',
    'employee-record-all-employees',
    accessToken
  )

  const employeeGrowthPermission = useScopePermissionCheck('/platform/employee-record', 'employee-growth', accessToken)

  const isSelfView: boolean = !!(currentUserEmployeeId && employeeIdToShow === currentUserEmployeeId)

  const supervisorEmployeeId = employee?.employeePosition?.supervisorEmployeeId
  const supervisorIdFromRelation = employee?.employeePosition?.supervisor?.id
  const employeeSupervisorId = supervisorEmployeeId || supervisorIdFromRelation

  const isManager = !!(
    employee &&
    employeeSupervisorId &&
    currentUserEmployeeId &&
    employeeSupervisorId === currentUserEmployeeId
  )

  const isManagerWithPermissionButNotDirect = !!(
    !isManager &&
    !employeeGrowthPermission.loading &&
    employeeGrowthPermission.hasPermission === true
  )

  const isDirectManagerWithPermission = !!(
    isManager &&
    !employeeGrowthPermission.loading &&
    employeeGrowthPermission.hasPermission === true
  )

  // Centralized compensation permissions
  const compensationPermissions = useCompensationPermissions({
    isSelfView,
    isManager,
    hasEmployeeGrowthPermission: !employeeGrowthPermission.loading && employeeGrowthPermission.hasPermission === true,
    hasEmployeeRecordAllHrBackoffice: employeeRecordAllHrBackoffice?.hasPermission === true
  })

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
          if (isDirectManagerWithPermission) {
            hasHrNotesAccess = true
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
              scopePermissionLoading={scopePermissionLoading || employeeRecordHrBackoffice.loading}
              employeeRecordHrBackoffice={employeeRecordHrBackoffice}
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
            devFeatureFlag={devFeatureFlag as boolean}
            employeePerformanceGoals={performanceGoals}
            feedback={feedback}
          />
        )
      },
      ...(devFeatureFlag
        ? [
            {
              key: TAB_KEYS.compensation,
              label: (
                <div className="gba:flex gba:items-center gba:gap-2">
                  <PiCurrencyEur className="gba:text-xl gba:inline-block gba:align-middle" />
                  <span className="gba:inline-block gba:align-middle">
                    {getTranslationFromI18nKeyAndLabel(
                      'lowcoder:human_resources_page.analytics_section.compensation_tab_label',
                      'Compensation'
                    )}
                  </span>
                </div>
              ),
              children: (
                <CompensationTab
                  employee={employee}
                  employeeId={employeeIdToShow}
                  accessToken={accessToken}
                  userInfo={userInfo}
                  isSelfView={isSelfView}
                  devFeatureFlag={devFeatureFlag as boolean}
                  employeeRecordHrBackoffice={employeeRecordHrBackoffice}
                  additionalData={additionalData}
                />
              )
            }
          ]
        : []),
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
                  userId={userInfo?.id || ''}
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
      ...(devFeatureFlag
        ? [
            {
              key: TAB_KEYS.assets,
              label: (
                <div className="gba:flex gba:items-center gba:gap-2">
                  <PiPackage className="gba:text-xl gba:inline-block gba:align-middle" />
                  <span className="gba:inline-block gba:align-middle">
                    {getTranslationFromI18nKeyAndLabel('lowcoder:hr_assets.assets_tab', 'Assets')}
                  </span>
                </div>
              ),
              children: (
                <AssetsTab
                  employee={employee}
                  accessToken={accessToken}
                  employeeId={employeeIdToShow}
                  isSelfView={isSelfView}
                />
              )
            }
          ]
        : []),
      ...(servicesFeatureFlag
        ? [
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
        : [])
    ]
    return allTabs.filter(tab => {
      const tabKey = tab.key as string

      if (isSelfView) {
        return true
      }

      if (tabKey === TAB_KEYS.absences) {
        const visible =
          isSelfView || isDirectManagerWithPermission || employeeRecordAllHrBackoffice?.hasPermission === true
        return visible
      }

      if (tabKey === TAB_KEYS.serviceRequests) {
        return isSelfView
      }

      if (tabKey === TAB_KEYS.timeTracking) {
        const visible =
          isSelfView || isDirectManagerWithPermission || employeeRecordAllHrBackoffice?.hasPermission === true
        return visible
      }

      if (tabKey === TAB_KEYS.compensation) {
        return compensationPermissions.canViewCompensationTab
      }

      if (tabKey === TAB_KEYS.hrAdmin) {
        const visible =
          isSelfView || isDirectManagerWithPermission || employeeRecordAllHrBackoffice?.hasPermission === true
        return visible
      }

      if (tabKey === TAB_KEYS.summary) {
        const visible =
          isSelfView ||
          isDirectManagerWithPermission ||
          tabPermissions?.[tabKey]?.hasAccess === true ||
          employeeRecordAllEmployees?.hasPermission === true ||
          isManagerWithPermissionButNotDirect
        return visible
      }

      if (tabKey === TAB_KEYS.hrGrowth) {
        const hasSkillsAccess =
          isDirectManagerWithPermission ||
          tabPermissions?.['skills']?.hasAccess !== false ||
          employeeRecordAllEmployees?.hasPermission === true ||
          isManagerWithPermissionButNotDirect
        const hasFeedbackAccess =
          isDirectManagerWithPermission ||
          (devFeatureFlag && tabPermissions?.['feedback']?.hasAccess === true) ||
          employeeRecordAllEmployees?.hasPermission === true ||
          isManagerWithPermissionButNotDirect
        const hasPerformanceAccess =
          isSelfView || isDirectManagerWithPermission || employeeRecordAllHrBackoffice?.hasPermission === true
        const visible =
          employeeRecordAllEmployees?.hasPermission === true ||
          hasSkillsAccess ||
          hasFeedbackAccess ||
          hasPerformanceAccess ||
          devFeatureFlag
        return visible
      }

      if (tabKey === TAB_KEYS.assets) {
        const visible = isSelfView || isDirectManagerWithPermission || employeeRecordAllItAdmin?.hasPermission === true
        return visible
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
