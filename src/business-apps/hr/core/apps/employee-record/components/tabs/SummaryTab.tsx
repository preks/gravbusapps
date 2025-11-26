'use client'

import React, { useMemo, useState } from 'react'
import { useEmployeeUpcomingAbsence } from '../../hooks/useEmployeeUpcomingAbsence'
import dayjs from 'dayjs'
import isSameOrAfter from 'dayjs/plugin/isSameOrAfter'
import isSameOrBefore from 'dayjs/plugin/isSameOrBefore'
import { Employee, EmployeeAbsenceEntitlement } from '../../hooks/useEmployeeData'
// Extend dayjs with plugins
dayjs.extend(isSameOrAfter)
dayjs.extend(isSameOrBefore)
import { Card, Avatar } from '@newwork/gravity-ui-catalog'
import {
  PiBriefcase,
  PiStack,
  PiListNumbers,
  PiFunction,
  PiClock,
  PiCalendarCheck,
  PiLightning,
  PiCalendarX,
  PiCheckCircle,
  PiSignIn,
  PiSignOut
} from 'react-icons/pi'
import { ArrowCircleLeftIcon } from '@phosphor-icons/react'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { UserInfoProps } from '@/common/BusinessAppContext'
import { AppAction } from '@/components/app-action/AppAction'
import { AppActionMenu } from '@/components/app-action-menu'
import { FlowContextName } from '@/common/types/FlowRegistryTypes'
import { Button, Tooltip } from 'antd'
import JobDetailsDrawer from './JobDetailsDrawer'
import JobFamilyDrawerContent, { getJobFamilyIcon, getJobFamilyTitle } from './drawer-content/JobFamilyDrawerContent'
import JobFunctionDrawerContent, {
  getJobFunctionIcon,
  getJobFunctionTitle
} from './drawer-content/JobFunctionDrawerContent'
import JobLevelDrawerContent, { getJobLevelIcon, getJobLevelTitle } from './drawer-content/JobLevelDrawerContent'
import { navigateTo, buildPlatformUrl } from '@/common/utils/navigationUtils'
import { cn } from '@/common/utils/cn'

interface SummaryTabProps {
  employee: Employee
  accessToken: string
  currentUserEmployeeId?: string
  userInfo?: UserInfoProps // Current user info
  employeeAbsenceEntitlement: EmployeeAbsenceEntitlement[]
}

/**
 * Summary Tab Component
 * Displays summary information about the employee
 */
// Job information is retrieved from employee.employeePosition

// Employee availability & schedule information comes from employee data
// Specific schedule information should be retrieved from the API

