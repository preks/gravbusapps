import React from 'react'
import { EntityCard } from '@/business-apps/platform/apps/every-ai/components/entities/EntityCard'
import { AvatarWithInitials } from '@/business-apps/platform/apps/every-ai/components/shared/AvatarWithInitials'
import { useEmployeeDetails } from '@/business-apps/platform/apps/every-ai/queries/employeeQueries'
import { getEntityUrl } from '@/business-apps/platform/apps/every-ai/components/links/EntityLink'
import { navigateTo } from '@/common/utils/navigationUtils'
import { dataStr, intentLabel, type ReferenceCardProps } from './referenceCardUtils'

/**
 * Rich employee card for the references rail: avatar, name, job title, team,
 * and manager — fetched client-side by id via `useEmployeeDetails` (the same
 * hook the inline employee chip uses, so its 5-minute cache is shared).
 *
 * Progressive enhancement: the backend-provided `reference.data` (team, role,
 * work_email) renders immediately and is the fallback when the fetch errors,
 * so the card is never empty.
 */
export const EmployeeReferenceCard: React.FC<ReferenceCardProps> = ({ reference, accessToken }) => {
  const { state } = useEmployeeDetails(reference.id, accessToken)

  const fallbackUrl = `/platform/employee-record?tab=assets&employeeId=${reference.id}`
  const url = getEntityUrl('employee', reference.id, reference.href) ?? fallbackUrl
  const open = () => navigateTo(url)
  const context = intentLabel(reference.intent)

  if (state.state === 'loading') {
    return (
      <EntityCard
        title={reference.label || reference.id}
        isLoading
        size="compact"
        surface="glass"
        onClick={open}
        data-testid="reference-card-employee"
      />
    )
  }

  const employee = state.state === 'success' ? state.employee : null
  const manager = state.state === 'success' ? state.manager : null

  const firstName = employee?.firstName ?? ''
  const lastName = employee?.lastName ?? ''
  const fetchedName = `${firstName} ${lastName}`.trim()
  const title = fetchedName || reference.label || reference.id

  const role = employee?.jobPositionName ?? dataStr(reference.data, 'role') ?? dataStr(reference.data, 'position_title')
  const team = dataStr(reference.data, 'team')
  const email = dataStr(reference.data, 'work_email')

  const fields: Array<{ label: string; value: string }> = []
  if (team) fields.push({ label: 'Team', value: team })
  if (manager) {
    const managerName = `${manager.firstName ?? ''} ${manager.lastName ?? ''}`.trim()
    if (managerName) fields.push({ label: 'Manager', value: managerName })
  } else if (email) {
    fields.push({ label: 'Email', value: email })
  }

  const subtitleParts = [context, role].filter(Boolean)

  return (
    <EntityCard
      title={title}
      subtitle={subtitleParts.length ? subtitleParts.join(' · ') : undefined}
      icon={
        <AvatarWithInitials
          firstName={firstName || (reference.label ?? '')}
          lastName={lastName}
          pictureThumbnail={employee?.pictureThumbnail}
          size={40}
        />
      }
      fields={fields.length ? fields : undefined}
      size="compact"
      surface="glass"
      onClick={open}
      data-testid="reference-card-employee"
    />
  )
}

export default EmployeeReferenceCard
