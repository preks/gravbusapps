/**
 * TaskDetailHeader Component
 * Reusable header component for all task detail screens
 * Displays employee info (optional) and task title with badges
 *
 * Features:
 * - Automatic employee data fetching when employeeId/userId is provided
 * - Manual employee data override via employeeData prop
 * - Sticky positioning with proper negative margins
 * - Support for custom badges and close button
 *
 * Usage with auto-fetching:
 * ```tsx
 * <TaskDetailHeader
 *   title="Approve Vacation Request"
 *   employeeId="uuid-here"
 *   accessToken={context.accessToken}
 *   showEmployeeInfo
 * />
 * ```
 *
 * Usage with manual data:
 * ```tsx
 * <TaskDetailHeader
 *   title="Task Title"
 *   employeeData={{ displayName: 'John Doe', avatarUrl: '...' }}
 *   showEmployeeInfo
 * />
 * ```
 */

import React, { useState, useEffect } from 'react'
import { Button, Avatar, AvatarImage, AvatarFallback } from '@newwork/nw-design-system'
import { X } from 'lucide-react'
import { getInitials } from '../utils/avatarUtils'
import { useEmployeeData } from '../hooks/useEmployeeData'

// Helper function to get initials from employee data or creator name
const getAvatarInitials = (
  employeeData?: { firstName?: string; lastName?: string; displayName?: string } | null,
  creatorName?: string
): string => {
  if (employeeData?.firstName || employeeData?.lastName) {
    return getInitials(employeeData.firstName, employeeData.lastName)
  }
  if (employeeData?.displayName) {
    const parts = employeeData.displayName.split(' ')
    return getInitials(parts[0], parts.slice(1).join(' '))
  }
  if (creatorName) {
    const parts = creatorName.split(' ')
    return getInitials(parts[0], parts.slice(1).join(' '))
  }
  return '?'
}

export interface TaskDetailHeaderProps {
  // Task info (required)
  title: string

  // Employee auto-fetching (provide either employeeId or userId)
  employeeId?: string // UUID of employee to fetch
  userId?: string // Alternative: UUID of user to fetch
  accessToken?: string // Required for auto-fetching

  // Employee info (manual override - skips auto-fetching)
  employeeData?: {
    displayName: string
    firstName?: string
    lastName?: string
    avatarUrl?: string
    position?: string // Optional position/role info
  }
  isLoadingEmployee?: boolean // Manual loading state (ignored if auto-fetching)
  creatorName?: string // Fallback name if fetching fails

  // Layout options
  showEmployeeInfo?: boolean // Whether to show employee section above title

  // Callbacks
  onClose?: () => void // Optional - for close button if needed
}

