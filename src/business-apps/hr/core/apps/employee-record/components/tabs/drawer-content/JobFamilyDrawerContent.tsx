'use client'

import React from 'react'
import { PiStack, PiUsers } from 'react-icons/pi'
import { navigateTo } from '@/common/utils/navigationUtils'
import { Employee } from '../../../hooks/useEmployeeData'
import { getCatalogValue, getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { useOrganizationalChildUnits } from '../../../hooks/useOrganizationalChildUnits'
import { Button, Spinner } from '@newwork/nw-design-system'

// Define the complete types to fix lint errors
type OrganizationalUnit = {
  id?: string
  name?: string
  description?: string
  organizationalUnitEmployeeAggregate?: {
    aggregate?: {
      count?: number
    }
  }
}

// Define JobFamily type
type JobFamily = {
  value?: string
}

// Define JobFunction type
type JobFunction = {
  id?: string
  name?: string
  jobFamily?: JobFamily
}

// Define JobPosition type
type JobPosition = {
  id?: string
  name?: string
  jobFunction?: JobFunction
  jobLevel?: {
    id?: string
    name?: string
  }
}

interface JobFamilyDrawerContentProps {
  employee: Employee
  isVisible?: boolean
  accessToken: string
}

/**
 * Job Family Drawer Content Component
 * Displays detailed information about an employee's job family
 */
const JobFamilyDrawerContent: React.FC<JobFamilyDrawerContentProps> = ({
  employee,
  isVisible = false,
  accessToken
}) => {
  // For backward compatibility, also get organizational unit info
  const organizationalUnit = (employee.employeePosition?.organizationalUnit as OrganizationalUnit) || {}

  // Get employee count in this job family
  const employeeCount = organizationalUnit.organizationalUnitEmployeeAggregate?.aggregate?.count || 0

  // Access token is now properly passed from props

  // Use the new hook to get the child units count
  const {
    childUnitsCount,
    loading: loadingChildUnits,
    error: childUnitsError
  } = useOrganizationalChildUnits(accessToken, organizationalUnit.id || '')

  // Show loading spinner only if visible and loading any data
  if (isVisible && loadingChildUnits) {
    return <Spinner data-testid="job-family-drawer-loading" />
  }

  // Show error only if visible and any error occurred
  if (isVisible && childUnitsError) {
    return <div data-testid="job-family-drawer-error">Error: {childUnitsError?.message}</div>
  }
  return (
    <div className="gba:space-y-6" data-testid="job-family-drawer-content">
      {/* Usage section */}
      <div>
        <h4 className="gba:font-medium gba:mb-3 gba:text-foreground">Usage</h4>
        <div className="gba:grid gba:grid-cols-2 gba:gap-4">
          {/* First box - always Employees */}
          <div className="gba:bg-info-secondary gba:p-4 gba:rounded-md gba:border">
            <div className="gba:text-sm gba:text-muted-foreground">Employees</div>
            <div className="gba:text-2xl gba:font-semibold gba:mt-1">{employeeCount}</div>
          </div>

          {/* Second box - Child Families for Job Family */}
          <div className="gba:bg-info-secondary gba:p-4 gba:rounded-md gba:border" data-testid="child-units-count">
            <div className="gba:text-sm gba:text-muted-foreground">Child Families</div>
            <div className="gba:text-2xl gba:font-semibold gba:mt-1">{childUnitsCount ?? 0}</div>
          </div>
        </div>
      </div>

      {/* Organization info */}

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
export const getJobFamilyIcon = () => <PiStack className="gba:h-5 gba:w-5" />

// Export the component and its title generator
export const getJobFamilyTitle = (employee: Employee) => {
  // Get job family from the updated data structure
  // Cast jobPosition to the defined type to avoid lint errors
  const jobPosition = employee.employeePosition?.jobPosition as JobPosition
  const jobFamily = jobPosition?.jobFunction?.jobFamily
  return (
    getCatalogValue(jobFamily) ||
    getTranslationFromI18nKeyAndLabel('lowcoder:employee_profile.left_side_bar.not_assigned', 'Not assigned')
  )
}

export default JobFamilyDrawerContent
