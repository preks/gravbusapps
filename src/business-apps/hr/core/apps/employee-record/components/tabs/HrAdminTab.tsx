'use client'

import React, { useState, useEffect } from 'react'
import { Tabs, TabsList, TabsTrigger, TabsContent, Spinner, useTranslation } from '@newwork/nw-design-system'
import {
  IdentificationCardIcon,
  BriefcaseIcon,
  FilesIcon,
  ClockCounterClockwiseIcon,
  NotebookIcon
} from '@phosphor-icons/react'
import DetailsTab from './DetailsTab'
import EmploymentTab from './EmploymentTab'
import ChangeLogTab from './ChangeLogTab'
import DocumentsTab from './DocumentsTab'
import HrNotesTab from './HrNotesTab'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { Employee } from '../../hooks/useEmployeeData'
import { ScopePermissionCheckResult, useScopePermissionCheck } from '@/common/hooks/useScopePermissionCheck'
import { useEmployeePermissions } from '../../hooks/useEmployeePermissions'
import translations from '../../_i18n'

interface HrAdminTabProps extends BusinessAppContextProps {
  employee: Employee
  employeeId: string
  isSelfView: boolean
  changeLogTabFeatureFlag: boolean
  hasHrNotesAccess: boolean
  scopePermissionLoading: boolean
  employeeRecordHrBackoffice: ScopePermissionCheckResult
}

const HR_ADMIN_SUBVIEW_VALUES = ['details', 'employment', 'documents', 'changeLog', 'hrNotes'] as const
type HrAdminSubView = (typeof HR_ADMIN_SUBVIEW_VALUES)[number]

interface HrAdminSubViewAccess {
  readonly details: boolean
  readonly employment: boolean
  readonly documents: boolean
  readonly changeLog: boolean
  readonly hrNotes: boolean
}

interface HrAdminPermissionState extends HrAdminSubViewAccess {
  readonly canDeleteDocuments: boolean
}

interface ResolveHrAdminPermissionsOptions {
  readonly permissionsLoading: boolean
  readonly employeeGrowthPermissionLoading: boolean
  readonly hasManagerEmployeeGrowthPermission: boolean
  readonly employeeRecordAllHrBackofficeLoading: boolean
  readonly employeeRecordAllHrBackofficeAccess?: boolean
  readonly employeeRecordHrBackofficeLoading: boolean
  readonly employeeRecordHrBackofficeAccess?: boolean
  readonly isSelfView: boolean
  readonly changeLogTabFeatureFlag: boolean
  readonly hasHrNotesAccess: boolean
  readonly scopePermissionLoading: boolean
}

function resolveHrAdminPermissions({
  permissionsLoading,
  employeeGrowthPermissionLoading,
  hasManagerEmployeeGrowthPermission,
  employeeRecordAllHrBackofficeLoading,
  employeeRecordAllHrBackofficeAccess,
  employeeRecordHrBackofficeLoading,
  employeeRecordHrBackofficeAccess,
  isSelfView,
  changeLogTabFeatureFlag,
  hasHrNotesAccess,
  scopePermissionLoading
}: ResolveHrAdminPermissionsOptions): HrAdminPermissionState {
  const hasBasePermissionChecksLoading =
    permissionsLoading || employeeGrowthPermissionLoading || employeeRecordAllHrBackofficeLoading
  const hasEmployeeAccess =
    isSelfView || hasManagerEmployeeGrowthPermission || employeeRecordAllHrBackofficeAccess === true

  return {
    details: !hasBasePermissionChecksLoading && hasEmployeeAccess,
    employment: !hasBasePermissionChecksLoading && hasEmployeeAccess,
    documents: !hasBasePermissionChecksLoading && hasEmployeeAccess,
    changeLog: !hasBasePermissionChecksLoading && changeLogTabFeatureFlag && hasEmployeeAccess,
    hrNotes: !isSelfView && hasHrNotesAccess && !scopePermissionLoading && hasEmployeeAccess,
    canDeleteDocuments:
      !permissionsLoading &&
      !employeeRecordHrBackofficeLoading &&
      !isSelfView &&
      employeeRecordHrBackofficeAccess === true
  }
}

const resolveActiveSubView = (currentSubView: HrAdminSubView, access: HrAdminSubViewAccess): HrAdminSubView => {
  if (access[currentSubView]) {
    return currentSubView
  }

  const orderedSubViews: HrAdminSubView[] = ['details', 'employment', 'documents', 'changeLog', 'hrNotes']
  return orderedSubViews.find(subView => access[subView]) ?? 'details'
}

const getInitialHrAdminSubView = (): HrAdminSubView => {
  if (globalThis.window === undefined) return 'details'
  const urlParams = new URLSearchParams(globalThis.window.location.search)
  const subViewFromUrl = urlParams.get('subView')

  if (subViewFromUrl === 'compensation') {
    return 'details'
  }

  if (subViewFromUrl && HR_ADMIN_SUBVIEW_VALUES.includes(subViewFromUrl as HrAdminSubView)) {
    return subViewFromUrl as HrAdminSubView
  }

  return 'details'
}