export const TaskDetailHeader: React.FC<TaskDetailHeaderProps> = ({
  title,
  employeeId,
  userId,
  accessToken,
  employeeData: manualEmployeeData,
  isLoadingEmployee: manualIsLoadingEmployee = false,
  creatorName,
  showEmployeeInfo = false,
  onClose
}) => {
  // Auto-fetch employee data if IDs are provided and no manual data exists
  const shouldAutoFetch = showEmployeeInfo && !manualEmployeeData && (employeeId || userId) && accessToken

  const {
    employeeData: fetchedEmployeeData,
    isLoading: isFetchingEmployee,
    error: fetchError
  } = useEmployeeData({
    employeeId,
    userId,
    accessToken: accessToken || '',
    fallbackName: creatorName,
    skip: !shouldAutoFetch
  })

  // Determine which employee data to use
  const employeeData = manualEmployeeData || fetchedEmployeeData
  const isLoadingEmployee = manualEmployeeData ? manualIsLoadingEmployee : isFetchingEmployee

  // Avatar image preload state to prevent initials flicker
  const [avatarStatus, setAvatarStatus] = useState<'idle' | 'loading' | 'loaded' | 'error'>('idle')

  useEffect(() => {
    if (typeof window === 'undefined') return

    const avatarUrl = employeeData?.avatarUrl
    if (!avatarUrl) {
      setAvatarStatus('error')
      return
    }

    setAvatarStatus('loading')

    const img = new Image()
    img.src = avatarUrl

    const handleLoad = () => setAvatarStatus('loaded')
    const handleError = () => setAvatarStatus('error')

    img.addEventListener('load', handleLoad)
    img.addEventListener('error', handleError)

    return () => {
      img.removeEventListener('load', handleLoad)
      img.removeEventListener('error', handleError)
    }
  }, [employeeData?.avatarUrl])

  // Debug auto-fetch errors and data
  React.useEffect(() => {
    if (fetchError && shouldAutoFetch) {
      console.warn('[TaskDetailHeader] Failed to auto-fetch employee data:', fetchError)
    }
    if (employeeData && shouldAutoFetch) {
      console.log('[TaskDetailHeader] Auto-fetched employee data:', {
        displayName: employeeData.displayName,
        position: employeeData.position,
        hasPosition: !!employeeData.position,
        employeeId,
        userId
      })
    }
  }, [fetchError, shouldAutoFetch, employeeData, employeeId, userId])

  const shouldShowEmployee = showEmployeeInfo && (employeeData || isLoadingEmployee || creatorName)

  // Determine what to show in avatar
  const showAvatarImage = avatarStatus === 'loaded' && !!employeeData?.avatarUrl
  const showAvatarFallback = !isLoadingEmployee && (!employeeData?.avatarUrl || avatarStatus === 'error')

  return (
    <div className="gba:z-40 gba:bg-card/95 gba:backdrop-blur-sm gba:border-b gba:shadow-sm gba:py-0 gba:mb-2 gba:sticky gba:top-0 gba:-mx-6 gba:w-[calc(100%+3rem)]">
      <div className="gba:px-6 gba:py-4 gba:flex gba:items-center gba:justify-between gba:gap-4">
        {/* Left: Employee Context (if exists) */}
        {shouldShowEmployee && (
          <div
            className="gba:flex gba:items-center gba:gap-2 gba:flex-shrink-0"
            style={{ minWidth: '200px', maxWidth: '30%' }}
          >
            {isLoadingEmployee ? (
              <div className="gba:h-9 gba:w-9 gba:rounded-full gba:bg-muted gba:animate-pulse gba:flex-shrink-0" />
            ) : (
              <Avatar className="gba:h-9 gba:w-9 gba:flex-shrink-0">
                {/* 
                  Avatar rendering rules:
                  - While image is loading: show nothing (empty avatar to avoid initials flicker)
                  - On successful load: show AvatarImage
                  - On error or missing URL: show initials in AvatarFallback
                */}
                {showAvatarImage && (
                  <AvatarImage src={employeeData?.avatarUrl} alt={employeeData?.displayName || 'Employee avatar'} />
                )}
                {showAvatarFallback && (
                  <AvatarFallback className="gba:bg-gradient-to-br gba:from-blue-500 gba:to-purple-600 gba:text-white gba:text-xs">
                    {getAvatarInitials(employeeData, creatorName)}
                  </AvatarFallback>
                )}
              </Avatar>
            )}
            <div className="gba:flex-1 gba:min-w-0">
              <p
                className="gba:font-semibold gba:text-sm gba:leading-tight gba:line-clamp-1"
                style={{ wordBreak: 'break-word' }}
              >
                {isLoadingEmployee ? (
                  <span className="gba:inline-block gba:h-4 gba:w-32 gba:bg-muted gba:rounded gba:animate-pulse" />
                ) : (
                  employeeData?.displayName || creatorName || 'Employee'
                )}
              </p>
              {employeeData?.position && !isLoadingEmployee && (
                <p className="gba:text-xs gba:text-muted-foreground gba:leading-tight gba:line-clamp-1">
                  {employeeData.position}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Center/Right: Title */}
        <div className="gba:flex-1 gba:min-w-0 gba:flex gba:items-center">
          <h2
            className="gba:text-lg gba:font-bold gba:leading-tight gba:line-clamp-2"
            style={{ wordBreak: 'break-word' }}
            data-testid="task-detail-title"
          >
            {title}
          </h2>
        </div>

        {/* Right: Close Button (optional) */}
        {onClose && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="gba:rounded-full gba:hover:bg-muted gba:flex-shrink-0"
            data-testid="task-detail-close-button"
          >
            <X className="gba:h-5 gba:w-5" />
          </Button>
        )}
      </div>
    </div>
  )
}
