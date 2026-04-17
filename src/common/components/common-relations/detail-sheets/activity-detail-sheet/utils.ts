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

export const getActivityTypeBadgeVariant = (type: string): BadgeVariant => {
  if (!type) return 'default'

  switch (type.toLowerCase()) {
    case 'call':
      return 'info'
    case 'email':
      return 'success'
    case 'meeting':
      return 'warning'
    case 'task':
      return 'pending'
    default:
      return 'default'
  }
}
