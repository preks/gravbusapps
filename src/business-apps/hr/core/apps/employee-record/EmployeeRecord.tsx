'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { useEmployeeData } from './hooks/useEmployeeData'
import { useSilentRefetchOnProcessCompletion } from './hooks/useSilentRefetchOnProcessCompletion'
import { useEmployeePermissions } from './hooks/useEmployeePermissions'
import { useCompensationPermissions } from './components/tabs/compensation/hooks/useCompensationPermissions'
import ProfileHeader, { ProfileHeaderActions } from './components/ProfileHeader'
import {
  RecordLayout,
  Avatar,
  AvatarImage,
  AvatarFallback,
  Spinner,
  toast,
  useTranslation
} from '@newwork/nw-design-system'
import { useScopePermissionCheck } from '@/common/hooks/useScopePermissionCheck'
import {
  CameraIcon,
  UserIcon,
  BriefcaseIcon,
  ChartBarIcon,
  CalendarIcon,
  ClockCounterClockwiseIcon,
  ReceiptIcon,
  PackageIcon,
  CurrencyEurIcon
} from '@phosphor-icons/react'
import { AppAction } from '@/components/app-action/AppAction'
import { FlowContextName } from '@/common/types/FlowRegistryTypes'
import { postToPlatform } from '@/common/utils/postToPlatform'
import { useEmployeeWorkCommunications } from './hooks/useEmployeeWorkCommunications'
import SummaryTab from './components/tabs/SummaryTab'
import ServiceRequestsTab from './components/tabs/ServiceRequestsTab'
import HrAdminTab from './components/tabs/HrAdminTab'
import HrGrowthTab from './components/tabs/HrGrowthTab'
import CompensationTab from './components/tabs/CompensationTab'
import AssetsTab from './components/tabs/AssetsTab'
import { BusinessAppContextProps } from '../../../../../common/BusinessAppContext'
import { getCurrentActiveStructureId } from '@/common/utils/windowUtils'
import translations from './_i18n'
import { getEmployeeFullName } from './utils/formatters'
import { useFeature } from '@/common/hooks/useFeature'
import TimeTrackingTab from './components/tabs/TimeTrackingTab'
import { Feature } from '@/common/types/constants/FeatureHub'
import PersonalAbsences from '@/business-apps/hr/absences/apps/personal-absences'

const EMPLOYEE_RECORD_RESOURCE_URL = '/platform/employee-record'
const DEFAULT_ICON_SIZE = 20
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
  const searchParams = new URLSearchParams(globalThis.location.search)
  return {
    tab: searchParams.get('tab'),
    employeeId: searchParams.get('employeeId') ?? searchParams.get('id'),
    subView: searchParams.get('subView')
  }
}

const LoadingUI = () => (
  <div className="gba:flex gba:justify-center gba:items-center gba:h-full">
    <Spinner />
  </div>
)

interface ErrorUIProps {
  title: string
  message: string
}

const ErrorUI: React.FC<ErrorUIProps> = ({ title, message }) => {
  React.useEffect(() => {
    toast.error(message)
  }, [message])

  return (
    <div className="gba:flex gba:justify-center gba:items-center gba:h-full gba:text-destructive">
      <p className="gba:text-xl gba:font-medium">{title}</p>
      <p>{message}</p>
    </div>
  )
}

interface NotFoundUIProps {
  title: string
  message: string
}

const NotFoundUI: React.FC<NotFoundUIProps> = ({ title, message }) => (
  <div className="gba:flex gba:justify-center gba:items-center gba:h-full gba:text-muted-foreground">
    <p className="gba:text-xl gba:font-medium">{title}</p>
    <p>{message}</p>
  </div>
)

