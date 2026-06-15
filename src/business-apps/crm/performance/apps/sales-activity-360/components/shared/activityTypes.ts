const DEFAULT_ACTIVITY_TYPE = 'Task'

export const ACTIVITY_TYPE_TEXT_CLASSES: Record<string, string> = {
  Call: 'gba:text-primary',
  Email: 'gba:text-success',
  Meeting: 'gba:text-warning',
  Task: 'gba:text-secondary-foreground'
}

export const ACTIVITY_TYPE_BG_CLASSES: Record<string, string> = {
  Call: 'gba:bg-primary/10',
  Email: 'gba:bg-success/10',
  Meeting: 'gba:bg-warning/10',
  Task: 'gba:bg-secondary/10'
}

export const getActivityTypeTextClass = (activityType: string): string => {
  const normalizedType = activityType?.trim() || DEFAULT_ACTIVITY_TYPE
  return ACTIVITY_TYPE_TEXT_CLASSES[normalizedType] || ACTIVITY_TYPE_TEXT_CLASSES[DEFAULT_ACTIVITY_TYPE]
}

export const getActivityTypeBgClass = (activityType: string): string => {
  const normalizedType = activityType?.trim() || DEFAULT_ACTIVITY_TYPE
  return ACTIVITY_TYPE_BG_CLASSES[normalizedType] || ACTIVITY_TYPE_BG_CLASSES[DEFAULT_ACTIVITY_TYPE]
}
