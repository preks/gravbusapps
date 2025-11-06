'use client'

import React, { useState, useEffect } from 'react'
import { useEmployeeData } from './hooks/useEmployeeData'
import { useEmployeePermissions } from './hooks/useEmployeePermissions'
import ProfileHeader from './components/ProfileHeader'
import { ScreenBody, Spinner, notification, Tabs } from '@newwork/gravity-ui-catalog'
import { ProfileLayout } from '@/components/layout/profileLayout'
import { useScopePermissionCheck } from '@/common/hooks/useScopePermissionCheck'
import { PiUser, PiBriefcase, PiChartBar, PiCalendar, PiClockCounterClockwise, PiReceipt } from 'react-icons/pi'

// Tab components
import SummaryTab from './components/tabs/SummaryTab'
import AbsencesTab from './components/tabs/AbsencesTab'
import ServiceRequestsTab from './components/tabs/ServiceRequestsTab'
import HrAdminTab from './components/tabs/HrAdminTab'
import HrGrowthTab from './components/tabs/HrGrowthTab'
import { BusinessAppContextProps } from '../../../../../common/BusinessAppContext'
import { getCurrentActiveStructureId, getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { useFeature } from '@/common/hooks/useFeature'
import TimeTrackingTab from './components/tabs/TimeTrackingTab'

/**
 * Employee Record Module
 * Displays detailed information about an employee
 */
// Define tab keys - keep outside of component to avoid recreating on each render
const TAB_KEYS = {
  summary: 'summary',
  timeTracking: 'timeTracking',
  absences: 'absences',
  hrAdmin: 'hrAdmin',
  hrGrowth: 'hrGrowth',
  serviceRequests: 'serviceRequests'
}

// Helper to read URL parameters
const getUrlParams = () => {
  if (typeof window === 'undefined') return { tab: null, employeeId: null, subView: null }
  const searchParams = new URLSearchParams(window.location.search)
  return {
    tab: searchParams.get('tab'),
    employeeId: searchParams.get('employeeId') ?? searchParams.get('id'),
    subView: searchParams.get('subView')
  }
}

// Handle loading UI
const LoadingUI = () => (
  <div className="gba:flex gba:justify-center gba:items-center gba:h-full">
    <Spinner size="small" />
  </div>
)

// Handle error UI
const ErrorUI = () => {
  // Show error notification
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

// Handle not found UI
const NotFoundUI = () => (
  <div className="gba:flex gba:justify-center gba:items-center gba:h-full gba:text-muted-foreground">
    <p className="gba:text-xl gba:font-medium">Not Found</p>
    <p>Employee not found.</p>
  </div>
)

/**
 * Displays detailed information about an employee.
 *
 * The component fetches the employee data using the `useEmployeeData` hook and displays the data in a tabbed interface.
 * The tabs are:
 * - Summary: displays the employee's basic information and a summary of their performance and absences.
 * - Details: displays the employee's detailed information.
 * - Employment: displays the employee's employment history.
 * - Documents: displays the employee's documents.
 * - Performance: displays the employee's performance feedback and goals.
 * - Absences: displays the employee's absences and entitlements.
 *
 * The component also handles loading and error states by displaying a spinner or an error message.
 *
 * @param {string} employeeId - the ID of the employee to display.
 */
/**
 * Employee Record Component Wrapper
 * This wrapper ensures proper handling of URL parameters and employee ID
 */
export const EmployeeRecord: React.FC<BusinessAppContextProps> = props => {
  // Get current URL parameters on each render
  const urlParams = getUrlParams()

  // Determine which employee to show
  const urlEmployeeId = urlParams.employeeId
  const currentUserEmployeeId = props.userInfo?.employeeDetails?.employeeId || ''

  // If URL has employeeId parameter, show that employee, otherwise show current user
  const employeeIdToShow = urlEmployeeId || currentUserEmployeeId

  // Get active tab from URL or use default
  // Handle legacy tab names: if URL has old tab names (details, employment, etc.), redirect to hrAdmin
  const getInitialTab = () => {
    if (!urlParams.tab) return TAB_KEYS.summary

    // Check if it's a valid new tab key
    if (Object.values(TAB_KEYS).includes(urlParams.tab)) {
      return urlParams.tab
    }

    // Legacy tab names that should map to hrAdmin
    const legacyHrAdminTabs = ['details', 'employment', 'documents', 'changeLog', 'hrNotes']
    if (legacyHrAdminTabs.includes(urlParams.tab)) {
      // Update URL to redirect to hrAdmin with correct subView
      if (typeof window !== 'undefined') {
        const searchParams = new URLSearchParams(window.location.search)
        searchParams.set('tab', TAB_KEYS.hrAdmin)
        // Map legacy tab names to subView values
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

    // Legacy tab names that should map to hrGrowth
    const legacyHrGrowthTabs = ['skills', 'feedback', 'performance']
    if (legacyHrGrowthTabs.includes(urlParams.tab)) {
      // Update URL to redirect to hrGrowth with correct subView
      if (typeof window !== 'undefined') {
        const searchParams = new URLSearchParams(window.location.search)
        searchParams.set('tab', TAB_KEYS.hrGrowth)
        // Map legacy tab names to subView values
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

    // Default to summary
    return TAB_KEYS.summary
  }

  const initialActiveTab = getInitialTab()

  // Render the actual employee record content
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

/**
 * The actual employee record implementation
 */
const EmployeeRecordContent: React.FC<EmployeeRecordContentProps> = ({
  accessToken,
  currentUserEmployeeId,
  employeeIdToShow,
  initialActiveTab,
  userInfo,
  additionalData
}) => {
  // Track active tab for the UI
  const [activeTab, setActiveTab] = useState(initialActiveTab)
  const activeStructureId = getCurrentActiveStructureId()
  const feedbackTabFeatureFlag = useFeature('dev.employee-record.feedback.enabled')
  const changeLogTabFeatureFlag = useFeature('dev.employee-record.changelog.enabled')
  const timeTrackingTabFeatureFlag = useFeature('dev.employee-record.timetracking.enabled')

  // Update URL when active tab changes
  useEffect(() => {
    if (typeof window === 'undefined') return

    const searchParams = new URLSearchParams(window.location.search)
    searchParams.set('tab', activeTab)

    // Clear subView when switching to a tab that doesn't support it
    if (activeTab !== TAB_KEYS.hrAdmin && activeTab !== TAB_KEYS.hrGrowth) {
      searchParams.delete('subView')
    }

    // Handle employee ID in URL
    if (employeeIdToShow && employeeIdToShow !== currentUserEmployeeId) {
      // Only add employeeId to URL if it's not the current user
      searchParams.set('employeeId', employeeIdToShow)
    } else {
      // If viewing own profile, remove employeeId from URL for cleaner URLs
      searchParams.delete('employeeId')
      searchParams.delete('id')
    }

    const newUrl = `${window.location.pathname}?${searchParams.toString()}`
    window.history.replaceState({}, '', newUrl)
  }, [activeTab, employeeIdToShow, currentUserEmployeeId])

  // Always fetch the employee data for the employee ID we want to show
  const { loading, error, employee, feedback, absenceEntitlements, performanceGoals, refetch } = useEmployeeData(
    accessToken,
    activeStructureId,
    employeeIdToShow // Use the determined employeeId directly
  )

  // Add event listener to refresh data after process completion (e.g., when using AppActionButtons)
  useEffect(() => {
    // Define the event handler
    const handleProcessCompletion = (event: Event) => {
      const customEvent = event as CustomEvent<{ resolution: 'success' | 'failure' }>
      const resolution = customEvent.detail.resolution
      if (resolution === 'success') {
        refetch()
      }
    }

    // Add event listener
    window.addEventListener('com.newwork.process.processCompletion', handleProcessCompletion)

    // Clean up the event listener when component unmounts
    return () => {
      window.removeEventListener('com.newwork.process.processCompletion', handleProcessCompletion)
    }
  }, [refetch])

  // Define tab content components
  const renderContent = () => {
    // Return appropriate UI based on data loading state
    if (loading) {
      return <LoadingUI />
    }

    if (error) {
      return <ErrorUI />
    }

    if (!employee) {
      return <NotFoundUI />
    }

    // We have employee data, render the main UI
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

  // Get employee permissions
  const { tabPermissions } = useEmployeePermissions(employeeIdToShow, accessToken)

  // Check scope permission for HR Notes tab
  const {
    hasPermission: hasNotesScopePermission,
    loading: scopePermissionLoading,
    error: scopePermissionError
  } = useScopePermissionCheck('/platform/employee-record', 'employee-record-notes', accessToken)

  const isSelfView: boolean = !!(currentUserEmployeeId && employeeIdToShow === currentUserEmployeeId)

  // Define tab items for the Tabs component
  const getTabItems = () => {
    // Ensure employee is not null before creating tab items
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
      ...(timeTrackingTabFeatureFlag
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
          // Calculate HR Notes access for passing to HrAdminTab
          // Same logic as used for determining HR Admin tab visibility
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
              changeLogTabFeatureFlag={changeLogTabFeatureFlag as boolean}
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
            feedbackTabFeatureFlag={feedbackTabFeatureFlag as boolean}
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
    // Filter tabs based on permissions
    return allTabs.filter(tab => {
      const tabKey = tab.key as string

      // If viewing own profile, show all tabs
      if (isSelfView) {
        return true
      }

      // If not viewing own profile, check permissions for specific tabs
      if (tabKey === TAB_KEYS.absences || tabKey === TAB_KEYS.serviceRequests || tabKey === TAB_KEYS.timeTracking) {
        // Check if user has permission to see this tab
        return tabPermissions?.[tabKey]?.hasAccess === true
      }

      // For HR Admin tab, check permissions for its subtabs
      if (tabKey === TAB_KEYS.hrAdmin) {
        // Check if user has permission to see any of the HR Admin subtabs
        // We'll show HR Admin tab if user has access to at least one of: employment, documents, changeLog, hrNotes
        const hasEmploymentAccess = tabPermissions?.['employment']?.hasAccess === true
        const hasDocumentsAccess = tabPermissions?.['documents']?.hasAccess === true
        const hasChangeLogAccess = changeLogTabFeatureFlag && tabPermissions?.['changeLog']?.hasAccess === true

        // For HR Notes, check scope permission
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

        // Details and Compensation are always visible (no permission check needed)
        // Show HR Admin tab if user has access to at least one restricted subtab, or if changeLog feature is enabled
        return (
          hasEmploymentAccess || hasDocumentsAccess || hasChangeLogAccess || hasHrNotesAccess || changeLogTabFeatureFlag
        )
      }

      // For HR Growth tab, check permissions for its subtabs
      if (tabKey === TAB_KEYS.hrGrowth) {
        // Check if user has permission to see any of the HR Growth subtabs
        // Skills and Performance are always visible (no permission check needed)
        // Feedback is visible if feature flag is enabled
        // Show HR Growth tab if user has access to at least one subtab or if feedback feature is enabled
        const hasSkillsAccess = tabPermissions?.['skills']?.hasAccess !== false // Default to true if not restricted
        const hasFeedbackAccess = feedbackTabFeatureFlag && tabPermissions?.['feedback']?.hasAccess === true
        const hasPerformanceAccess = tabPermissions?.['performance']?.hasAccess !== false // Default to true if not restricted

        return hasSkillsAccess || hasFeedbackAccess || hasPerformanceAccess || feedbackTabFeatureFlag
      }

      // Always show other tabs (summary, etc.)
      return true
    })
  }

  // Tab items for the Tabs component
  const tabItems = getTabItems()

  // Create tab navigation for the content header
  const tabNavigation = (
    <Tabs
      activeKey={activeTab}
      onChange={setActiveTab}
      items={tabItems.map(item => ({ key: item.key, label: item.label }))}
      className="gba:w-full"
      destroyOnHidden
    />
  )

  // Get the tab content based on the active tab
  const getTabContent = () => {
    const activeTabItem = tabItems.find(tab => tab.key === activeTab)
    return activeTabItem ? (
      <div className="gba:bg-primary-foreground gba:p-4 gba:rounded-md">{activeTabItem.children}</div>
    ) : null
  }

  // Return the current UI state
  return renderContent()
}

export default EmployeeRecord
