import React from 'react'
import { useEmployeeDetails } from '../../queries/employeeQueries'
import { AvatarWithInitials } from '../shared/AvatarWithInitials'
import { BaseEntityLinkChip } from './BaseEntityLinkChip'
import { navigateTo } from '@/common/utils/navigationUtils'

interface EmployeeLinkChipProps {
  employeeId: string
  token: string
  children: React.ReactNode // Link text from markdown
}

const EmployeeLinkChip: React.FC<EmployeeLinkChipProps> = ({ employeeId, token, children }) => {
  const { state } = useEmployeeDetails(employeeId, token)

  // Loading state: show skeleton with link text
  if (state.state === 'loading') {
    return (
      <span className="gba:inline-flex gba:items-center gba:gap-1 gba:px-2 gba:py-0.5 gba:rounded-full gba:bg-muted gba:text-sm">
        <span className="gba:inline-block gba:h-5 gba:w-5 gba:rounded-full gba:bg-muted-foreground gba:animate-pulse" />
        <span className="gba:leading-none">{children}</span>
      </span>
    )
  }

  // Error state: show link text with error styling
  if (state.state === 'error') {
    return (
      <BaseEntityLinkChip url={`/platform/employee-record?employeeId=${employeeId}`} icon={<span>👤</span>}>
        {children}
      </BaseEntityLinkChip>
    )
  }

  // Success: show avatar thumbnail if available, otherwise emoji fallback
  const icon = state.employee.pictureThumbnail ? (
    <AvatarWithInitials
      firstName={state.employee.firstName}
      lastName={state.employee.lastName}
      pictureThumbnail={state.employee.pictureThumbnail}
      size={20}
    />
  ) : (
    <span>👤</span>
  )

  return (
    <BaseEntityLinkChip
      url={state.employee?.profileUrl || `/platform/employee-record?employeeId=${employeeId}`}
      icon={icon}
      onClick={e => {
        e.preventDefault()
        navigateTo(state.employee?.profileUrl || `/platform/employee-record?employeeId=${employeeId}`)
      }}
    >
      {children}
    </BaseEntityLinkChip>
  )
}

export default EmployeeLinkChip
