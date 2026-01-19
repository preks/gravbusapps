// TODO: REMOVE THIS COMPONENT, USE AVATAR CELLS INSTEAD
import React from 'react'
import { Avatar, AvatarImage, AvatarFallback } from '@newwork/nw-design-system'
import { buildPlatformUrl, navigateTo } from '@/common/utils/navigationUtils'

interface OwnerEmployee {
  id?: string
  displayName?: string
  firstName?: string
  lastName?: string
  pictureThumbnail?: string
}

interface OwnerDisplayProps {
  ownerEmployee?: OwnerEmployee | null
  entityId: string
  testIdPrefix: string
}

/**
 * Renders an owner display with avatar and name that redirects to employee record on click
 * Includes the nice hover effect with rounded border on avatar
 */
export const OwnerDisplay: React.FC<OwnerDisplayProps> = ({ ownerEmployee, entityId, testIdPrefix }) => {
  const getOwnerName = (employee?: OwnerEmployee | null): string => {
    if (!employee) return 'N/A'

    if (employee.displayName) return employee.displayName

    if (employee.firstName && employee.lastName) {
      return `${employee.firstName} ${employee.lastName}`
    }

    return 'N/A'
  }

  const getOwnerInitials = (employee?: OwnerEmployee | null): string => {
    const name = getOwnerName(employee)
    if (name === 'N/A') return 'NA'

    return name
      .split(' ')
      .map((n: string) => n[0])
      .join('')
      .toUpperCase()
  }

  if (!ownerEmployee) {
    return (
      <div
        className="gba:flex gba:items-center gba:gap-2"
        data-testid={`${testIdPrefix}-owner-placeholder-${entityId}`}
      >
        <Avatar size="sm" className="gba:opacity-50">
          <AvatarFallback>NA</AvatarFallback>
        </Avatar>
        <span className="gba:text-[color:var(--nw-color-text-disabled)]">N/A</span>
      </div>
    )
  }

  return (
    <div
      className="gba:flex gba:items-center gba:gap-2 gba:cursor-pointer hover:gba:bg-transparent focus:gba:bg-transparent gba:group"
      data-testid={`${testIdPrefix}-owner-link-${entityId}`}
      onClick={e => {
        e.stopPropagation()
        const empId = ownerEmployee?.id
        if (empId) {
          const employeeUrl = buildPlatformUrl('/platform/employee-record', { employeeId: empId })
          navigateTo(employeeUrl)
        }
      }}
    >
      <Avatar
        size="sm"
        className="gba:outline gba:outline-2 gba:outline-offset-2 gba:outline-transparent gba:group-hover:[outline-color:var(--nw-color-primary-500)] gba:rounded-full"
      >
        {ownerEmployee.pictureThumbnail && (
          <AvatarImage
            src={`data:image/jpeg;base64,${ownerEmployee.pictureThumbnail}`}
            alt={getOwnerName(ownerEmployee)}
          />
        )}
        <AvatarFallback>{getOwnerInitials(ownerEmployee)}</AvatarFallback>
      </Avatar>
      <span className="gba:text-[color:var(--nw-color-text-primary)] group-hover:gba:text-[color:var(--nw-color-primary-500)]">
        {getOwnerName(ownerEmployee)}
      </span>
    </div>
  )
}
