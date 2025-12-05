import React from 'react'
import flowSmall from '@/assets/icons/flowSmall.svg'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { Avatar, AvatarImage, AvatarFallback } from '@newwork/nw-design-system'
import type { EmployeeInfo } from '../../components/FormHeader'

interface FormHeaderProps {
  employee?: EmployeeInfo | null
}

export const FormHeader: React.FC<FormHeaderProps> = ({ employee }) => {
  const employeeFullName = employee ? `${employee.firstName || ''} ${employee.lastName || ''}`.trim() : ''

  return (
    <>
      {/* Title Header */}
      <div className="gba:flex gba:items-center gba:gap-2 gba:-mx-6 gba:px-6 gba:py-6">
        <img src={flowSmall} alt="Flow Small" className="gba:w-6 gba:h-6" style={{ filter: 'brightness(0)' }} />
        <h2 className="gba:text-xl gba:font-semibold gba:text-foreground">
          {getTranslationFromI18nKeyAndLabel('lowcoder:communication_form.title', 'Change Private Communication')}
        </h2>
      </div>

      {/* Employee Header */}
      {employee && (
        <>
          <div className="gba:flex gba:items-center gba:gap-3 gba:-mx-6 gba:px-6 gba:pb-4">
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
