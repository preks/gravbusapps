'use client'

import React, { useState, useEffect } from 'react'
import { useEmployeeData } from './hooks/useEmployeeData'
import { useEmployeePermissions } from './hooks/useEmployeePermissions'
import ProfileHeader from './components/ProfileHeader'
import { ScreenBody, Spinner, notification, Tabs } from '@newwork/gravity-ui-catalog'
import { ProfileLayout } from '@/components/layout/profileLayout'
import {
  PiUser,
  PiIdentificationCard,
  PiBriefcase,
  PiCurrencyEur,
  PiFiles,
  PiChartBar,
  PiChatCircle,
  PiCalendar,
  PiGraduationCap,
  PiClockCounterClockwise,
  PiReceipt
} from 'react-icons/pi'

// Tab components
import SummaryTab from './components/tabs/SummaryTab'
import DetailsTab from './components/tabs/DetailsTab'
import EmploymentTab from './components/tabs/EmploymentTab'
import CompensationTab from './components/tabs/CompensationTab'
import DocumentsTab from './components/tabs/DocumentsTab'
import PerformanceTab from './components/tabs/PerformanceTab'
import FeedbackTab from './components/tabs/FeedbackTab'
import AbsencesTab from './components/tabs/AbsencesTab'
import SkillsTab from './components/tabs/SkillsTab'
import ChangeLogTab from './components/tabs/ChangeLogTab'
import ServiceRequestsTab from './components/tabs/ServiceRequestsTab'
import { BusinessAppContextProps } from '../../../../../common/BusinessAppContext'
import { getCurrentActiveStructureId } from '@/common/utils/windowUtils'
import { useFeature } from '@/common/hooks/useFeature'
import TimeTrackingTab from './components/tabs/TimeTrackingTab'

/**
 * Employee Record Module
 * Displays detailed information about an employee
 */
// Define tab keys - keep outside of component to avoid recreating on each render
const TAB_KEYS = {
  summary: 'summary',
  details: 'details',
  timeTracking: 'timeTracking',
  employment: 'employment',
  compensation: 'compensation',
  documents: 'documents',
  performance: 'performance',
  feedback: 'feedback',
  absences: 'absences',
  skills: 'skills',
  changeLog: 'changeLog',
  serviceRequests: 'serviceRequests'
}

