import React from 'react'
import { Avatar, AvatarImage, AvatarFallback } from '@newwork/nw-design-system'

export interface EmployeeInfo {
  firstName?: string
  lastName?: string
  pictureThumbnail?: string
  jobTitle?: string
}

interface FormHeaderProps {
  title: string
  flowIconUrl: string
  className?: string
  employee?: EmployeeInfo | null
}

const FormHeader: React.FC<FormHeaderProps> = ({ title, flowIconUrl, className, employee }) => {
  const employeeFullName = employee ? `${employee.firstName || ''} ${employee.lastName || ''}`.trim() : ''

  return (
    <>
      {/* Title Header */}
      <div className={`gba:flex gba:items-center gba:gap-2 gba:px-6 gba:py-6 ${className || ''}`}>
        <img src={flowIconUrl} alt="Flow Small" className="gba:w-6 gba:h-6" style={{ filter: 'brightness(0)' }} />
        <h2 className="gba:text-xl gba:font-semibold gba:text-foreground">{title}</h2>
      </div>

      {/* Employee Header */}
      {employee && (
        <>
          <div className={`gba:flex gba:items-center gba:gap-3 gba:px-6 gba:pb-4 ${className || ''}`}>
            <Avatar className="gba:w-12 gba:h-12">
              <AvatarImage
                src={employee.pictureThumbnail ? `data:image/jpeg;base64,${employee.pictureThumbnail}` : undefined}
                alt={employeeFullName}
              />
              <AvatarFallback>
                {(employee.firstName?.[0] || '').toUpperCase()}
                {(employee.lastName?.[0] || '').toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="gba:flex gba:flex-col">
              <div className="gba:text-base gba:font-medium">{employeeFullName}</div>
              {employee.jobTitle && <div className="gba:text-sm gba:text-muted-foreground">{employee.jobTitle}</div>}
            </div>
          </div>
          <div className="gba:border-t gba:mb-6" />
        </>
      )}
    </>
  )
}

export default FormHeader
