import type { EmployeeLiteOption } from '@/common/data/employee/useEmployeeSearch'
import type { PermissionOption, SharedEntityUser } from '../types'

export function getInitials(name: string): string {
  return name
    .split(' ')
    .map(part => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

export function getShareIdentifier(user: SharedEntityUser): string | undefined {
  return user.shareId || ((user as SharedEntityUser & { id?: string }).id ?? undefined)
}

export function getEntityLabelKey(entityType: string): string {
  if (entityType === 'spreadsheet_app') return 'entity-label-spreadsheet'
  return `entity-label-${entityType}`
}

export function formatRelativeDate(
  dateString: string,
  t: (key: string, vars?: Record<string, unknown>) => string
): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffDays === 0) {
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    if (diffHours === 0) return t('time-just-now')
    return t('time-hours-ago', { count: diffHours })
  }

  if (diffDays === 1) return t('time-yesterday')
  if (diffDays < 7) return t('time-days-short-ago', { count: diffDays })

  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export function buildPermissionMap(permissionOptions: PermissionOption[]): Map<string, PermissionOption> {
  return new Map(permissionOptions.map(option => [option.id, option]))
}

export function filterShareResults(options: {
  currentUserId: string
  searchResults: EmployeeLiteOption[] | undefined
  selectedUsers: EmployeeLiteOption[]
  sharedUsers: SharedEntityUser[]
}): EmployeeLiteOption[] {
  const selectedIds = new Set(options.selectedUsers.map(user => user.userId))
  const sharedIds = new Set(options.sharedUsers.map(user => user.userId))

  return (options.searchResults || []).filter(
    employee =>
      employee.userId !== options.currentUserId && !selectedIds.has(employee.userId) && !sharedIds.has(employee.userId)
  )
}
