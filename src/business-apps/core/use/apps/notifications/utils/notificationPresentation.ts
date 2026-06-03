import type { ComponentType } from 'react'
import type { IconProps } from '@phosphor-icons/react'
import { BellSimpleIcon, CheckCircleIcon, InfoIcon, WarningIcon, XCircleIcon } from '@phosphor-icons/react'

type NotificationIcon = ComponentType<IconProps>

export type NotificationTone = 'default' | 'info' | 'success' | 'warning' | 'error'

export function resolveNotificationTone(classification?: string, type?: string): NotificationTone {
  const value = `${classification ?? ''} ${type ?? ''}`.toLowerCase()

  if (value.includes('error') || value.includes('fail') || value.includes('critical')) {
    return 'error'
  }
  if (value.includes('warn')) {
    return 'warning'
  }
  if (value.includes('success') || value.includes('complete') || value.includes('done')) {
    return 'success'
  }
  if (value.includes('info')) {
    return 'info'
  }

  return 'default'
}

export function getNotificationToneIcon(tone: NotificationTone): NotificationIcon {
  switch (tone) {
    case 'error':
      return XCircleIcon
    case 'warning':
      return WarningIcon
    case 'success':
      return CheckCircleIcon
    case 'info':
      return InfoIcon
    default:
      return BellSimpleIcon
  }
}

export function getNotificationToneBadgeVariant(
  tone: NotificationTone
): 'default' | 'secondary' | 'info' | 'success' | 'warning' | 'destructive' {
  switch (tone) {
    case 'error':
      return 'destructive'
    case 'warning':
      return 'warning'
    case 'success':
      return 'success'
    case 'info':
      return 'info'
    default:
      return 'secondary'
  }
}
