'use client'

import React from 'react'
import { PiListNumbers, PiUsers } from 'react-icons/pi'
import { navigateTo } from '@/common/utils/navigationUtils'
import { Button, Spinner } from '@newwork/nw-design-system'
import { Employee } from '../../../hooks/useEmployeeData'
import { useJobLevelEmployeeCount } from '../../../hooks/useJobLevelEmployeeCount'

interface JobLevelDrawerContentProps {
  employee: Employee
  isVisible?: boolean
  accessToken: string
}

/**
 * Job Level Drawer Content Component
 * Displays detailed information about an employee's job level
 */
const JobLevelDrawerContent: React.FC<JobLevelDrawerContentProps> = ({ employee, isVisible = false, accessToken }) => {
  // Get the job level name
  const jobLevelName = employee?.employeePosition?.jobPosition?.jobLevel?.name || 'N/A'

  // Fetch the number of employees with the same job level, only when drawer is visible
  const {
    employeeCount,
    loading: loadingEmployeeCount,
    error: employeeCountError
  } = useJobLevelEmployeeCount(
    accessToken,
    isVisible ? jobLevelName : '' // Only fetch when drawer is visible
  )

  return (
    <div className="gba:space-y-6" data-testid="job-level-drawer-content">
      <div>
        <h4 className="gba:font-medium gba:mb-3 gba:text-gray-700">Usage</h4>
        <div className="gba:grid gba:grid-cols-2 gba:gap-4">
          <div
            className="gba:bg-blue-50 gba:p-4 gba:rounded-md gba:border gba:bg-gray-50"
            data-testid="job-level-employee-count"
          >
            <div className="gba:text-sm gba:text-gray-500">Employees</div>
            {loadingEmployeeCount ? (
              <Spinner size="sm" data-testid="job-level-employee-count-loading" />
            ) : employeeCountError ? (
              <div className="gba:text-red-500 gba:text-sm" data-testid="job-level-employee-count-error">
                Error
              </div>
            ) : (
              <div className="gba:text-2xl gba:font-semibold gba:mt-1" data-testid="job-level-employee-count-value">
                {employeeCount ?? 0}
              </div>
            )}
          </div>
        </div>
      </div>

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
export const getJobLevelIcon = () => <PiListNumbers className="gba:h-5 gba:w-5" />

// Export the title to use for the drawer
export const getJobLevelTitle = (employee: Employee) =>
  employee?.employeePosition?.jobPosition?.jobLevel?.name || 'Not assigned'

export default JobLevelDrawerContent
