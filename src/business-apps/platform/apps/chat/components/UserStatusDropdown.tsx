import React, { useState } from 'react'
import { UserPresenceStatus } from '../types'
import { useUserStatus } from '../hooks/useUserStatus'
import type { ChatWebSocketClient } from '../services/chatWebSocketClient'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  cn
} from '@newwork/nw-design-system'
import {
  Check as CheckIcon,
  Minus,
  ProhibitInset,
  Clock,
  MoonStars,
  EyeSlash,
  Users,
  PhoneCall,
  PresentationChart,
  Check
} from '@phosphor-icons/react'

export interface UserStatusDropdownProps {
  client: ChatWebSocketClient | null
  isConnected: boolean
  currentUserId?: string | null
  onStatusChange?: (status: UserPresenceStatus) => void
  className?: string
}

// Status configuration with meaningful icons
const STATUS_CONFIG = {
  [UserPresenceStatus.AVAILABLE]: {
    label: 'Available',
    bgColor: 'gba:bg-success',
    icon: 'available'
  },
  [UserPresenceStatus.BUSY]: {
    label: 'Busy',
    bgColor: 'gba:bg-destructive',
    icon: 'busy'
  },
  [UserPresenceStatus.DO_NOT_DISTURB]: {
    label: 'Do not disturb',
    bgColor: 'gba:bg-destructive',
    icon: 'dnd'
  },
  [UserPresenceStatus.BE_RIGHT_BACK]: {
    label: 'Be right back',
    bgColor: 'gba:bg-warning-secondary',
    icon: 'brb'
  },
  [UserPresenceStatus.APPEAR_AWAY]: {
    label: 'Appear away',
    bgColor: 'gba:bg-warning',
    icon: 'away'
  },
  [UserPresenceStatus.APPEAR_OFFLINE]: {
    label: 'Appear offline',
    bgColor: 'gba:bg-muted-foreground',
    icon: 'offline'
  }
}

// System status configuration (read-only)
const SYSTEM_STATUS_CONFIG = {
  in_meeting: {
    label: 'In a meeting',
    bgColor: 'gba:bg-info',
    icon: 'meeting'
  },
  in_call: {
    label: 'In a call',
    bgColor: 'gba:bg-info',
    icon: 'call'
  },
  presenting: {
    label: 'Presenting',
    bgColor: 'gba:bg-info',
    icon: 'presenting'
  }
}

// Status icon component with circular backgrounds
const StatusIcon: React.FC<{ config: (typeof STATUS_CONFIG)[UserPresenceStatus.AVAILABLE] }> = ({ config }) => {
  const iconSize = 10
  const circleSize = 'gba:w-4 gba:h-4'

  const renderIcon = () => {
    const iconProps = { size: iconSize, weight: 'bold' as const, className: 'gba:text-white' }

    switch (config.icon) {
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

  return (
    <div
      className={`${circleSize} gba:rounded-full ${config.bgColor} gba:flex gba:items-center gba:justify-center gba:flex-shrink-0`}
    >
      {renderIcon()}
    </div>
  )
}

export const UserStatusDropdown: React.FC<UserStatusDropdownProps> = ({
  onStatusChange,
  client,
  isConnected,
  currentUserId,
  className
}) => {
  const { myStatus, setStatus, isLoading } = useUserStatus({
    client,
    isConnected,
    currentUserId: currentUserId ?? undefined
  })
  const [isOpen, setIsOpen] = useState(false)
  const [statusMessage] = useState('')
  const dropdownRef = React.useRef<HTMLDivElement>(null)

  // Close dropdown when clicking outside
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  const handleStatusSelect = async (status: UserPresenceStatus) => {
    try {
      await setStatus(status, statusMessage || undefined)
      onStatusChange?.(status)
    } catch (error) {
      console.error('Failed to set status:', error)
    }
  }

  const getCurrentConfig = () => {
    if (!myStatus) return STATUS_CONFIG[UserPresenceStatus.AVAILABLE]

    if (myStatus.isSystemStatus) {
      return (
        SYSTEM_STATUS_CONFIG[myStatus.status as keyof typeof SYSTEM_STATUS_CONFIG] ||
        STATUS_CONFIG[UserPresenceStatus.AVAILABLE]
      )
    }

    return STATUS_CONFIG[myStatus.status as UserPresenceStatus] || STATUS_CONFIG[UserPresenceStatus.AVAILABLE]
  }

  const currentConfig = getCurrentConfig()
  const currentStatusString = myStatus?.status || UserPresenceStatus.AVAILABLE

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className={cn(
            'gba:flex gba:items-center gba:gap-1 gba:px-1 gba:py-0.5 gba:rounded gba:hover:bg-accent/50 gba:transition-colors',
            className
          )}
          data-testid="chat-user-status-trigger"
        >
          <StatusIcon config={currentConfig} />
          <svg
            className="gba:w-3 gba:h-3 gba:text-muted-foreground"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="start" className="gba:w-56">
        {/* Show current system status if active */}
        {myStatus?.isSystemStatus && (
          <>
            <div className="gba:px-2 gba:py-2 gba:text-xs gba:text-muted-foreground">
              Current status (system managed)
            </div>
            <DropdownMenuItem className="gba:flex gba:items-center gba:gap-3" disabled>
              <StatusIcon config={currentConfig} />
              <span className="gba:flex-1">{currentConfig.label}</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <div className="gba:px-2 gba:py-2 gba:text-xs gba:text-muted-foreground">Set manual status</div>
          </>
        )}

        {/* Manual status options */}
        {Object.entries(STATUS_CONFIG).map(([status, config]) => {
          const isActive = !myStatus?.isSystemStatus && currentStatusString === status

          return (
            <DropdownMenuItem
              key={status}
              onClick={() => handleStatusSelect(status as UserPresenceStatus)}
              disabled={isLoading}
              className="gba:flex gba:items-center gba:gap-3"
              data-testid={`chat-user-status-option-${status}`}
            >
              <StatusIcon config={config} />
              <span className="gba:flex-1">{config.label}</span>
              {isActive && <Check className="gba:w-4 gba:h-4 gba:text-primary" />}
            </DropdownMenuItem>
          )
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
