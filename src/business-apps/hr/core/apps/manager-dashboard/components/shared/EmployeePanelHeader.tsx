import React from 'react'
import { Avatar, AvatarFallback, AvatarImage, Button, SheetHeader, SheetTitle } from '@newwork/nw-design-system'

interface EmployeeIdentity {
  firstName: string
  lastName: string
  pictureThumbnail?: string
  roleLabel?: string
}

interface EmployeePanelHeaderProps {
  title: string
  description?: string
  onClose: () => void
  employee?: EmployeeIdentity
}

const getAvatarSrc = (pictureThumbnail?: string): string | undefined =>
  pictureThumbnail && !pictureThumbnail.startsWith('{') ? `data:image/jpeg;base64,${pictureThumbnail}` : undefined

export const EmployeePanelHeader: React.FC<EmployeePanelHeaderProps> = ({ title, description, onClose, employee }) => {
  return (
    <SheetHeader className="gba:mb-4 gba:gap-0">
      <div className="gba:flex gba:items-start gba:justify-between gba:gap-3">
        <SheetTitle className="gba:text-xl gba:font-semibold">{title}</SheetTitle>
        <Button variant="ghost" size="sm" onClick={onClose} className="gba:h-7 gba:px-2">
          Close
        </Button>
      </div>

      {description && <p className="gba:pt-2 gba:text-sm gba:text-muted-foreground">{description}</p>}

      {employee && (
        <div className="gba:mt-3 gba:flex gba:items-center gba:gap-3 gba:rounded-lg gba:border gba:p-3">
          <Avatar className="gba:h-10 gba:w-10">
            <AvatarImage
              src={getAvatarSrc(employee.pictureThumbnail)}
              alt={`${employee.firstName} ${employee.lastName}`}
            />
            <AvatarFallback>
              {`${employee.firstName[0] ?? ''}${employee.lastName[0] ?? ''}`.toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="gba:min-w-0">
            <p className="gba:truncate gba:text-sm gba:font-medium">
              {employee.firstName} {employee.lastName}
            </p>
            {employee.roleLabel && (
              <p className="gba:truncate gba:text-xs gba:text-muted-foreground">{employee.roleLabel}</p>
            )}
          </div>
        </div>
      )}
    </SheetHeader>
  )
}
