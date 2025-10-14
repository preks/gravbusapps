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

/**
 * Get badge variant for task status
 */
export const getTaskStatusBadgeVariant = (status: string): BadgeVariant => {
  switch (status?.toLowerCase()) {
    case 'completed':
      return 'success'
    case 'in_progress':
      return 'running'
    case 'pending':
      return 'pending'
    case 'overdue':
      return 'destructive'
    default:
      return 'default'
  }
}

/**
 * Get badge variant for task priority
 */
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

/**
 * Get badge variant for task type
 */
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

/**
 * Get badge variant for reference type
 */
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
    default:
      return 'default'
  }
}