const HrAdminTab: React.FC<HrAdminTabProps> = ({
  employee,
  employeeId,
  accessToken,
  userInfo,
  isSelfView,
  changeLogTabFeatureFlag,
  hasHrNotesAccess,
  scopePermissionLoading,
  additionalData,
  employeeRecordHrBackoffice
}) => {
  const { t } = useTranslation(translations)
  const [activeSubView, setActiveSubView] = useState<HrAdminSubView>(getInitialHrAdminSubView())

  const { loading: permissionsLoading } = useEmployeePermissions(employeeId, accessToken)

  const employeeGrowthPermission = useScopePermissionCheck('/platform/employee-record', 'employee-growth', accessToken)

  const employeeRecordAllHrBackoffice = useScopePermissionCheck(
    '/platform/employee-record',
    'employee-record-all-hr-backoffice',
    accessToken
  )

  const currentUserEmployeeId = userInfo?.employeeDetails?.employeeId || ''
  const supervisorEmployeeId = employee?.employeePosition?.supervisorEmployeeId
  const supervisorIdFromRelation = employee?.employeePosition?.supervisor?.id
  const managerId = supervisorEmployeeId || supervisorIdFromRelation
  const isManager = !!(managerId && currentUserEmployeeId && managerId === currentUserEmployeeId)
  const hasManagerEmployeeGrowthPermission =
    isManager && !employeeGrowthPermission.loading && employeeGrowthPermission.hasPermission === true

  const permissions = resolveHrAdminPermissions({
    permissionsLoading,
    employeeGrowthPermissionLoading: employeeGrowthPermission.loading,
    hasManagerEmployeeGrowthPermission,
    employeeRecordAllHrBackofficeLoading: employeeRecordAllHrBackoffice.loading,
    employeeRecordAllHrBackofficeAccess: employeeRecordAllHrBackoffice?.hasPermission,
    employeeRecordHrBackofficeLoading: employeeRecordHrBackoffice.loading,
    employeeRecordHrBackofficeAccess: employeeRecordHrBackoffice?.hasPermission,
    isSelfView,
    changeLogTabFeatureFlag,
    hasHrNotesAccess,
    scopePermissionLoading
  })

  useEffect(() => {
    if (permissionsLoading) {
      return
    }

    const accessibleSubViews: HrAdminSubViewAccess = {
      details: permissions.details,
      employment: permissions.employment,
      documents: permissions.documents,
      changeLog: permissions.changeLog,
      hrNotes: permissions.hrNotes
    }

    const resolvedSubView = resolveActiveSubView(activeSubView, accessibleSubViews)
    if (resolvedSubView !== activeSubView) {
      setActiveSubView(resolvedSubView)
    }
  }, [
    activeSubView,
    permissionsLoading,
    permissions.details,
    permissions.employment,
    permissions.documents,
    permissions.changeLog,
    permissions.hrNotes
  ])

  useEffect(() => {
    if (globalThis.window === undefined) return

    const searchParams = new URLSearchParams(globalThis.window.location.search)
    searchParams.set('tab', 'hrAdmin')
    searchParams.set('subView', activeSubView)

    const currentUserEmployeeId = userInfo?.employeeDetails?.employeeId || ''
    if (employeeId && employeeId !== currentUserEmployeeId) {
      searchParams.set('employeeId', employeeId)
    } else {
      searchParams.delete('employeeId')
      searchParams.delete('id')
    }

    const newUrl = `${globalThis.window.location.pathname}?${searchParams.toString()}`
    globalThis.window.history.replaceState({}, '', newUrl)
  }, [activeSubView, employeeId, userInfo])

  useEffect(() => {
    const handlePopState = () => {
      const newSubView = getInitialHrAdminSubView()
      setActiveSubView(newSubView)
    }

    globalThis.window.addEventListener('popstate', handlePopState)
    return () => globalThis.window.removeEventListener('popstate', handlePopState)
  }, [])

  const handleSubViewChange = (value: string) => {
    setActiveSubView(value as HrAdminSubView)
  }

  const basePermissionsLoading =
    permissionsLoading || employeeGrowthPermission.loading || employeeRecordAllHrBackoffice.loading
  const showDetailsSection = basePermissionsLoading || permissions.details
  const showEmploymentSection = basePermissionsLoading || permissions.employment
  const showDocumentsSection = basePermissionsLoading || permissions.documents
  const showChangeLogSection = changeLogTabFeatureFlag || (!basePermissionsLoading && permissions.changeLog)

  return (
    <div data-testid="hr-admin-tab-container" className="gba:w-full">
      <Tabs value={activeSubView} onValueChange={handleSubViewChange} className="gba:w-full">
        <TabsList className="gba:mb-4 gba:w-full gba:justify-start" data-testid="hr-admin-tabs-list">
          {showDetailsSection && (
            <TabsTrigger value="details" data-testid="hr-admin-details-subtab" className="gba:flex-1">
              <div className="gba:flex gba:items-center gba:gap-2 gba:justify-center">
                <IdentificationCardIcon />
                <span>{t('hr-admin-subtab-details')}</span>
              </div>
            </TabsTrigger>
          )}
          {showEmploymentSection && (
            <TabsTrigger value="employment" data-testid="hr-admin-employment-subtab" className="gba:flex-1">
              <div className="gba:flex gba:items-center gba:gap-2 gba:justify-center">
                <BriefcaseIcon />
                <span>{t('hr-admin-subtab-employment')}</span>
              </div>
            </TabsTrigger>
          )}
          {showDocumentsSection && (
            <TabsTrigger value="documents" data-testid="hr-admin-documents-subtab" className="gba:flex-1">
              <div className="gba:flex gba:items-center gba:gap-2 gba:justify-center">
                <FilesIcon />
                <span>{t('hr-admin-subtab-documents')}</span>
              </div>
            </TabsTrigger>
          )}
          {showChangeLogSection && (
            <TabsTrigger value="changeLog" data-testid="hr-admin-changelog-subtab" className="gba:flex-1">
              <div className="gba:flex gba:items-center gba:gap-2 gba:justify-center">
                <ClockCounterClockwiseIcon />
                <span>{t('hr-admin-subtab-change-log')}</span>
              </div>
            </TabsTrigger>
          )}
          {permissions.hrNotes && (
            <TabsTrigger value="hrNotes" data-testid="hr-admin-hrnotes-subtab" className="gba:flex-1">
              <div className="gba:flex gba:items-center gba:gap-2 gba:justify-center">
                <NotebookIcon />
                <span>{t('hr-admin-subtab-hr-notes')}</span>
              </div>
            </TabsTrigger>
          )}
        </TabsList>

        {showDetailsSection && (
          <TabsContent value="details" data-testid="hr-admin-details-content" className="gba:mt-4">
            {basePermissionsLoading ? (
              <div className="gba:flex gba:justify-center gba:items-center gba:py-8">
                <Spinner size="lg" />
              </div>
            ) : (
              <DetailsTab
                employee={employee}
                accessToken={accessToken}
                employeeId={employeeId}
                isSelfView={isSelfView}
                employeeRecordHrBackoffice={employeeRecordHrBackoffice}
              />
            )}
          </TabsContent>
        )}

        {showEmploymentSection && (
          <TabsContent value="employment" data-testid="hr-admin-employment-content" className="gba:mt-4">
            {basePermissionsLoading ? (
              <div className="gba:flex gba:justify-center gba:items-center gba:py-8">
                <Spinner size="lg" />
              </div>
            ) : (
              <EmploymentTab
                employee={employee}
                accessToken={accessToken}
                employeeId={employeeId}
                userInfo={userInfo}
                isSelfView={isSelfView}
                employeeRecordHrBackoffice={employeeRecordHrBackoffice}
                showChangeTaxDetailsButton={
                  !employeeRecordAllHrBackoffice.loading && employeeRecordAllHrBackoffice.hasPermission === true
                }
              />
            )}
          </TabsContent>
        )}

        {showDocumentsSection && (
          <TabsContent value="documents" data-testid="hr-admin-documents-content" className="gba:mt-4">
            {basePermissionsLoading ? (
              <div className="gba:flex gba:justify-center gba:items-center gba:py-8">
                <Spinner size="lg" />
              </div>
            ) : (
              <DocumentsTab
                employee={employee}
                accessToken={accessToken}
                canEditDocuments={permissions.canDeleteDocuments}
              />
            )}
          </TabsContent>
        )}

        {showChangeLogSection && (
          <TabsContent value="changeLog" data-testid="hr-admin-changelog-content" className="gba:mt-4">
            <ChangeLogTab
              employeeId={employeeId}
              employeeName={employee?.displayName || t('employee-record-not-assigned')}
              userRole={'employee'}
              accessToken={accessToken}
              userInfo={userInfo}
              additionalData={additionalData}
            />
          </TabsContent>
        )}

        {permissions.hrNotes && (
          <TabsContent value="hrNotes" data-testid="hr-admin-hrnotes-content" className="gba:mt-4">
            <HrNotesTab
              accessToken={accessToken}
              employeeId={employeeId}
              employeeName={employee?.displayName || t('employee-record-not-assigned')}
              userInfo={userInfo}
              additionalData={additionalData}
            />
          </TabsContent>
        )}
      </Tabs>
    </div>
  )
}

export default HrAdminTab
