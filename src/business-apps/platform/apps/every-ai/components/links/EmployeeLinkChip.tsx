import React from 'react'
import { useEmployeeDetails } from '../../queries/employeeQueries'
import { AvatarWithInitials } from '../shared/AvatarWithInitials'
import { navigateTo } from '@/common/utils/navigationUtils'

interface EmployeeLinkChipProps {
  employeeId: string
  token: string
}

const EmployeeLinkChip: React.FC<EmployeeLinkChipProps> = ({ employeeId, token }) => {
  const { state } = useEmployeeDetails(employeeId, token)

  if (state.state === 'loading') {
    return (
      <span className="gba:inline-flex gba:items-center gba:gap-1 gba:px-2 gba:py-0.5 gba:rounded-full gba:bg-muted gba:text-sm">
        <div className="gba:h-5 gba:w-5 gba:rounded-full gba:bg-muted-foreground gba:animate-pulse" />
        <div className="gba:w-10 gba:h-3 gba:bg-muted-foreground gba:animate-pulse gba:rounded" />
      </span>
    )
  }

  if (state.state === 'error') {
    return <span className="gba:text-destructive gba:text-sm">{state.message}</span>
  }

  const name = `${state.employee.firstName} ${state.employee.lastName}`

  return (
    <a
      href={state.employee?.profileUrl}
      data-testid={`every-ai-employee-link-chip-${state.employee.id}`}
      className="gba:inline-flex gba:items-center gba:gap-1 gba:px-2 gba:py-0.5 gba:rounded-full gba:bg-muted hover:gba:bg-accent gba:text-sm gba:cursor-pointer gba:transition-colors"
      onClick={e => {
        e.preventDefault()
        if (state.employee?.profileUrl) {
          navigateTo(state.employee.profileUrl)
        }
      }}
    >
      <AvatarWithInitials
        firstName={state.employee.firstName}
        lastName={state.employee.lastName}
        pictureThumbnail={state.employee.pictureThumbnail}
        size={20}
      />
      <span className="gba:leading-none">{name}</span>
    </a>
  )
}

export default EmployeeLinkChip
