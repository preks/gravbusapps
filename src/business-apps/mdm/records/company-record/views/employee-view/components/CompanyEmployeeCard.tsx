/**
 * Company Employee Card Component
 * Displays an employee card for company employees
 */
import React from 'react'
import { Avatar, AvatarImage, AvatarFallback } from '@newwork/nw-design-system'
import { OfficeChairIcon, BuildingsIcon } from '@phosphor-icons/react'
import type { CompanyEmployee } from '@/common/data/orgchart/hooks/useCompanyEmployees'

export interface CompanyEmployeeCardProps {
  employee: CompanyEmployee
  isSelected?: boolean
}

export const CompanyEmployeeCard: React.FC<CompanyEmployeeCardProps> = ({ employee, isSelected = false }) => {
  const employeeData = employee.employee
  if (!employeeData) return null

  const displayName =
    employeeData.displayName ||
    employeeData.fullName ||
    `${employeeData.firstName || ''} ${employeeData.lastName || ''}`.trim() ||
    'Unknown'

  const initials = `${employeeData.firstName?.[0] || ''}${employeeData.lastName?.[0] || ''}`.toUpperCase()

  const avatarSrc = employeeData.pictureThumbnail
    ? `data:image/jpeg;base64,${employeeData.pictureThumbnail}`
    : employeeData.picture
      ? `data:image/jpeg;base64,${employeeData.picture}`
      : undefined

  const jobTitle = employeeData.employeePosition?.jobPosition?.name || ''
  const organizationalUnit = employeeData.employeePosition?.organizationalUnit?.name || ''

  return (
    <div
      className={`gba:relative gba:group gba:bg-card gba:rounded-lg gba:shadow-lg gba:border gba:h-auto gba:w-full gba:transition gba:overflow-hidden ${
        isSelected ? 'gba:border-info gba:border-2 gba:shadow-xl' : 'gba:border-border'
      }`}
      data-testid={`company-employee-card-${employee.id}`}
    >
      <div className="gba:flex gba:flex-col gba:p-4">
        <div className="gba:flex gba:mb-3">
          <div className="gba:mr-3">
            <Avatar className="gba:w-12 gba:h-12">
              {avatarSrc && <AvatarImage src={avatarSrc} alt={displayName} />}
              <AvatarFallback className="gba:text-sm gba:font-medium">{initials}</AvatarFallback>
            </Avatar>
          </div>
          <div className="gba:flex gba:flex-col gba:justify-center gba:min-w-0">
            <div
              className="gba:font-semibold gba:truncate gba:w-full"
              style={{
                fontSize: 'clamp(1rem, 2vw, 1.125rem)',
                lineHeight: 1.2,
                maxWidth: '100%',
                minWidth: 0,
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis'
              }}
              title={displayName}
            >
              {displayName}
            </div>

            {jobTitle && (
              <div className="gba:flex gba:items-center gba:mt-1 gba:text-xs">
                <OfficeChairIcon weight="bold" className="gba:text-muted-foreground gba:mr-1.5" size={14} />
                <span className="gba:truncate" title={jobTitle}>
                  {jobTitle}
                </span>
              </div>
            )}

            {organizationalUnit && (
              <div className="gba:flex gba:items-center gba:mt-1 gba:text-xs">
                <BuildingsIcon weight="bold" className="gba:text-muted-foreground gba:mr-1.5" size={14} />
                <span className="gba:truncate" title={organizationalUnit}>
                  {organizationalUnit}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