// Helper to read URL parameters
const getUrlParams = () => {
  if (typeof window === 'undefined') return { tab: null, employeeId: null }
  const searchParams = new URLSearchParams(window.location.search)
  return {
    tab: searchParams.get('tab'),
    employeeId: searchParams.get('employeeId') ?? searchParams.get('id')
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
  const initialActiveTab =
    urlParams.tab && Object.values(TAB_KEYS).includes(urlParams.tab) ? urlParams.tab : TAB_KEYS.summary

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
            <span className="gba:inline-block gba:align-middle">Summary</span>
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
        key: TAB_KEYS.details,
        label: (
          <div className="gba:flex gba:items-center gba:gap-2">
            <PiIdentificationCard className="gba:text-xl gba:inline-block gba:align-middle" />
            <span className="gba:inline-block gba:align-middle">Details</span>
          </div>
        ),
        children: (
          <DetailsTab
            employee={employee}
            accessToken={accessToken}
            employeeId={employeeIdToShow}
            userInfo={userInfo}
            isSelfView={isSelfView}
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
                  <span className="gba:inline-block gba:align-middle">Time Tracking</span>
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
        key: TAB_KEYS.employment,
        label: (
          <div className="gba:flex gba:items-center gba:gap-2">
            <PiBriefcase className="gba:text-xl gba:inline-block gba:align-middle" />
            <span className="gba:inline-block gba:align-middle">Employment</span>
          </div>
        ),
        children: (
          <EmploymentTab
            employee={employee}
            accessToken={accessToken}
            employeeId={employeeIdToShow}
            userInfo={userInfo}
            isSelfView={isSelfView}
          />
        )
      },
      {
        key: TAB_KEYS.compensation,
        label: (
          <div className="gba:flex gba:items-center gba:gap-2">
            <PiCurrencyEur className="gba:text-xl gba:inline-block gba:align-middle" />
            <span className="gba:inline-block gba:align-middle">Compensation</span>
          </div>
        ),
        children: (
          <CompensationTab
            employee={employee}
            accessToken={accessToken}
            employeeId={employeeIdToShow}
            userInfo={userInfo}
            isSelfView={isSelfView}
          />
        )
      },
      {
        key: TAB_KEYS.documents,
        label: (
          <div className="gba:flex gba:items-center gba:gap-2">
            <PiFiles className="gba:text-xl gba:inline-block gba:align-middle" />
            <span className="gba:inline-block gba:align-middle">Documents</span>
          </div>
        ),
        children: (
          <DocumentsTab
            employee={employee}
            accessToken={accessToken}
            employeeId={employeeIdToShow}
            userInfo={userInfo}
            isSelfView={isSelfView}
          />
        )
      },
      {
        key: TAB_KEYS.performance,
        label: (
          <div className="gba:flex gba:items-center gba:gap-2">
            <PiChartBar className="gba:text-xl gba:inline-block gba:align-middle" />
            <span className="gba:inline-block gba:align-middle">Performance</span>
          </div>
        ),
        children: (
          <PerformanceTab
            employee={employee}
            accessToken={accessToken}
            employeeId={employeeIdToShow}
            userInfo={userInfo}
            isSelfView={isSelfView}
            employeePerformanceGoals={performanceGoals ?? []}
          />
        )
      },
      {
        key: TAB_KEYS.absences,
        label: (
          <div className="gba:flex gba:items-center gba:gap-2">
            <PiCalendar className="gba:text-xl gba:inline-block gba:align-middle" />
            <span className="gba:inline-block gba:align-middle">Absences</span>
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
        key: TAB_KEYS.skills,
        label: (
          <div className="gba:flex gba:items-center gba:gap-2">
            <PiGraduationCap className="gba:text-xl gba:inline-block gba:align-middle" />
            <span className="gba:inline-block gba:align-middle">Skills</span>
          </div>
        ),
        children: (
          <SkillsTab
            employee={employee}
            accessToken={accessToken}
            employeeId={employeeIdToShow}
            userInfo={userInfo}
            isSelfView={isSelfView}
          />
        )
      },
      ...(feedbackTabFeatureFlag
        ? [
            {
              key: TAB_KEYS.feedback,
              label: (
                <div className="gba:flex gba:items-center gba:gap-2">
                  <PiChatCircle className="gba:text-xl gba:inline-block gba:align-middle" />
                  <span className="gba:inline-block gba:align-middle">Feedback</span>
                </div>
              ),
              children: (
                <FeedbackTab
                  employee={employee}
                  accessToken={accessToken}
                  employeeId={employeeIdToShow}
                  userInfo={userInfo}
                  isSelfView={isSelfView}
                  employeeFeedback={feedback ?? []}
                />
              )
            }
          ]
        : []),
      ...(changeLogTabFeatureFlag
        ? [
            {
              key: TAB_KEYS.changeLog,
              label: (
                <div className="gba:flex gba:items-center gba:gap-2">
                  <PiClockCounterClockwise className="gba:text-xl gba:inline-block gba:align-middle" />
                  <span className="gba:inline-block gba:align-middle">Change Log</span>
                </div>
              ),
              children: (
                <ChangeLogTab
                  employeeId={employeeIdToShow}
                  employeeName={employee?.displayName || 'Employee'}
                  userRole={'employee'}
                  accessToken={accessToken}
                  userInfo={userInfo}
                  additionalData={additionalData}
                />
              )
            }
          ]
        : []),
      {
        key: TAB_KEYS.serviceRequests,
        label: (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <PiReceipt style={{ fontSize: '20px', display: 'inline-block', verticalAlign: 'middle' }} />
            <span style={{ display: 'inline-block', verticalAlign: 'middle' }}>Service Requests</span>
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
    // ONLY when not viewing own profile
    return allTabs.filter(tab => {
      const tabKey = tab.key as string

      // If viewing own profile, always show all tabs
      if (isSelfView) {
        return true
      }

      // If not viewing own profile and tab is employment, compensation, documents, absences, changeLog, or serviceRequests, check permissions
      if (
        tabKey === TAB_KEYS.employment ||
        tabKey === TAB_KEYS.compensation ||
        tabKey === TAB_KEYS.documents ||
        tabKey === TAB_KEYS.absences ||
        tabKey === TAB_KEYS.changeLog ||
        tabKey === TAB_KEYS.serviceRequests ||
        tabKey === TAB_KEYS.timeTracking
      ) {
        // Check if user has permission to see this tab
        return tabPermissions?.[tabKey]?.hasAccess === true
      }

      // Always show other tabs
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
      destroyInactiveTabPane
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
