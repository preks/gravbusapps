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
  const normalized = status?.toUpperCase()

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
