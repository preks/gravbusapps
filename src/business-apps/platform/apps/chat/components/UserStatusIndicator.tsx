import React from 'react'
import { UserPresenceStatus, SystemPresenceStatus, UserStatus } from '../types'
import {
  Check as CheckIcon,
  Minus,
  ProhibitInset,
  Clock,
  MoonStars,
  EyeSlash,
  Users,
  PhoneCall,
  PresentationChart
} from '@phosphor-icons/react'

export interface UserStatusIndicatorProps {
  status?: UserStatus | string
  size?: 'sm' | 'md' | 'lg'
  showLabel?: boolean
  className?: string
}

// Status colors and icons with circular backgrounds
const STATUS_STYLES = {
  // Manual statuses
  [UserPresenceStatus.AVAILABLE]: {
    bgColor: 'gba:bg-success',
    label: 'Available',
    icon: 'available'
  },
  [UserPresenceStatus.BUSY]: {
    bgColor: 'gba:bg-destructive',
    label: 'Busy',
    icon: 'busy'
  },
  [UserPresenceStatus.DO_NOT_DISTURB]: {
    bgColor: 'gba:bg-destructive',
    label: 'Do not disturb',
    icon: 'dnd'
  },
  [UserPresenceStatus.BE_RIGHT_BACK]: {
    bgColor: 'gba:bg-warning-secondary',
    label: 'Be right back',
    icon: 'brb'
  },
  [UserPresenceStatus.APPEAR_AWAY]: {
    bgColor: 'gba:bg-warning',
    label: 'Away',
    icon: 'away'
  },
  [UserPresenceStatus.APPEAR_OFFLINE]: {
    bgColor: 'gba:bg-muted-foreground',
    label: 'Offline',
    icon: 'offline'
  },
  // System statuses
  [SystemPresenceStatus.IN_MEETING]: {
    bgColor: 'gba:bg-info',
    label: 'In a meeting',
    icon: 'meeting'
  },
  [SystemPresenceStatus.IN_CALL]: {
    bgColor: 'gba:bg-info',
    label: 'In a call',
    icon: 'call'
  },
  [SystemPresenceStatus.PRESENTING]: {
    bgColor: 'gba:bg-info',
    label: 'Presenting',
    icon: 'presenting'
  },
  offline: {
    bgColor: 'gba:bg-muted-foreground',
    label: 'Offline',
    icon: 'offline'
  }
}

const SIZE_MAP = {
  sm: { circle: 'gba:w-3 gba:h-3', icon: 8 },
  md: { circle: 'gba:w-4 gba:h-4', icon: 10 },
  lg: { circle: 'gba:w-5 gba:h-5', icon: 12 }
}

// Render the appropriate icon based on status
const renderStatusIcon = (iconType: string, iconSize: number) => {
  const iconProps = { size: iconSize, weight: 'bold' as const, className: 'gba:text-white' }

  switch (iconType) {
    case 'available':
      return <CheckIcon {...iconProps} />
    case 'busy':
      return <Minus {...iconProps} />
    case 'dnd':
      return <ProhibitInset {...iconProps} />
    case 'brb':
      return <Clock {...iconProps} />
    case 'away':
      return <MoonStars {...iconProps} />
    case 'offline':
      return <EyeSlash {...iconProps} />
    case 'meeting':
      return <Users {...iconProps} />
    case 'call':
      return <PhoneCall {...iconProps} />
    case 'presenting':
      return <PresentationChart {...iconProps} />
    default:
      return <CheckIcon {...iconProps} />
  }
}

export const UserStatusIndicator: React.FC<UserStatusIndicatorProps> = ({
  status,
  size = 'md',
  showLabel = false,
  className = ''
}) => {
  // Get status string from UserStatus object or use as string
  const statusString = typeof status === 'object' ? status.status : status

  // Default to offline if no status
  const config = statusString ? STATUS_STYLES[statusString as keyof typeof STATUS_STYLES] : STATUS_STYLES['offline']

  if (!config) {
    return null
  }

  const { circle: circleSize, icon: iconSize } = SIZE_MAP[size]

  return (
    <div className={`gba:flex gba:items-center gba:gap-2 ${className}`}>
      {/* Status Icon with Circular Background */}
      <div
        className={`${circleSize} gba:rounded-full ${config.bgColor} gba:flex gba:items-center gba:justify-center gba:flex-shrink-0`}
      >
        {renderStatusIcon(config.icon, iconSize)}
      </div>

      {/* Optional Label */}
      {showLabel && <span className="gba:text-sm gba:text-foreground">{config.label}</span>}
    </div>
  )
}

// Utility function to get status label
export const getStatusLabel = (status?: UserStatus | string): string => {
  const statusString = typeof status === 'object' ? status.status : status
  const config = statusString ? STATUS_STYLES[statusString as keyof typeof STATUS_STYLES] : STATUS_STYLES['offline']
  return config?.label || 'Offline'
}
