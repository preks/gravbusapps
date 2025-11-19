'use client'

import React, { useState, useEffect } from 'react'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@newwork/nw-design-system'
import { PiIdentificationCard, PiBriefcase, PiFiles, PiClockCounterClockwise, PiNotebook } from 'react-icons/pi'
import DetailsTab from './DetailsTab'
import EmploymentTab from './EmploymentTab'
import ChangeLogTab from './ChangeLogTab'
import DocumentsTab from './DocumentsTab'
import HrNotesTab from './HrNotesTab'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { Employee } from '../../hooks/useEmployeeData'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'

interface HrAdminTabProps extends BusinessAppContextProps {
  employee: Employee
  employeeId: string
  isSelfView: boolean
  changeLogTabFeatureFlag: boolean
  hasHrNotesAccess: boolean
  scopePermissionLoading: boolean
}

const HR_ADMIN_SUBVIEW_VALUES = ['details', 'employment', 'changeLog', 'documents', 'hrNotes'] as const
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
  additionalData
}) => {
  const [activeSubView, setActiveSubView] = useState<HrAdminSubView>(getInitialHrAdminSubView())

  const shouldShowHrNotes = !isSelfView && hasHrNotesAccess && !scopePermissionLoading

  useEffect(() => {
    if (activeSubView === 'hrNotes' && !shouldShowHrNotes) {
      setActiveSubView('details')
    }
    if (activeSubView === 'changeLog' && !changeLogTabFeatureFlag) {
      setActiveSubView('details')
    }
  }, [activeSubView, shouldShowHrNotes, changeLogTabFeatureFlag])

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
          <TabsTrigger value="details" data-testid="hr-admin-details-subtab" className="gba:flex-1">
            <div className="gba:flex gba:items-center gba:gap-2 gba:justify-center">
              <PiIdentificationCard />
              <span>
                {getTranslationFromI18nKeyAndLabel('lowcoder:employee_profile.employee_tabs.details', 'Details')}
              </span>
            </div>
          </TabsTrigger>
          <TabsTrigger value="employment" data-testid="hr-admin-employment-subtab" className="gba:flex-1">
            <div className="gba:flex gba:items-center gba:gap-2 gba:justify-center">
              <PiBriefcase />
              <span>
                {getTranslationFromI18nKeyAndLabel('lowcoder:employee_profile.employee_tabs.employment', 'Employment')}
              </span>
            </div>
          </TabsTrigger>
          {changeLogTabFeatureFlag && (
            <TabsTrigger value="changeLog" data-testid="hr-admin-changelog-subtab" className="gba:flex-1">
              <div className="gba:flex gba:items-center gba:gap-2 gba:justify-center">
                <PiClockCounterClockwise />
                <span>{getTranslationFromI18nKeyAndLabel('lowcoder:changelog_tab.title', 'Change Log')}</span>
              </div>
            </TabsTrigger>
          )}
          <TabsTrigger value="documents" data-testid="hr-admin-documents-subtab" className="gba:flex-1">
            <div className="gba:flex gba:items-center gba:gap-2 gba:justify-center">
              <PiFiles />
              <span>
                {getTranslationFromI18nKeyAndLabel('lowcoder:employee_profile.employee_tabs.documents', 'Documents')}
              </span>
            </div>
          </TabsTrigger>
          {shouldShowHrNotes && (
            <TabsTrigger value="hrNotes" data-testid="hr-admin-hrnotes-subtab" className="gba:flex-1">
              <div className="gba:flex gba:items-center gba:gap-2 gba:justify-center">
                <PiNotebook />
                <span>{getTranslationFromI18nKeyAndLabel('lowcoder:hr_notes.tab_name', 'HR Notes')}</span>
              </div>
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="details" data-testid="hr-admin-details-content" className="gba:mt-4">
          <DetailsTab
            employee={employee}
            accessToken={accessToken}
            employeeId={employeeId}
            userInfo={userInfo}
            isSelfView={isSelfView}
          />
        </TabsContent>

        <TabsContent value="employment" data-testid="hr-admin-employment-content" className="gba:mt-4">
          <EmploymentTab employee={employee} accessToken={accessToken} employeeId={employeeId} userInfo={userInfo} />
        </TabsContent>

        {changeLogTabFeatureFlag && (
          <TabsContent value="changeLog" data-testid="hr-admin-changelog-content" className="gba:mt-4">
            <ChangeLogTab
              employeeId={employeeId}
              employeeName={employee?.displayName || 'Employee'}
              userRole={'employee'}
              accessToken={accessToken}
              userInfo={userInfo}
              additionalData={additionalData}
            />
          </TabsContent>
        )}

        <TabsContent value="documents" data-testid="hr-admin-documents-content" className="gba:mt-4">
          <DocumentsTab
            employee={employee}
            accessToken={accessToken}
            employeeId={employeeId}
            userInfo={userInfo}
            isSelfView={isSelfView}
          />
        </TabsContent>

        {shouldShowHrNotes && (
          <TabsContent value="hrNotes" data-testid="hr-admin-hrnotes-content" className="gba:mt-4">
            <HrNotesTab
              accessToken={accessToken}
              employeeId={employeeId}
              employeeName={employee?.displayName || 'Employee'}
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
