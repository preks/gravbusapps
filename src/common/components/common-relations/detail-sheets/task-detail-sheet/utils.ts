type BadgeVariant =
  | 'default'
  | 'destructive'
  | 'outline'
  | 'secondary'
  | 'success'
  | 'warning'
  | 'info'
  | 'pending'
  | 'running'
  | 'paid'
  | 'overdue'
  | 'offline'
  | 'aiGenerated'
  | 'aiModified'
  | 'action'
  | 'ext1'
  | 'ext2'
  | 'ext3'
  | 'ext4'
  | 'ext5'
  | 'ext6'
  | 'ext7'
  | 'ext8'

export const getTaskStatusBadgeVariant = (status: string): BadgeVariant => {
  if (!status) return 'default'

  const normalized = status.toUpperCase()

  // Handle backend status values with _TASK_STATUS suffix
  if (normalized.includes('COMPLETED') || normalized.includes('APPROVED')) {
    return 'success'
  }
  if (normalized.includes('REJECTED')) {
    return 'destructive'
  }
  if (normalized.includes('IN_PROGRESS') || normalized.includes('SCHEDULED')) {
    return 'info'
  }
  if (normalized.includes('PENDING')) {
    return 'pending'
  }
  if (normalized.includes('OVERDUE')) {
    return 'destructive'
  }

  return 'default'
}

export const getTaskPriorityBadgeVariant = (priority: string): BadgeVariant => {
  switch (priority?.toLowerCase()) {
    case 'urgent':
      return 'destructive'
    case 'high':
      return 'warning'
    case 'medium':
      return 'info'
    case 'low':
      return 'secondary'
    default:
      return 'default'
  }
}

export const getTaskTypeBadgeVariant = (type: string): BadgeVariant => {
  switch (type?.toLowerCase()) {
    case 'deadline':
      return 'warning'
    case 'scheduled':
      return 'info'
    default:
      return 'default'
  }
}

export const getReferenceTypeBadgeVariant = (type: string): BadgeVariant => {
  switch (type?.toLowerCase()) {
    case 'opportunity':
      return 'success'
    case 'account':
      return 'info'
    case 'lead':
      return 'warning'
    case 'contact':
      return 'secondary'
    case 'investment':
      return 'action'
    default:
      return 'default'
  }
}

/**
 * Format date string to display format (MMM DD, YYYY)
 * @param dateString - ISO date string
 * @returns Formatted date string or '-' if invalid
 */
export const formatDate = (dateString: string): string => {
  if (!dateString) return '-'
  const date = new Date(dateString)
  if (Number.isNaN(date.getTime())) return '-'

  const options: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  }
  return date.toLocaleDateString('en-US', options)
}

/**
 * Format date time string to display format (MMM DD, YYYY h:mm A)
 * @param dateString - ISO date string
 * @returns Formatted date time string or '-' if invalid
 */
export const formatDateTime = (dateString: string): string => {
  if (!dateString) return '-'
  const date = new Date(dateString)
  if (Number.isNaN(date.getTime())) return '-'

  const dateOptions: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  }
  const timeOptions: Intl.DateTimeFormatOptions = {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  }

  const dateStr = date.toLocaleDateString('en-US', dateOptions)
  const timeStr = date.toLocaleTimeString('en-US', timeOptions)
  return `${dateStr} ${timeStr}`
}

/**
 * Get initials from first and last name
 * @param firstName - Employee first name
 * @param lastName - Employee last name
 * @returns Uppercase initials (e.g., "JD")
 */
export const getInitials = (firstName: string, lastName: string): string => {
  const first = firstName?.charAt(0) || ''
  const last = lastName?.charAt(0) || ''
  return `${first}${last}`.toUpperCase()
}