export const EmployeeRecord: React.FC<BusinessAppContextProps> = props => {
  const urlParams = getUrlParams()
  const urlEmployeeId = urlParams.employeeId
  const currentUserEmployeeId = props.userInfo?.employeeDetails?.employeeId || ''
  const employeeIdToShow = urlEmployeeId || currentUserEmployeeId

  const updateUrlWithSubView = (targetTab: string, subView: string) => {
    if (typeof window !== 'undefined') {
      const searchParams = new URLSearchParams(globalThis.location.search)
      searchParams.set('tab', targetTab)
      searchParams.set('subView', subView)
      const newUrl = `${globalThis.location.pathname}?${searchParams.toString()}`
      globalThis.history.replaceState({}, '', newUrl)
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
          performance: 'performance',
          performanceEvaluation: 'performanceEvaluation'
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
  const { t } = useTranslation(translations)
  const [activeTab, setActiveTab] = useState(initialActiveTab)
  const activeStructureId = getCurrentActiveStructureId() || ''
  const devFeatureFlag = useFeature(Feature.Dev.Enabled.Key)
  const assetsFeatureFlag = useFeature(Feature.HCM.Assets.Key)
  const changeLogFeatureFlag = useFeature('dev.employee-record.changelog.enabled')
  const servicesFeatureFlag = useFeature('services.enabled')
  const attendanceFeatureFlag = useFeature('human-resources.attendance.enabled')
  const compensationFeatureFlagRaw = useFeature<boolean>(Feature.HCM.Compensation.Key)
  const hrDevelopmentFeatureFlag = useFeature<boolean>(Feature.HCM.HRDevelopment.Key)

  // Handle undefined as true (enabled by default until FeatureHub loads)
  const compensationFeatureFlag = compensationFeatureFlagRaw !== false

  useEffect(() => {
    if (typeof window === 'undefined') return

    const searchParams = new URLSearchParams(globalThis.location.search)
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

    const newUrl = `${globalThis.location.pathname}?${searchParams.toString()}`
    globalThis.history.replaceState({}, '', newUrl)
  }, [activeTab, employeeIdToShow, currentUserEmployeeId])

  const { loading, error, employee, feedback, performanceGoals, silentRefetch } = useEmployeeData(
    accessToken,
    activeStructureId,
    employeeIdToShow
  )

  useSilentRefetchOnProcessCompletion(silentRefetch)

  // Use the hook to fetch employee work communications
  const { employee: employeeWithComms, loading: commsLoading } = useEmployeeWorkCommunications({
    accessToken,
    employeeId: employeeIdToShow || ''
  })

  const handleChat = useCallback(() => {
    if (!employee?.userId) return
    const userName = getEmployeeFullName(employee)
    postToPlatform({ type: 'OPEN_CHAT_WITH_USER', payload: { userId: employee.userId, userName } })
  }, [employee])

  const handleAudioCall = useCallback(() => {
    if (!employee?.userId) return
    const displayName = getEmployeeFullName(employee)
    postToPlatform({
      type: 'START_CALL_WITH_USER',
      payload: {
        userId: employee.userId,
        displayName,
        avatarUrl: employee.pictureThumbnail,
        callType: 'audio'
      }
    })
  }, [employee])

  const handleVideoCall = useCallback(() => {
    if (!employee?.userId) return
    const displayName = getEmployeeFullName(employee)
    postToPlatform({
      type: 'START_CALL_WITH_USER',
      payload: {
        userId: employee.userId,
        displayName,
        avatarUrl: employee.pictureThumbnail,
        callType: 'video'
      }
    })
  }, [employee])

  const renderContent = () => {
    if (loading) {
      return <LoadingUI />
    }

    if (error) {
      return <ErrorUI title={t('employee-record-error-title')} message={t('employee-record-error-loading-data')} />
    }

    if (!employee) {
      return (
        <NotFoundUI title={t('employee-record-not-found-title')} message={t('employee-record-not-found-message')} />
      )
    }

    const chatActions = (
      <ProfileHeaderActions
        commsLoading={commsLoading}
        isSelfView={isSelfView}
        onChat={handleChat}
        onAudioCall={handleAudioCall}
        onVideoCall={handleVideoCall}
      />
    )

    // AppAction Button
    const actionButton = (
      <AppAction
        variant="header"
        data-testid="employee-actions-button"
        contexts={[
          {
            context: FlowContextName.employeeEntity,
            contextData: {
              employeeId: employee?.id,
              managerId: employee?.employeePosition?.supervisor?.id,
              organizationalUnitId: employee?.employeePosition?.organizationalUnitId
            }
          }
        ]}
        shareContext={{
          entityType: 'employee',
          entityId: employee?.id || '',
          entityName: getEmployeeFullName(employee),
          entityUrl: `/platform/hr/employee-record?employeeId=${employee?.id}`
        }}
        prefixDataTestId="employee-actions"
        accessToken={accessToken}
      />
    )

    return (
      <RecordLayout
        headerOrientation="vertical"
        headerActions={chatActions}
        headerActionButton={actionButton}
        className="gba:w-full"
        headerAvatar={
          <div className="gba:relative gba:group gba:w-[144px] gba:h-[144px]">
            <Avatar size="2xl" className="gba:!w-[144px] gba:!h-[144px]">
              {employee.pictureThumbnail ? (
                <AvatarImage
                  src={`data:image/gif;base64,${employee.pictureThumbnail}`}
                  alt={`${employee.firstName} ${employee.lastName}`}
                />
              ) : null}
              <AvatarFallback className="gba:text-5xl">{`${employee.firstName?.[0] || ''}${employee.lastName?.[0] || ''}`}</AvatarFallback>
            </Avatar>
            <AppAction
              mode="trigger"
              data-testid="employee-profile-picture-edit-button"
              contexts={[
                { context: FlowContextName.employeeProfilePicture, contextData: { employeeId: employee?.id } }
              ]}
              prefixDataTestId="employee-profile-picture-edit"
              autoExecute={true}
              accessToken={accessToken}
              emptyState="hide"
              className="gba:absolute gba:inset-0 gba:rounded-full gba:flex gba:items-center gba:justify-center gba:opacity-0 gba:bg-black/60 gba:text-white gba:group-hover:opacity-100 gba:transition-opacity gba:transition-duration-200 gba:transition-ease-in-out gba:cursor-pointer"
            >
              <div className="gba:flex gba:flex-col gba:items-center gba:gap-1 gba:px-2">
                <CameraIcon className="gba:h-6 gba:w-6" size={24} />
                <span className="gba:text-[11px] gba:font-semibold gba:uppercase gba:text-center gba:leading-tight">
                  {t('employee-record-edit-picture')}
                </span>
              </div>
            </AppAction>
          </div>
        }
        headerTitle={getEmployeeFullName(employee)}
        headerSubtitle={employee.employeePosition?.jobPosition?.name ?? t('employee-record-not-assigned')}
        headerSlotMain={
          <ProfileHeader
            accessToken={accessToken}
            employee={employee}
            userInfo={userInfo}
            employeeEmail={employeeWithComms?.email}
            employeePhone={employeeWithComms?.phone}
          />
        }
        views={tabItems}
        defaultView={activeTab}
        onViewChange={setActiveTab}
      />
    )
  }

  const { tabPermissions } = useEmployeePermissions(employeeIdToShow, accessToken)

  const {
    hasPermission: hasNotesScopePermission,
    loading: scopePermissionLoading,
    error: scopePermissionError
  } = useScopePermissionCheck(EMPLOYEE_RECORD_RESOURCE_URL, 'employee-record-notes', accessToken)
  const employeeRecordHrBackoffice = useScopePermissionCheck(
    EMPLOYEE_RECORD_RESOURCE_URL,
    'employee-record-hr-backoffice',
    accessToken
  )

  const employeeRecordAllHrBackoffice = useScopePermissionCheck(
    EMPLOYEE_RECORD_RESOURCE_URL,
    'employee-record-all-hr-backoffice',
    accessToken
  )

  const employeeRecordAllItAdmin = useScopePermissionCheck(
    EMPLOYEE_RECORD_RESOURCE_URL,
    'employee-record-all-IT-admin',
    accessToken
  )

  const employeeRecordAllEmployees = useScopePermissionCheck(
    EMPLOYEE_RECORD_RESOURCE_URL,
    'employee-record-all-employees',
    accessToken
  )

  const employeeGrowthPermission = useScopePermissionCheck(EMPLOYEE_RECORD_RESOURCE_URL, 'employee-growth', accessToken)

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
  // SECURITY: Only managers with employee-growth OR HR with employee-record-all-hr-backoffice can access
  // employee-record-all-employees is NOT used for compensation (it's for basic profile access only)
  const compensationPermissions = useCompensationPermissions({
    isSelfView,
    isManager,
    hasEmployeeGrowthPermission: !employeeGrowthPermission.loading && employeeGrowthPermission.hasPermission === true,
    hasEmployeeRecordAllHrBackoffice:
      !employeeRecordAllHrBackoffice.loading && employeeRecordAllHrBackoffice?.hasPermission === true
  })

  const getTabItems = () => {
    if (!employee) return []

    const allTabs = [
      {
        value: TAB_KEYS.summary,
        label: t('employee-record-tab-summary'),
        icon: <UserIcon className="gba:mr-2" size={DEFAULT_ICON_SIZE} />,
        content: (
          <div className="gba:col-span-full">
            <SummaryTab employee={employee} accessToken={accessToken} currentUserEmployeeId={currentUserEmployeeId} />
          </div>
        )
      },
      {
        value: TAB_KEYS.hrAdmin,
        label: t('employee-record-tab-hr-admin'),
        icon: <BriefcaseIcon className="gba:mr-2" size={DEFAULT_ICON_SIZE} />,
        content: (() => {
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
            <div className="gba:col-span-full">
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
            </div>
          )
        })()
      },
      ...(hrDevelopmentFeatureFlag
        ? [
            {
              value: TAB_KEYS.hrGrowth,
              label: t('employee-record-tab-hr-growth'),
              icon: <ChartBarIcon className="gba:mr-2" size={DEFAULT_ICON_SIZE} />,
              content: (
                <div className="gba:col-span-full">
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
                </div>
              )
            }
          ]
        : []),
      ...(compensationFeatureFlag
        ? [
            {
              value: TAB_KEYS.compensation,
              label: t('employee-record-tab-compensation'),
              icon: <CurrencyEurIcon className="gba:mr-2" size={DEFAULT_ICON_SIZE} />,
              content: (
                <div className="gba:col-span-full">
                  <CompensationTab
                    employeeId={employeeIdToShow}
                    accessToken={accessToken}
                    userInfo={userInfo}
                    compensationFeatureFlag={compensationFeatureFlag as boolean}
                    employeeRecordHrBackoffice={employeeRecordHrBackoffice}
                    additionalData={additionalData}
                    employeeGrowthPermission={employeeGrowthPermission}
                    employeeRecordAllHrBackoffice={employeeRecordAllHrBackoffice}
                    compensationPermissions={compensationPermissions}
                  />
                </div>
              )
            }
          ]
        : []),
      ...(attendanceFeatureFlag
        ? [
            {
              value: TAB_KEYS.timeTracking,
              label: t('employee-record-tab-time-tracking'),
              icon: <ClockCounterClockwiseIcon className="gba:mr-2" size={DEFAULT_ICON_SIZE} />,
              content: (
                <div className="gba:col-span-full">
                  <TimeTrackingTab
                    employee={employee}
                    accessToken={accessToken}
                    employeeId={employeeIdToShow}
                    userId={userInfo?.id || ''}
                    isSelfView={isSelfView}
                  />
                </div>
              )
            }
          ]
        : []),
      {
        value: TAB_KEYS.absences,
        label: t('employee-record-tab-absences'),
        icon: <CalendarIcon className="gba:mr-2" size={DEFAULT_ICON_SIZE} />,
        content: (
          <div className="gba:col-span-full">
            <PersonalAbsences accessToken={accessToken} userInfo={userInfo} employeeIdOverride={employee.id} embedded />
          </div>
        )
      },
      ...(assetsFeatureFlag
        ? [
            {
              value: TAB_KEYS.assets,
              label: t('employee-record-tab-assets'),
              icon: <PackageIcon className="gba:mr-2" size={DEFAULT_ICON_SIZE} />,
              content: (
                <div className="gba:col-span-full">
                  <AssetsTab
                    employee={employee}
                    accessToken={accessToken}
                    employeeId={employeeIdToShow}
                    isSelfView={isSelfView}
                  />
                </div>
              )
            }
          ]
        : []),
      ...(servicesFeatureFlag
        ? [
            {
              value: TAB_KEYS.serviceRequests,
              label: t('employee-record-tab-service-requests'),
              icon: <ReceiptIcon className="gba:mr-2" size={DEFAULT_ICON_SIZE} />,
              content: (
                <div className="gba:col-span-full">
                  <ServiceRequestsTab
                    employee={employee}
                    accessToken={accessToken}
                    employeeId={employeeIdToShow}
                    userInfo={userInfo}
                    isSelfView={isSelfView}
                  />
                </div>
              )
            }
          ]
        : [])
    ]
    return allTabs.filter(tab => {
      const tabKey = tab.value

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
          tabPermissions?.['feedback']?.hasAccess === true ||
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

    const activeTabExists = tabItems.some(tab => tab.value === activeTab)

    if (!activeTabExists) {
      const firstVisibleTab = tabItems[0]?.value || TAB_KEYS.summary
      setActiveTab(firstVisibleTab)
    }
  }, [tabItems, activeTab])

  return renderContent()
}

export default EmployeeRecord
