import React from 'react'
import { Avatar, AvatarImage, AvatarFallback } from '@newwork/nw-design-system'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'

interface EmployeeInfoSectionProps {
  code: string
  costCenterName?: string
  projectName?: string
  employee: {
    firstName?: string
    lastName?: string
    pictureThumbnail?: string
    employeePosition?: {
      jobPosition?: {
        name?: string
      }
    }
  }
  prefixDataTestId?: string
}

const EmployeeInfoSection: React.FC<EmployeeInfoSectionProps> = ({
  code,
  costCenterName,
  projectName,
  employee,
  prefixDataTestId = 'approve-expense'
}) => {
  return (
    <div
      className="gba:grid gba:grid-cols-2 gba:gap-8 gba:mb-6 gba:p-3"
      data-testid={`${prefixDataTestId}-employee-section`}
    >
      {/* Left side - Employee details */}
      <div data-testid={`${prefixDataTestId}-employee-details`}>
        <div>
          <span className="gba:text-muted-foreground gba:font-semibold">ID:</span>
          <span> {code}</span>
        </div>
        <div>
          <span className="gba:text-muted-foreground gba:font-semibold">
            {getTranslationFromI18nKeyAndLabel(
              'lowcoder:approve_expense_plan.id_cost_center_text',
              'Main Cost Center:'
            )}
          </span>
          <span> {costCenterName}</span>
        </div>
        {projectName && (
          <div>
            <span className="gba:text-muted-foreground gba:font-semibold">
              {getTranslationFromI18nKeyAndLabel(
                'lowcoder:create_expense_request.add_request_trip_details.main_project',
                'Main Project'
              )}
              :
            </span>
            <span> {projectName}</span>
          </div>
        )}
      </div>

      {/* Right side - Employee profile */}
      <div
        className="gba:flex gba:items-center gba:gap-3 gba:justify-start"
        data-testid={`${prefixDataTestId}-employee-profile`}
      >
        <Avatar className="gba:w-10 gba:h-10" data-testid={`${prefixDataTestId}-employee-avatar`}>
          <AvatarImage src={`data:image/jpeg;base64,${employee.pictureThumbnail}`} />
          <AvatarFallback>
            {employee.firstName?.[0]}
            {employee.lastName?.[0]}
          </AvatarFallback>
        </Avatar>
        <div>
          <div
            className="gba:text-sm gba:font-semibold gba:text-foreground"
            data-testid={`${prefixDataTestId}-employee-name`}
          >
            {employee.firstName} {employee.lastName}
          </div>
          <div
            className="gba:text-xs gba:font-normal gba:text-muted-foreground"
            data-testid={`${prefixDataTestId}-employee-role`}
          >
            {employee.employeePosition?.jobPosition?.name}
          </div>
        </div>
      </div>
    </div>
  )
}

export default EmployeeInfoSection
