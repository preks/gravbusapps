/**
 * ScheduleMeetingButton - Button to schedule a meeting with space members
 *
 * Navigates to the calendar with space context to create a meeting
 */

import React, { useCallback } from 'react'
import { Button, useTranslation } from '@newwork/nw-design-system'
import { CalendarPlus } from '@phosphor-icons/react'
import { navigateTo, buildPlatformUrl } from '@/common/utils/navigationUtils'
import type { LinkedCalendar, SpaceMember } from '../types/space.types'
import translations from '../_i18n'

type ScheduleMeetingMember = SpaceMember & {
  userName?: string
}

export interface ScheduleMeetingButtonProps {
  /** Space ID for context */
  spaceId: string
  /** Space name for meeting title suggestion */
  spaceName: string
  /** Members to invite to the meeting */
  members: ScheduleMeetingMember[]
  /** Shared calendar linked to this space dimension */
  linkedCalendar: LinkedCalendar | null
  /** Button variant */
  variant?: 'default' | 'outline' | 'secondary' | 'ghost'
  /** Button size */
  size?: 'default' | 'sm' | 'lg' | 'icon'
  /** Additional CSS classes */
  className?: string
  /** Whether the button is disabled */
  disabled?: boolean
  'data-testid'?: string
}

export const ScheduleMeetingButton: React.FC<ScheduleMeetingButtonProps> = ({
  spaceId,
  spaceName,
  members,
  linkedCalendar,
  variant = 'secondary',
  size = 'sm',
  className,
  disabled = false,
  'data-testid': testId = 'schedule-meeting-button'
}) => {
  const { t } = useTranslation(translations)
  const handleScheduleMeeting = useCallback(() => {
    // Navigate to calendar tab in chat with meeting creation context
    const isProduction = process.env.NODE_ENV === 'production'
    const chatPath = isProduction ? '/platform/chat' : '/platform/apps/chat'

    // Build URL params for meeting creation
    const params = new URLSearchParams({
      view: 'calendar',
      action: 'createMeeting',
      spaceId,
      meetingTitle: t('calendar-meeting-title', { spaceName })
    })

    if (linkedCalendar?.id) {
      params.set('calendarId', linkedCalendar.id)
      params.set('calendarIds', linkedCalendar.id)
      params.set('includePersonal', 'false')
    }

    // Add member IDs as comma-separated list
    if (members.length > 0) {
      params.set('participantIds', members.map(m => m.userId).join(','))
      params.set(
        'participantDrafts',
        JSON.stringify(
          members.map(member => ({
            userId: member.userId,
            displayName: member.userName
          }))
        )
      )
    }

    navigateTo(buildPlatformUrl(`${chatPath}?${params.toString()}`))
  }, [linkedCalendar?.id, members, spaceId, spaceName, t])

  return (
    <Button
      variant={variant}
      size={size}
      className={className}
      onClick={handleScheduleMeeting}
      disabled={disabled || members.length === 0 || !linkedCalendar?.id || !linkedCalendar.canEdit}
      data-testid={testId}
    >
      <CalendarPlus className="gba:w-4 gba:h-4 gba:mr-2" />
      {t('common-schedule-meeting')}
    </Button>
  )
}

export default ScheduleMeetingButton
