'use client'

import React, { useState, useEffect } from 'react'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@newwork/nw-design-system'
import { Spin } from 'antd'
import { PiIdentificationCard, PiBriefcase, PiFiles, PiClockCounterClockwise, PiNotebook } from 'react-icons/pi'
import DetailsTab from './DetailsTab'
import EmploymentTab from './EmploymentTab'
import ChangeLogTab from './ChangeLogTab'
import DocumentsTab from './DocumentsTab'
import HrNotesTab from './HrNotesTab'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { Employee } from '../../hooks/useEmployeeData'
import { ScopePermissionCheckResult, useScopePermissionCheck } from '@/common/hooks/useScopePermissionCheck'
import { useEmployeePermissions } from '../../hooks/useEmployeePermissions'
import { useTranslation } from '@newwork/nw-design-system'
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

const getInitialHrAdminSubView = (): HrAdminSubView => {
  if (typeof window === 'undefined') return 'details'
  const urlParams = new URLSearchParams(window.location.search)
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

  const hasDetailsPermission =
    permissionsLoading || employeeGrowthPermission.loading || employeeRecordAllHrBackoffice.loading
      ? false
      : isSelfView || hasManagerEmployeeGrowthPermission || employeeRecordAllHrBackoffice?.hasPermission === true

  const hasEmploymentPermission =
    permissionsLoading || employeeGrowthPermission.loading || employeeRecordAllHrBackoffice.loading
      ? false
      : isSelfView || hasManagerEmployeeGrowthPermission || employeeRecordAllHrBackoffice?.hasPermission === true

  const hasDocumentsPermission =
    permissionsLoading || employeeGrowthPermission.loading || employeeRecordAllHrBackoffice.loading
      ? false
      : isSelfView || hasManagerEmployeeGrowthPermission || employeeRecordAllHrBackoffice?.hasPermission === true

  const canDeleteDocuments =
    permissionsLoading || employeeRecordHrBackoffice.loading
      ? false
      : !isSelfView && employeeRecordHrBackoffice?.hasPermission === true

  const hasChangeLogPermission =
    permissionsLoading || employeeGrowthPermission.loading || employeeRecordAllHrBackoffice.loading
      ? false
      : isSelfView ||
        (changeLogTabFeatureFlag &&
          (hasManagerEmployeeGrowthPermission || employeeRecordAllHrBackoffice?.hasPermission === true))

  const shouldShowHrNotes =
    !isSelfView &&
    hasHrNotesAccess &&
    !scopePermissionLoading &&
    (hasManagerEmployeeGrowthPermission || employeeRecordAllHrBackoffice?.hasPermission === true)

  useEffect(() => {
    if (activeSubView === 'hrNotes' && !shouldShowHrNotes) {
      setActiveSubView('details')
    }
    if (activeSubView === 'changeLog' && !changeLogTabFeatureFlag) {
      setActiveSubView('details')
    }
    // Redirect if user doesn't have permission for the active subtab
    if (!permissionsLoading) {
      if (activeSubView === 'details' && !hasDetailsPermission) {
        // Find first available subtab
        if (hasEmploymentPermission) setActiveSubView('employment')
        else if (hasDocumentsPermission) setActiveSubView('documents')
        else if (hasChangeLogPermission) setActiveSubView('changeLog')
        else if (shouldShowHrNotes) setActiveSubView('hrNotes')
      } else if (activeSubView === 'employment' && !hasEmploymentPermission) {
        if (hasDetailsPermission) setActiveSubView('details')
        else if (hasDocumentsPermission) setActiveSubView('documents')
        else if (hasChangeLogPermission) setActiveSubView('changeLog')
        else if (shouldShowHrNotes) setActiveSubView('hrNotes')
      } else if (activeSubView === 'documents' && !hasDocumentsPermission) {
        if (hasDetailsPermission) setActiveSubView('details')
        else if (hasEmploymentPermission) setActiveSubView('employment')
        else if (hasChangeLogPermission) setActiveSubView('changeLog')
        else if (shouldShowHrNotes) setActiveSubView('hrNotes')
      } else if (activeSubView === 'changeLog' && !hasChangeLogPermission) {
        if (hasDetailsPermission) setActiveSubView('details')
        else if (hasEmploymentPermission) setActiveSubView('employment')
        else if (hasDocumentsPermission) setActiveSubView('documents')
        else if (shouldShowHrNotes) setActiveSubView('hrNotes')
      }
    }
  }, [
    activeSubView,
    shouldShowHrNotes,
    changeLogTabFeatureFlag,
    permissionsLoading,
    hasDetailsPermission,
    hasEmploymentPermission,
    hasDocumentsPermission,
    hasChangeLogPermission
  ])

  useEffect(() => {
    if (typeof window === 'undefined') return

    const searchParams = new URLSearchParams(window.location.search)
    searchParams.set('tab', 'hrAdmin')
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
      const newSubView = getInitialHrAdminSubView()
      setActiveSubView(newSubView)
    }

    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [])

  const handleSubViewChange = (value: string) => {
    setActiveSubView(value as HrAdminSubView)
  }

  return (
    <div data-testid="hr-admin-tab-container" className="gba:w-full">
      <Tabs value={activeSubView} onValueChange={handleSubViewChange} className="gba:w-full">
        <TabsList className="gba:mb-4 gba:w-full" data-testid="hr-admin-tabs-list">
          {(permissionsLoading ||
            employeeGrowthPermission.loading ||
            employeeRecordAllHrBackoffice.loading ||
            hasDetailsPermission) && (
            <TabsTrigger value="details" data-testid="hr-admin-details-subtab" className="gba:flex-1">
              <div className="gba:flex gba:items-center gba:gap-2 gba:justify-center">
                <PiIdentificationCard />
                <span>{t('hr-admin-subtab-details')}</span>
              </div>
            </TabsTrigger>
          )}
          {(permissionsLoading ||
            employeeGrowthPermission.loading ||
            employeeRecordAllHrBackoffice.loading ||
            hasEmploymentPermission) && (
            <TabsTrigger value="employment" data-testid="hr-admin-employment-subtab" className="gba:flex-1">
              <div className="gba:flex gba:items-center gba:gap-2 gba:justify-center">
                <PiBriefcase />
                <span>{t('hr-admin-subtab-employment')}</span>
              </div>
            </TabsTrigger>
          )}
          {(permissionsLoading ||
            employeeGrowthPermission.loading ||
            employeeRecordAllHrBackoffice.loading ||
            hasDocumentsPermission) && (
            <TabsTrigger value="documents" data-testid="hr-admin-documents-subtab" className="gba:flex-1">
              <div className="gba:flex gba:items-center gba:gap-2 gba:justify-center">
                <PiFiles />
                <span>{t('hr-admin-subtab-documents')}</span>
              </div>
            </TabsTrigger>
          )}
          {(changeLogTabFeatureFlag ||
            (!permissionsLoading &&
              !employeeGrowthPermission.loading &&
              !employeeRecordAllHrBackoffice.loading &&
              hasChangeLogPermission)) && (
            <TabsTrigger value="changeLog" data-testid="hr-admin-changelog-subtab" className="gba:flex-1">
              <div className="gba:flex gba:items-center gba:gap-2 gba:justify-center">
                <PiClockCounterClockwise />
                <span>{t('hr-admin-subtab-change-log')}</span>
              </div>
            </TabsTrigger>
          )}
          {shouldShowHrNotes && (
            <TabsTrigger value="hrNotes" data-testid="hr-admin-hrnotes-subtab" className="gba:flex-1">
              <div className="gba:flex gba:items-center gba:gap-2 gba:justify-center">
                <PiNotebook />
                <span>{t('hr-admin-subtab-hr-notes')}</span>
              </div>
            </TabsTrigger>
          )}
        </TabsList>

        {(permissionsLoading ||
          employeeGrowthPermission.loading ||
          employeeRecordAllHrBackoffice.loading ||
          hasDetailsPermission) && (
          <TabsContent value="details" data-testid="hr-admin-details-content" className="gba:mt-4">
            {permissionsLoading || employeeGrowthPermission.loading || employeeRecordAllHrBackoffice.loading ? (
              <div className="gba:flex gba:justify-center gba:items-center gba:py-8">
                <Spin size="large" />
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

        {(permissionsLoading ||
          employeeGrowthPermission.loading ||
          employeeRecordAllHrBackoffice.loading ||
          hasEmploymentPermission) && (
          <TabsContent value="employment" data-testid="hr-admin-employment-content" className="gba:mt-4">
            {permissionsLoading || employeeGrowthPermission.loading || employeeRecordAllHrBackoffice.loading ? (
              <div className="gba:flex gba:justify-center gba:items-center gba:py-8">
                <Spin size="large" />
              </div>
            ) : (
              <EmploymentTab
                employee={employee}
                accessToken={accessToken}
                employeeId={employeeId}
                userInfo={userInfo}
              />
            )}
          </TabsContent>
        )}

        {(permissionsLoading ||
          employeeGrowthPermission.loading ||
          employeeRecordAllHrBackoffice.loading ||
          hasDocumentsPermission) && (
          <TabsContent value="documents" data-testid="hr-admin-documents-content" className="gba:mt-4">
            {permissionsLoading || employeeGrowthPermission.loading || employeeRecordAllHrBackoffice.loading ? (
              <div className="gba:flex gba:justify-center gba:items-center gba:py-8">
                <Spin size="large" />
              </div>
            ) : (
              <DocumentsTab
                employee={employee}
                accessToken={accessToken}
                employeeId={employeeId}
                userInfo={userInfo}
                canEditDocuments={canDeleteDocuments}
              />
            )}
          </TabsContent>
        )}

        {(changeLogTabFeatureFlag || (!permissionsLoading && hasChangeLogPermission)) && (
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

        {shouldShowHrNotes && (
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