const SummaryTab: React.FC<SummaryTabProps> = ({
  employee,
  accessToken,
  currentUserEmployeeId,
  employeeAbsenceEntitlement
}) => {
  // Fetch upcoming absence for this employee
  const { loading: absenceLoading, upcomingAbsence } = useEmployeeUpcomingAbsence(accessToken, employee.id)

  // State for managing drawer visibility and content using a single state object
  const [drawerState, setDrawerState] = useState({
    visible: false,
    title: '',
    content: (<></>) as React.ReactElement, // Empty fragment as initial content
    icon: null as React.ReactNode
  })
  const isCurrentUser = useMemo(() => {
    return currentUserEmployeeId && currentUserEmployeeId === employee.id
  }, [employee.id, currentUserEmployeeId])
  const firstUpcomingValidAbsence = useMemo(() => {
    const filteredUpcomingAbsence = upcomingAbsence?.filter(
      absence => absence.status === 'APPROVED' || absence.status === 'PENDING'
    )
    return filteredUpcomingAbsence?.[0]
  }, [upcomingAbsence])
  const approvedAbsence = useMemo(() => {
    return upcomingAbsence?.filter(absence => absence.status === 'APPROVED')
  }, [upcomingAbsence])

  // Check if current day is within any approved absence period
  const hasAbsenceToday = useMemo(() => {
    if (!approvedAbsence || approvedAbsence.length === 0) return false

    const today = dayjs().startOf('day')

    return approvedAbsence.some(absence => {
      const startDate = dayjs(absence.startDate).startOf('day')
      const endDate = dayjs(absence.endDate).startOf('day')

      return today.isSameOrAfter(startDate) && today.isSameOrBefore(endDate)
    })
  }, [approvedAbsence])

  // Function to open the drawer with specific content
  const openDrawer = (title: string, content: React.ReactElement, icon: React.ReactNode) => {
    setDrawerState({
      visible: true,
      title,
      content,
      icon
    })
  }

  // Function to close the drawer
  const closeDrawer = () => {
    setDrawerState(prevState => ({
      ...prevState,
      visible: false
    }))
  }

  // Map real team members from GraphQL data

  // Map real team members from GraphQL data
  const subordinates = useMemo(() => {
    const tm = employee.employeePosition?.subordinates.filter(member => member.employee)
    if (!tm || !Array.isArray(tm)) return []
    return tm.map((member: any) => ({
      id: member.employee?.id,
      firstName: member.employee?.firstName,
      lastName: member.employee?.lastName,
      displayName:
        member.employee?.displayName || `${member.employee?.firstName || ''} ${member.employee?.lastName || ''}`.trim(),
      profilePicture: member.employee?.pictureThumbnail,
      position: member.jobPosition?.name ?? ''
    }))
  }, [employee.employeePosition])

  // Calculate total weekly working hours from daily hours data
  const computedWorkingHours = useMemo(() => {
    const wh = employee.workingHours?.[0]
    const hours = [
      wh?.mondayHours,
      wh?.tuesdayHours,
      wh?.wednesdayHours,
      wh?.thursdayHours,
      wh?.fridayHours,
      wh?.saturdayHours,
      wh?.sundayHours
    ].reduce((sum, val) => sum + (typeof val === 'number' ? val : 0), 0)
    return hours > 0 ? `${hours} hours/week` : 'Not specified'
  }, [employee.workingHours])

  return (
    <div className="gba:summary-tab gba:space-y-8" data-testid="summary-tab-container">
      {/* Summary Overview Headline with Action Button */}
      <div className="gba:flex gba:justify-between gba:items-start" data-testid="summary-header">
        <div className="gba:summary-header">
          <div className="gba:font-bold gba:text-2xl" data-testid="summary-title">
            {getTranslationFromI18nKeyAndLabel('lowcoder:hr_employee.summary_overview', 'Employee Overview')}
          </div>
          <div className="gba:text-muted-foreground gba:text-lg" data-testid="summary-description">
            {getTranslationFromI18nKeyAndLabel(
              'lowcoder:hr_employee.summary_description',
              'View and edit employee profile'
            )}
          </div>
        </div>

        {/* Action Button */}
        {useMemo(
          () => (
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
                entityName:
                  employee?.displayName ||
                  `${employee?.firstName || ''} ${employee?.lastName || ''}`.trim() ||
                  'Employee',
                entityUrl: `/platform/hr/employee-record?employeeId=${employee?.id}`
              }}
              prefixDataTestId="employee-actions"
              accessToken={accessToken}
            />
          ),
          [
            employee?.id,
            employee?.displayName,
            employee?.firstName,
            employee?.lastName,
            employee?.employeePosition?.supervisor?.id,
            employee?.employeePosition?.organizationalUnitId,
            accessToken
          ]
        )}
      </div>

      {/* Main grid layout for content blocks */}
      <div className="gba:grid gba:grid-cols-1 gba:md:grid-cols-2 gba:lg:grid-cols-3 gba:gap-6">
        {/* Organization Chart Section */}
        <div className="gba:lg:col-span-1 gba:xl:col-span-1">
          <Card
            variant="outlined"
            className="gba:shadow-md gba:hover:shadow-lg gba:border gba:border-border gba:transition-all gba:min-h-[420px] gba:bg-primary-foreground"
            data-testid="summary-section-organization-chart"
          >
            <div className="gba:mb-6 gba:border-b gba:border-border gba:pb-2">
              <h3 className="gba:text-xl gba:font-semibold gba:text-info">Organization Chart</h3>
            </div>
            <div className="gba:p-4 gba:overflow-hidden gba:flex gba:flex-col gba:justify-center gba:items-center">
              <div
                className="gba:flex gba:flex-col gba:items-center"
                style={{
                  maxHeight: '650px',
                  overflowY: 'auto',
                  overflowX: 'hidden',
                  padding: '0.5rem'
                }}
              >
                {/* Supervisor */}
                {employee.employeePosition?.supervisor && employee.employeePosition?.supervisor.id !== employee.id && (
                  <div className="gba:flex gba:flex-col gba:items-center">
                    <a
                      className="gba:cursor-pointer gba:transition-transform gba:hover:scale-105 gba:flex gba:flex-col gba:items-center"
                      href="#"
                      onClick={e => {
                        e.preventDefault()
                        if (
                          employee.employeePosition?.supervisor?.id &&
                          employee.employeePosition.supervisor.id !== employee.id
                        ) {
                          navigateTo(
                            buildPlatformUrl('/platform/employee-record', {
                              employeeId: employee.employeePosition.supervisor.id
                            })
                          )
                        }
                      }}
                      data-testid="supervisor-link"
                    >
                      <Avatar
                        src={
                          employee.employeePosition.supervisor.pictureThumbnail
                            ? `data:image/gif;base64,${employee.employeePosition.supervisor.pictureThumbnail}`
                            : undefined
                        }
                        initials={`${employee.employeePosition.supervisor.firstName?.[0] || ''}${employee.employeePosition.supervisor.lastName?.[0] || ''}`}
                        alt={`${employee.employeePosition.supervisor.firstName} ${employee.employeePosition.supervisor.lastName}`}
                        // @ts-expect-error - Type issue in gravity-ui-catalog for contentType
                        contentType={employee.employeePosition.supervisor.pictureThumbnail ? 'image' : 'initials'}
                        // @ts-expect-error - Type issue in gravity-ui-catalog for size
                        size="xl"
                        // @ts-expect-error - Type issue in gravity-ui-catalog for shape
                        shape="circle"
                        // @ts-expect-error - Type issue in gravity-ui-catalog for appearance
                        appearance="gradient"
                      />
                      <div className="gba:mt-2 gba:text-center">
                        <div className="gba:font-medium gba:text-sm gba:text-info gba:hover:underline">
                          {employee.employeePosition.supervisor.displayName}
                        </div>
                        <div className="gba:text-xs gba:text-muted-foreground">
                          {employee.employeePosition?.supervisor?.employeePosition?.jobPosition?.name ?? ''}
                        </div>
                      </div>
                    </a>
                    <div className="gba:w-px gba:h-6 gba:bg-border gba:mx-auto gba:my-1"></div>
                  </div>
                )}

                {/* Current Employee */}
                <div className="gba:flex gba:flex-col gba:items-center">
                  <div className="gba:ring-2 gba:ring-blue-400 gba:rounded-full gba:p-1">
                    <Avatar
                      src={employee.pictureThumbnail ? `data:image/gif;base64,${employee.pictureThumbnail}` : undefined}
                      initials={`${employee.firstName?.[0] || ''}${employee.lastName?.[0] || ''}`}
                      alt={`${employee.firstName} ${employee.lastName}`}
                      // @ts-expect-error - Type issue in gravity-ui-catalog for contentType
                      contentType={employee.pictureThumbnail ? 'image' : 'initials'}
                      // @ts-expect-error - Type issue in gravity-ui-catalog for size
                      size="xl"
                      // @ts-expect-error - Type issue in gravity-ui-catalog for shape
                      shape="circle"
                      // @ts-expect-error - Type issue in gravity-ui-catalog for appearance
                      appearance="gradient"
                    />
                  </div>
                  <div className="gba:mt-2 gba:text-center">
                    <div className="gba:font-medium gba:text-sm">{employee.displayName}</div>
                    <div className="gba:text-xs gba:text-muted-foreground">
                      {employee.employeePosition?.jobPosition?.name || ''}
                    </div>
                  </div>
                  {subordinates.length > 0 && (
                    <div className="gba:w-px gba:h-6 gba:bg-border gba:mx-auto gba:my-1"></div>
                  )}
                </div>
              </div>

              {/* Subordinates */}
              {subordinates.length > 0 && (
                <div className="gba:grid gba:grid-cols-1 gba:md:grid-cols-2 gba:gap-4 gba:w-full">
                  {subordinates.map(member => (
                    <div key={member.id} className="gba:flex gba:justify-center gba:mb-2">
                      <a
                        href="#"
                        onClick={e => {
                          e.preventDefault()
                          navigateTo(
                            buildPlatformUrl('/platform/employee-record', {
                              employeeId: member.id
                            })
                          )
                        }}
                        className="gba:cursor-pointer gba:hover:opacity-90 gba:flex gba:flex-col gba:items-center"
                        title={`View ${member.displayName}'s profile`}
                        data-testid={`team-member-link-${member.id}`}
                      >
                        <Avatar
                          src={member.profilePicture ? `data:image/gif;base64,${member.profilePicture}` : undefined}
                          initials={`${member.firstName?.[0] || ''}${member.lastName?.[0] || ''}`}
                          alt={`${member.firstName} ${member.lastName}`}
                          // @ts-expect-error - Type issue in gravity-ui-catalog for contentType
                          contentType={member.profilePicture ? 'image' : 'initials'}
                          // @ts-expect-error - Type issue in gravity-ui-catalog for size
                          size="xl"
                          // @ts-expect-error - Type issue in gravity-ui-catalog for shape
                          shape="circle"
                          // @ts-expect-error - Type issue in gravity-ui-catalog for appearance
                          appearance="gradient"
                        />
                        <div className="gba:mt-2 gba:text-center gba:w-full">
                          <div className="gba:font-medium gba:text-sm gba:text-info gba:hover:underline">
                            {member.displayName}
                          </div>
                          <div className="gba:text-xs gba:text-muted-foreground gba:truncate gba:w-full gba:text-center gba:px-1">
                            {member.position}
                          </div>
                        </div>
                      </a>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* Job Information Section */}
        <div className="gba:lg:col-span-1 gba:xl:col-span-1">
          <Card
            variant="outlined"
            className="gba:shadow-md gba:hover:shadow-lg gba:border gba:border-border gba:transition-all"
            style={{ minHeight: '420px', backgroundColor: 'var(--nw-primary-foreground)' }}
            data-testid="summary-section-job-information"
          >
            <div className="gba:mb-6 gba:border-b gba:border-border gba:pb-2">
              <h3 className="gba:text-xl gba:font-semibold gba:text-info">Job Information</h3>
            </div>
            <div className="gba:p-4">
              <div className="gba:space-y-4">
                <div className="gba:flex gba:items-center">
                  <PiBriefcase className="gba:h-5 gba:w-5 gba:text-muted-foreground gba:mr-3" />
                  <div>
                    <div className="gba:text-sm gba:font-medium gba:text-foreground">Job Profile</div>
                    <div className="gba:text-sm gba:text-muted-foreground">
                      {employee.employeePosition?.jobPosition?.name ??
                        getTranslationFromI18nKeyAndLabel(
                          'lowcoder:employee_profile.left_side_bar.not_assigned',
                          'Not assigned'
                        )}
                    </div>
                  </div>
                </div>

                {/* Optional Job Family section - only show if data is available */}
                {employee.employeePosition?.jobPosition?.name && (
                  <div className="gba:flex gba:items-center">
                    <PiStack className="gba:h-5 gba:w-5 gba:text-muted-foreground gba:mr-3" />
                    <div className="gba:w-full">
                      <div className="gba:text-sm gba:font-medium gba:text-foreground">Job Family</div>
                      <button
                        onClick={() =>
                          openDrawer(
                            getJobFamilyTitle(employee),
                            <JobFamilyDrawerContent employee={employee} accessToken={accessToken} />,
                            getJobFamilyIcon()
                          )
                        }
                        className="gba:text-sm gba:!text-blue-600 gba:hover:underline gba:text-left gba:w-full"
                        data-testid="job-family-button"
                      >
                        {/* Display job family from updated data structure, fallback to organizationalUnit name */}
                        {employee.employeePosition?.jobPosition?.jobFunction?.jobFamily?.value ||
                          getTranslationFromI18nKeyAndLabel(
                            'lowcoder:employee_profile.left_side_bar.not_assigned',
                            'Not assigned'
                          )}
                      </button>
                    </div>
                  </div>
                )}

                {/* Optional Job Function section - only show if data is available */}
                {employee.employeePosition?.jobPosition?.name && (
                  <div className="gba:flex gba:items-center">
                    <PiFunction className="gba:h-5 gba:w-5 gba:text-muted-foreground gba:mr-3" />
                    <div className="gba:w-full">
                      <div className="gba:flex gba:justify-between gba:w-full">
                        <div className="gba:text-sm gba:font-medium gba:text-foreground">Job Function</div>
                      </div>
                      <button
                        onClick={() =>
                          openDrawer(
                            getJobFunctionTitle(employee),
                            <JobFunctionDrawerContent employee={employee} accessToken={accessToken} isVisible={true} />,
                            getJobFunctionIcon()
                          )
                        }
                        className="gba:text-sm gba:!text-blue-600 gba:hover:underline gba:text-left gba:w-full"
                        data-testid="job-function-button"
                      >
                        {employee.employeePosition?.jobPosition?.jobFunction?.name ||
                          getTranslationFromI18nKeyAndLabel(
                            'lowcoder:employee_profile.left_side_bar.not_assigned',
                            'Not assigned'
                          )}
                      </button>
                    </div>
                  </div>
                )}

                {/* Optional Job Level section - only show if data is available */}
                {employee.employeePosition?.jobPosition?.name && (
                  <div className="gba:flex gba:items-center">
                    <PiListNumbers className="gba:h-5 gba:w-5 gba:text-muted-foreground gba:mr-3" />
                    <div className="gba:w-full">
                      <div className="gba:text-sm gba:font-medium gba:text-foreground">Job Level</div>
                      <button
                        onClick={() =>
                          openDrawer(
                            getJobLevelTitle(employee),
                            <JobLevelDrawerContent employee={employee} accessToken={accessToken} />,
                            getJobLevelIcon()
                          )
                        }
                        className="gba:text-sm gba:!text-blue-600 gba:hover:underline gba:text-left gba:w-full"
                        data-testid="job-level-button"
                      >
                        {employee.employeePosition?.jobPosition?.jobLevel?.name ||
                          getTranslationFromI18nKeyAndLabel(
                            'lowcoder:employee_profile.left_side_bar.not_assigned',
                            'Not assigned'
                          )}
                      </button>
                    </div>
                  </div>
                )}

                {/* External ID (fallback to SAP Number) */}
                {(employee?.externalId || employee?.additionalProperties?.SAPNumber) && (
                  <div className="gba:flex gba:items-center">
                    <PiListNumbers className="gba:h-5 gba:w-5 gba:text-muted-foreground gba:mr-3" />
                    <div>
                      <div className="gba:text-sm gba:font-medium gba:text-foreground">SAP Number</div>
                      <div className="gba:text-sm gba:text-muted-foreground">
                        {String(employee.externalId ?? employee.additionalProperties?.SAPNumber)}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </Card>
        </div>

        {/* Availability & Schedule Section */}
        <div className="gba:lg:col-span-1 gba:xl:col-span-1">
          <Card
            variant="outlined"
            className="gba:shadow-md gba:hover:shadow-lg gba:border gba:border-border gba:transition-all"
            style={{ minHeight: '420px', backgroundColor: 'var(--nw-primary-foreground)' }}
            data-testid="summary-section-availability"
          >
            <div className="gba:mb-6 gba:border-b gba:border-border gba:pb-2">
              <h3 className="gba:text-xl gba:font-semibold gba:text-info">Availability & Schedule</h3>
            </div>
            <div className="gba:p-4">
              <div className="gba:space-y-4">
                {/* Status display */}
                <div className="gba:flex gba:items-center">
                  {hasAbsenceToday ? (
                    <ArrowCircleLeftIcon
                      className="gba:h-5 gba:w-5 gba:text-destructive gba:mr-3"
                      data-testid="current-status-icon"
                    />
                  ) : (
                    <PiCheckCircle
                      className="gba:h-5 gba:w-5 gba:text-success gba:mr-3"
                      data-testid="current-status-icon"
                    />
                  )}
                  <div>
                    <div className="gba:text-sm gba:font-medium gba:text-foreground">Current Status</div>
                    <div className="gba:text-sm gba:text-muted-foreground" data-testid="current-status-text">
                      {hasAbsenceToday ? 'Unavailable' : 'Available'}
                    </div>
                  </div>
                </div>

                {/* Weekly schedule */}
                <div className="gba:grid gba:grid-cols-7 gba:gap-1 gba:items-center">
                  {['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'].map(day => {
                    // Use actual working hours from employee data
                    const hoursKey = `${day}Hours` as keyof (typeof employee.workingHours)[0]
                    const dayHours = employee.workingHours?.[0]?.[hoursKey] as number
                    const isWorkDay = dayHours > 0
                    return (
                      <div key={day} className="gba:text-center">
                        <div className="gba:text-xs gba:font-medium gba:text-muted-foreground gba:uppercase">
                          <span className="gba:hidden gba:2xl:inline">{day.slice(0, 3)}</span>
                          <span className="gba:inline gba:2xl:hidden">{day.slice(0, 1)}</span>
                        </div>
                        <div
                          className={`gba:h-2 gba:rounded-full gba:mt-1 ${isWorkDay ? 'gba:bg-info' : 'gba:bg-border'}`}
                        ></div>
                      </div>
                    )
                  })}
                </div>

                {/* Timezone */}
                <div className="gba:flex gba:items-center">
                  <PiClock className="gba:h-5 gba:w-5 gba:text-muted-foreground gba:mr-3" />
                  <div>
                    <div className="gba:text-sm gba:font-medium gba:text-foreground">Timezone</div>
                    <div className="gba:text-sm gba:text-muted-foreground">Europe/Berlin</div>
                  </div>
                </div>

                {/* Working hours */}
                <div className="gba:flex gba:items-center">
                  <PiCalendarCheck className="gba:h-5 gba:w-5 gba:text-muted-foreground gba:mr-3" />
                  <div>
                    <div className="gba:text-sm gba:font-medium gba:text-foreground">Weekly Hours</div>
                    <div className="gba:text-sm gba:text-muted-foreground">{computedWorkingHours}</div>
                  </div>
                </div>

                {/* Quick Actions - Only visible when user is viewing their own profile */}
                {isCurrentUser && (
                  <div className="">
                    <div className="gba:flex gba:items-center gba:mb-3">
                      <PiLightning className="gba:h-5 gba:w-5 gba:text-muted-foreground gba:mr-3" />
                      <div
                        className="gba:text-sm gba:font-medium gba:text-foreground"
                        data-testid="quick-actions-heading"
                      >
                        Quick Actions
                      </div>
                    </div>
                    <div className="gba:flex gba:gap-2 gba:w-full gba:flex-wrap">
                      <Tooltip title="Clock In">
                        <Button
                          type="default"
                          size="small"
                          className="gba:hover:bg-gray-100 gba:flex-1"
                          data-testid="clock-in-button"
                          onClick={() => {
                            // Clock in action logic would go here
                            console.log('Clock in clicked')
                          }}
                        >
                          <span data-testid="clock-in-button-text">
                            <PiSignIn className="gba:h-3 gba:w-3" />
                          </span>
                        </Button>
                      </Tooltip>
                      <Tooltip title="Clock Out">
                        <Button
                          type="default"
                          size="small"
                          className="gba:hover:bg-gray-100 gba:flex-1"
                          data-testid="clock-out-button"
                          onClick={() => {
                            // Clock out action logic would go here
                            console.log('Clock out clicked')
                          }}
                        >
                          <span data-testid="clock-out-button-text">
                            <PiSignOut className="gba:h-3 gba:w-3" />
                          </span>
                        </Button>
                      </Tooltip>
                      <AppActionMenu
                        data-testid="request-absence-button"
                        contextsArray={[FlowContextName.employeeAbsenceRecord]}
                        externalContextData={{
                          employeeId: employee.id,
                          flowType: 'vacation',
                          absenceType: employeeAbsenceEntitlement.find(e => e.type?.id === 'AbsenceType:v1:A001')?.type
                            ?.id,
                          startDate: null,
                          endDate: null
                        }}
                        prefixDataTestId="request-absence"
                        accessToken={accessToken}
                      >
                        <div className="gba:flex gba:items-center gba:gap-2 gba:cursor-pointer gba:flex-1 gba:min-w-0">
                          <PiCalendarX className="gba:h-4 gba:w-4" />
                          <span className="gba:text-xs gba:md:text-sm gba:truncate">
                            {getTranslationFromI18nKeyAndLabel(
                              'lowcoder:absence_hub.request_absence',
                              'Request Absence'
                            )}
                          </span>
                        </div>
                      </AppActionMenu>
                    </div>
                  </div>
                )}

                {/* Upcoming Absence Section */}
                {firstUpcomingValidAbsence && (
                  <div
                    className="gba:mt-4 gba:border-t gba:border-border gba:pt-4"
                    data-testid="upcoming-absence-section"
                  >
                    <div className="gba:flex gba:items-center gba:mb-3">
                      <PiCalendarX className="gba:h-5 gba:w-5 gba:text-muted-foreground gba:mr-3" />
                      <div
                        className="gba:text-sm gba:font-medium gba:text-foreground"
                        data-testid="upcoming-absence-heading"
                      >
                        Next Planned Absence
                      </div>
                    </div>
                    <div className="gba:bg-gray-50 gba:p-3 gba:rounded gba:border gba:border-border">
                      <div className="gba:flex gba:justify-between gba:items-center">
                        <div>
                          <p className="gba:text-sm gba:font-medium" data-testid="absence-type">
                            {firstUpcomingValidAbsence.type.parentEntryId === 'AbsenceGroup:v1:HEALTH' && !isCurrentUser
                              ? 'Out of office'
                              : firstUpcomingValidAbsence.type.value}
                            - {firstUpcomingValidAbsence.calendarDays} days
                          </p>
                          <div className="gba:flex gba:items-center gba:mt-1">
                            <span className="gba:text-xs gba:text-muted-foreground" data-testid="absence-dates">
                              {dayjs(firstUpcomingValidAbsence.startDate).format('MMM DD')} -{' '}
                              {dayjs(firstUpcomingValidAbsence.endDate).format('MMM DD, YYYY')}
                            </span>
                          </div>
                        </div>
                        <div
                          className={cn('gba:text-xs gba:px-2 gba:py-1 gba:rounded', {
                            'gba:bg-green-100 gba:text-green-800': firstUpcomingValidAbsence.status === 'APPROVED',
                            'gba:bg-red-100 gba:text-red-800': firstUpcomingValidAbsence.status === 'REJECTED',
                            'gba:bg-yellow-100 gba:text-yellow-800': firstUpcomingValidAbsence.status === 'PENDING'
                          })}
                          data-testid="absence-status"
                        >
                          {firstUpcomingValidAbsence.status}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {absenceLoading && !upcomingAbsence && (
                  <div
                    className="gba:mt-4 gba:border-t gba:border-border gba:pt-4 gba:text-center gba:text-sm gba:text-muted-foreground"
                    data-testid="loading-absence"
                  >
                    Loading upcoming absence...
                  </div>
                )}
              </div>
            </div>
          </Card>
        </div>

        {/* Additional Attributes moved to HR Admin > Details tab */}
      </div>

      {/* Job Details Drawer */}
      <JobDetailsDrawer
        title={drawerState.title}
        open={drawerState.visible}
        onClose={closeDrawer}
        content={drawerState.content}
        icon={drawerState.icon}
      />
    </div>
  )
}

export default SummaryTab
