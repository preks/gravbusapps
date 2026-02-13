import React, { useState, useMemo } from 'react'
import { UserPresenceStatus } from '../types'
import { useUserStatus } from '../hooks/useUserStatus'
import type { ChatWebSocketClient } from '../services/chatWebSocketClient'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  cn,
  Input,
  Button
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

// Duration presets for status message expiration
type DurationPreset =
  | { label: string; type: 'none' }
  | { label: string; type: 'minutes'; minutes: number }
  | { label: string; type: 'today' }
  | { label: string; type: 'week' }
  | { label: string; type: 'custom' }

const DURATION_PRESETS: DurationPreset[] = [
  { label: "Don't clear", type: 'none' },
  { label: '30 minutes', type: 'minutes', minutes: 30 },
  { label: '1 hour', type: 'minutes', minutes: 60 },
  { label: '4 hours', type: 'minutes', minutes: 240 },
  { label: 'Today', type: 'today' },
  { label: 'This week', type: 'week' },
  { label: 'Custom', type: 'custom' }
]

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
  const [statusMessage, setStatusMessage] = useState('')
  const [selectedDuration, setSelectedDuration] = useState<number | null>(null) // Duration in minutes or null for no expiration
  const [customExpiresAt, setCustomExpiresAt] = useState<Date | null>(null) // Custom expiration date/time
  const [showCustomTimePicker, setShowCustomTimePicker] = useState(false)
  const [showStatusMessageInput, setShowStatusMessageInput] = useState(false)
  const dropdownRef = React.useRef<HTMLDivElement>(null)
  const MAX_STATUS_MESSAGE_LENGTH = 100

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

  // Sync status message from myStatus
  React.useEffect(() => {
    if (myStatus?.statusMessage) {
      setStatusMessage(myStatus.statusMessage)
    } else {
      setStatusMessage('')
    }
  }, [myStatus?.statusMessage])

  // Calculate expiration date based on duration
  const calculateExpiresAt = (minutes: number | null): Date | undefined => {
    if (minutes === null) return undefined
    const now = new Date()
    return new Date(now.getTime() + minutes * 60 * 1000)
  }

  const handleStatusSelect = async (status: UserPresenceStatus) => {
    try {
      const expiresAt =
        customExpiresAt || (selectedDuration !== null ? calculateExpiresAt(selectedDuration) : undefined)
      await setStatus(status, statusMessage || undefined, expiresAt)
      onStatusChange?.(status)
    } catch (error) {
      console.error('Failed to set status:', error)
    }
  }

  const handleStatusMessageUpdate = async () => {
    if (myStatus) {
      try {
        const expiresAt =
          customExpiresAt || (selectedDuration !== null ? calculateExpiresAt(selectedDuration) : undefined)
        await setStatus(myStatus.status as UserPresenceStatus, statusMessage || undefined, expiresAt)
        setShowStatusMessageInput(false)
      } catch (error) {
        console.error('Failed to update status message:', error)
      }
    }
  }

  // Format custom date/time for input (must be in local timezone format for datetime-local)
  const getDateTimeLocalValue = (date: Date | null): string => {
    if (!date) {
      const now = new Date()
      now.setMinutes(now.getMinutes() + 30) // Default to 30 minutes from now
      // Format as YYYY-MM-DDTHH:mm in LOCAL timezone
      const year = now.getFullYear()
      const month = String(now.getMonth() + 1).padStart(2, '0')
      const day = String(now.getDate()).padStart(2, '0')
      const hours = String(now.getHours()).padStart(2, '0')
      const minutes = String(now.getMinutes()).padStart(2, '0')
      return `${year}-${month}-${day}T${hours}:${minutes}`
    }
    // Format existing date in LOCAL timezone
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    const hours = String(date.getHours()).padStart(2, '0')
    const minutes = String(date.getMinutes()).padStart(2, '0')
    return `${year}-${month}-${day}T${hours}:${minutes}`
  }

  // Get min value in local timezone format
  const getMinDateTimeLocal = (): string => {
    const now = new Date()
    const year = now.getFullYear()
    const month = String(now.getMonth() + 1).padStart(2, '0')
    const day = String(now.getDate()).padStart(2, '0')
    const hours = String(now.getHours()).padStart(2, '0')
    const minutes = String(now.getMinutes()).padStart(2, '0')
    return `${year}-${month}-${day}T${hours}:${minutes}`
  }

  const handleCustomTimeChange = (dateTimeString: string) => {
    // Parse the local datetime string to create a Date object in user's timezone
    // Format from input is: "YYYY-MM-DDTHH:mm" (always in user's local timezone)
    const selectedDate = new Date(dateTimeString)
    setCustomExpiresAt(selectedDate)
    // Calculate minutes for display purposes
    const now = new Date()
    const diffMinutes = Math.floor((selectedDate.getTime() - now.getTime()) / (60 * 1000))
    setSelectedDuration(diffMinutes)
  }

  // Validate that the expiration time is in the future
  const isExpirationValid = useMemo(() => {
    if (!showStatusMessageInput) return true // Not in editing mode
    if (!statusMessage.trim()) return false // Empty message

    // If custom time is selected, check it's in the future
    if (showCustomTimePicker && customExpiresAt) {
      const now = new Date()
      return customExpiresAt.getTime() > now.getTime()
    }

    // If preset duration is selected, it's always valid (calculated from now)
    return true
  }, [showStatusMessageInput, statusMessage, showCustomTimePicker, customExpiresAt])

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

      <DropdownMenuContent align="start" className="gba:w-64">
        {/* Current Status Message Display - Always show at top if exists */}
        {myStatus?.statusMessage && !showStatusMessageInput && (
          <>
            <div className="gba:px-3 gba:py-2 gba:bg-muted/50 gba:rounded-md gba:mx-2 gba:mt-2">
              <div className="gba:flex-1 gba:min-w-0">
                <div className="gba:text-xs gba:text-muted-foreground gba:mb-1">Status message</div>
                <div className="gba:text-sm gba:break-words gba:mb-1">{myStatus.statusMessage}</div>
                {/* Always show expiration info */}
                <div className="gba:text-xs gba:text-muted-foreground">
                  {myStatus.statusMessageExpiresAt ? (
                    <>
                      Clears{' '}
                      {(() => {
                        try {
                          const expiresAt = new Date(myStatus.statusMessageExpiresAt)
                          const now = new Date()
                          const diffMs = expiresAt.getTime() - now.getTime()

                          if (diffMs < 0) return 'soon'

                          const diffMinutes = Math.floor(diffMs / (1000 * 60))
                          const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
                          const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

                          if (diffMinutes < 1) {
                            return 'in less than a minute'
                          } else if (diffMinutes < 60) {
                            return `in ${diffMinutes} ${diffMinutes === 1 ? 'minute' : 'minutes'}`
                          } else if (diffHours < 24) {
                            return `in ${diffHours} ${diffHours === 1 ? 'hour' : 'hours'}`
                          } else {
                            return `in ${diffDays} ${diffDays === 1 ? 'day' : 'days'}`
                          }
                        } catch {
                          return ''
                        }
                      })()}
                    </>
                  ) : (
                    "Won't clear automatically"
                  )}
                </div>
              </div>
            </div>
            <DropdownMenuSeparator />
          </>
        )}

        {/* STATUS MESSAGE INPUT VIEW - Full screen when editing */}
        {showStatusMessageInput ? (
          <>
            <div className="gba:px-3 gba:py-3 gba:space-y-3" onClick={e => e.stopPropagation()}>
              {/* Message Input */}
              <div className="gba:space-y-1.5">
                <div className="gba:text-xs gba:text-muted-foreground">Status message</div>
                <Input
                  value={statusMessage}
                  onChange={e => setStatusMessage(e.target.value.slice(0, MAX_STATUS_MESSAGE_LENGTH))}
                  placeholder="What's your status?"
                  maxLength={MAX_STATUS_MESSAGE_LENGTH}
                  className="gba:h-9"
                  data-testid="chat-status-message-input"
                  autoFocus
                />
                <div className="gba:text-xs gba:text-muted-foreground">
                  {statusMessage.length}/{MAX_STATUS_MESSAGE_LENGTH}
                </div>
              </div>

              {/* Duration Selector */}
              <div className="gba:space-y-1.5">
                <div className="gba:text-xs gba:text-muted-foreground">Clear after</div>
                <div className="gba:grid gba:grid-cols-2 gba:gap-1.5">
                  {DURATION_PRESETS.map((preset, index) => {
                    const minutes =
                      preset.type === 'none'
                        ? null
                        : preset.type === 'custom'
                          ? customExpiresAt
                            ? Math.floor((customExpiresAt.getTime() - Date.now()) / (60 * 1000))
                            : null
                          : preset.type === 'minutes'
                            ? preset.minutes
                            : preset.type === 'today'
                              ? (() => {
                                  const now = new Date()
                                  const endOfDay = new Date(now)
                                  endOfDay.setHours(23, 59, 59, 999)
                                  return Math.floor((endOfDay.getTime() - Date.now()) / (60 * 1000))
                                })()
                              : (() => {
                                  const now = new Date()
                                  const endOfWeek = new Date(now)
                                  endOfWeek.setDate(now.getDate() + (7 - now.getDay()))
                                  endOfWeek.setHours(23, 59, 59, 999)
                                  return Math.floor((endOfWeek.getTime() - Date.now()) / (60 * 1000))
                                })()

                    const isSelected =
                      preset.type === 'custom'
                        ? showCustomTimePicker
                        : selectedDuration === minutes && !showCustomTimePicker

                    return (
                      <Button
                        key={index}
                        variant={isSelected ? 'default' : 'outline'}
                        size="sm"
                        onClick={e => {
                          e.preventDefault()
                          e.stopPropagation()
                          if (preset.type === 'custom') {
                            setShowCustomTimePicker(true)
                            setSelectedDuration(null)
                            setCustomExpiresAt(null)
                          } else {
                            setShowCustomTimePicker(false)
                            setCustomExpiresAt(null)
                            setSelectedDuration(minutes)
                          }
                        }}
                        className="gba:h-8 gba:text-xs gba:justify-start"
                        data-testid={`chat-duration-${preset.label.toLowerCase().replace(/\s+/g, '-')}`}
                      >
                        {preset.label}
                      </Button>
                    )
                  })}
                </div>

                {/* Custom Time Picker */}
                {showCustomTimePicker && (
                  <div className="gba:space-y-1.5 gba:pt-2">
                    <Input
                      type="datetime-local"
                      value={getDateTimeLocalValue(customExpiresAt)}
                      onChange={e => handleCustomTimeChange(e.target.value)}
                      min={getMinDateTimeLocal()}
                      className="gba:h-9"
                      data-testid="chat-custom-time-input"
                    />
                    {/* Show error if selected time is in the past */}
                    {customExpiresAt && customExpiresAt.getTime() <= Date.now() && (
                      <div className="gba:text-xs gba:text-destructive" data-testid="chat-custom-time-error">
                        Please select a time in the future
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="gba:flex gba:gap-2 gba:pt-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={e => {
                    e.preventDefault()
                    e.stopPropagation()
                    setShowStatusMessageInput(false)
                    setStatusMessage(myStatus?.statusMessage || '')
                    setSelectedDuration(null)
                    setCustomExpiresAt(null)
                    setShowCustomTimePicker(false)
                  }}
                  className="gba:flex-1 gba:h-8"
                >
                  Cancel
                </Button>
                <Button
                  variant="default"
                  size="sm"
                  onClick={e => {
                    e.preventDefault()
                    e.stopPropagation()
                    handleStatusMessageUpdate()
                  }}
                  disabled={isLoading || !isExpirationValid}
                  className="gba:flex-1 gba:h-8"
                  data-testid="chat-save-status-message"
                >
                  Save
                </Button>
              </div>
            </div>
          </>
        ) : (
          <>
            {/* STATUS SELECTION VIEW - Default view */}

            {/* Set Status Message Button - Prominent at top */}
            <div className="gba:px-2 gba:pt-2 gba:pb-1">
              <Button
                variant="outline"
                size="sm"
                onSelect={e => {
                  e.preventDefault()
                }}
                onClick={e => {
                  e.preventDefault()
                  e.stopPropagation()
                  setShowStatusMessageInput(true)
                }}
                className="gba:w-full gba:h-9 gba:justify-start gba:text-sm"
                data-testid="chat-set-status-message-button"
              >
                {myStatus?.statusMessage ? 'Edit status message' : 'Set status message'}
              </Button>
            </div>

            <DropdownMenuSeparator />

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
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
