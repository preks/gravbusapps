import React from 'react'
import { EntityCard } from '@/business-apps/platform/apps/every-ai/components/entities/EntityCard'
import { AvatarWithInitials } from '@/business-apps/platform/apps/every-ai/components/shared/AvatarWithInitials'
import { useEmployeeDetails } from '@/business-apps/platform/apps/every-ai/queries/employeeQueries'
import { getEntityUrl } from '@/business-apps/platform/apps/every-ai/components/links/EntityLink'
import { navigateTo } from '@/common/utils/navigationUtils'
import { dataStr, type ReferenceCardProps } from './referenceCardUtils'
import { useReferenceCardI18n } from './useReferenceCardI18n'

/**
 * Rich employee card for the references rail: avatar, name, job title, org
 * context, and manager — fetched client-side by id via `useEmployeeDetails`
 * (the same hook the inline employee chip uses, so its 5-minute cache is
 * shared).
 *
 * Progressive enhancement: the backend-provided `reference.data` (team, role,
 * work_email) renders immediately and is the fallback when the fetch errors,
 * so the card is never empty.
 */
export const EmployeeReferenceCard: React.FC<ReferenceCardProps> = ({ reference, accessToken }) => {
  const { field, intentLabel, t } = useReferenceCardI18n()
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

  // Org-chart context from the fetch, with backend-provided `reference.data` as
  // the fallback so the card still has substance if the by-id fetch is thin.
  const department = employee?.department ?? dataStr(reference.data, 'team') ?? dataStr(reference.data, 'department')
  const location = employee?.location ?? dataStr(reference.data, 'location')
  const company = employee?.company ?? dataStr(reference.data, 'company')
  const email = dataStr(reference.data, 'work_email')
  const hireYear = employee?.hireDate ? new Date(employee.hireDate).getFullYear() : undefined

  // Highest-signal facts inline; the manager relationship renders as its own
  // person-row footer rather than a flat label/value field.
  const fields: Array<{ label: string; value: string }> = []
  if (department) fields.push({ label: field('department'), value: department })
  if (location) fields.push({ label: field('location'), value: location })
  if (company) fields.push({ label: field('company'), value: company })
  if (hireYear && Number.isFinite(hireYear)) fields.push({ label: field('joined'), value: String(hireYear) })
  if (!fields.length && email) fields.push({ label: field('email'), value: email })

  const subtitleParts = [context, role].filter(Boolean)

  const managerName = manager ? `${manager.firstName ?? ''} ${manager.lastName ?? ''}`.trim() : ''
  const openManager = manager
    ? (event: React.MouseEvent) => {
        event.stopPropagation()
        navigateTo(getEntityUrl('employee', manager.id) ?? manager.profileUrl)
      }
    : undefined

  const footer =
    manager && managerName ? (
      <div
        role="button"
        tabIndex={0}
        onClick={openManager}
        onKeyDown={event => {
          if (event.key === 'Enter' || event.key === ' ') openManager?.(event as unknown as React.MouseEvent)
        }}
        className="gba:flex gba:items-center gba:gap-2.5 gba:-m-1 gba:p-1 gba:rounded-lg gba:cursor-pointer hover:gba:bg-muted/50 gba:transition-colors"
      >
        <AvatarWithInitials
          firstName={manager.firstName ?? ''}
          lastName={manager.lastName ?? ''}
          pictureThumbnail={manager.pictureThumbnail}
          size={28}
        />
        <div className="gba:min-w-0 gba:flex gba:items-baseline gba:gap-1.5 gba:flex-wrap">
          <span className="gba:text-[10px] gba:font-medium gba:uppercase gba:tracking-wide gba:text-muted-foreground">
            {t('renderer-ref-reports-to')}
          </span>
          <span className="gba:text-xs gba:font-semibold gba:text-foreground gba:truncate">{managerName}</span>
          {manager.jobPositionName && (
            <span className="gba:text-xs gba:text-muted-foreground gba:truncate">· {manager.jobPositionName}</span>
          )}
        </div>
      </div>
    ) : undefined

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
      footer={footer}
      size="compact"
      surface="glass"
      onClick={open}
      data-testid="reference-card-employee"
    />
  )
}

export default EmployeeReferenceCard
