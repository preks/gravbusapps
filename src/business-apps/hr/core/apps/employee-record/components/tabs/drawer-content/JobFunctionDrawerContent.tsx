'use client'

import React from 'react'
import { PiFunction, PiUsers } from 'react-icons/pi'
import { navigateTo } from '@/common/utils/navigationUtils'
import { Button, Spinner } from '@newwork/nw-design-system'
import { Employee } from '../../../hooks/useEmployeeData'
import { useJobFunctionNameCount } from '../../../hooks/useJobFunctionNameCount'
import { useJobFunctionProfilesCount } from '../../../hooks/useJobFunctionProfilesCount'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'

interface JobFunctionDrawerContentProps {
  employee: Employee
  isVisible?: boolean
  accessToken: string
}

/**
 * Job Function Drawer Content Component
 * Displays detailed information about an employee's job function
 */
const JobFunctionDrawerContent: React.FC<JobFunctionDrawerContentProps> = ({
  employee,
  isVisible = false,
  accessToken
}) => {
  // Get the job function name
  const jobFunctionName = employee.employeePosition?.jobPosition?.jobFunction?.name || ''

  // Fetch the number of employees with the same job function name, only when drawer is visible
  const {
    employeeCount,
    loading: loadingEmployeeCount,
    error: employeeCountError
  } = useJobFunctionNameCount(
    accessToken,
    isVisible ? jobFunctionName : '' // Only fetch when drawer is visible
  )

  // Fetch the number of job profiles with the same job function name
  const {
    profilesCount,
    loading: loadingProfilesCount,
    error: profilesCountError
  } = useJobFunctionProfilesCount(
    accessToken,
    isVisible ? jobFunctionName : '' // Only fetch when drawer is visible
  )

  return (
    <div className="gba:space-y-6" data-testid="job-function-drawer-content">
      <div>
        <h4 className="gba:font-medium gba:mb-3 gba:text-foreground">Usage</h4>
        <div className="gba:grid gba:grid-cols-2 gba:gap-4">
          {/* First box - always Employees */}
          <div
            className="gba:bg-info-secondary gba:p-4 gba:rounded-md gba:border"
            data-testid="job-function-employee-count"
          >
            <div className="gba:text-sm gba:text-muted-foreground">Employees</div>
            {loadingEmployeeCount ? (
              <Spinner size="sm" data-testid="job-function-employee-count-loading" />
            ) : employeeCountError ? (
              <div className="gba:text-destructive gba:text-sm" data-testid="job-function-employee-count-error">
                Error
              </div>
            ) : (
              <div className="gba:text-2xl gba:font-semibold gba:mt-1" data-testid="job-function-employee-count-value">
                {employeeCount ?? 0}
              </div>
            )}
          </div>

          {/* Second box - Job Profiles */}
          <div
            className="gba:bg-info-secondary gba:p-4 gba:rounded-md gba:border"
            data-testid="job-function-profiles-count"
          >
            <div className="gba:flex gba:items-center gba:gap-2">
              <div className="gba:text-sm gba:text-muted-foreground">Job Profiles</div>
            </div>
            {loadingProfilesCount ? (
              <Spinner size="sm" data-testid="job-function-profiles-count-loading" />
            ) : profilesCountError ? (
              <div className="gba:text-destructive gba:text-sm" data-testid="job-function-profiles-count-error">
                Error
              </div>
            ) : (
              <div className="gba:text-2xl gba:font-semibold gba:mt-1" data-testid="job-function-profiles-count-value">
                {profilesCount ?? 0}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* View All Employees button */}
      <div className="gba:mt-6">
        <Button
          data-testid="view-all-assigned-employees-button"
          className="gba:w-full gba:flex gba:items-center gba:justify-center"
          onClick={() => navigateTo('/platform/employee-directory')}
          variant="outline"
          size="lg"
        >
          <span>View All Assigned Employees</span>
          <PiUsers className="gba:ml-2" size={18} />
        </Button>
      </div>
    </div>
  )
}

// Helper function to get the icon for this drawer
export const getJobFunctionIcon = () => <PiFunction className="gba:h-5 gba:w-5" />

// Export the title to use for the drawer
export const getJobFunctionTitle = (employee: Employee) =>
  employee.employeePosition?.jobPosition?.jobFunction?.name ||
  getTranslationFromI18nKeyAndLabel('lowcoder:employee_profile.left_side_bar.not_assigned', 'Not assigned')

export default JobFunctionDrawerContent
