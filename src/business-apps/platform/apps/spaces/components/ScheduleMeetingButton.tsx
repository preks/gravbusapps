/**
 * ScheduleMeetingButton - Button to schedule a meeting with space members
 *
 * Opens meeting scheduling for space members
 */

import React from 'react'
import { Button, useTranslation } from '@newwork/nw-design-system'
import { CalendarPlus } from '@phosphor-icons/react'
import type { LinkedCalendar, SpaceMember } from '../types/space.types'
import translations from '../_i18n'

type ScheduleMeetingMember = SpaceMember & {
  userName?: string
}

export interface ScheduleMeetingButtonProps {
  /** Members to invite to the meeting */
  members: ScheduleMeetingMember[]
  /** Shared calendar linked to this space dimension */
  linkedCalendar: LinkedCalendar | null
  /** Opens the scheduling modal */
  onScheduleMeeting: () => void
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
  members,
  linkedCalendar,
  onScheduleMeeting,
  variant = 'secondary',
  size = 'sm',
  className,
  disabled = false,
  'data-testid': testId = 'schedule-meeting-button'
}) => {
  const { t } = useTranslation(translations)

  return (
    <Button
      variant={variant}
      size={size}
      className={className}
      onClick={onScheduleMeeting}
      disabled={disabled || members.length === 0 || !linkedCalendar?.id || !linkedCalendar.canEdit}
      data-testid={testId}
    >
      <CalendarPlus className="gba:w-4 gba:h-4 gba:mr-2" />
      {t('common-schedule-meeting')}
    </Button>
  )
}

export default ScheduleMeetingButton
