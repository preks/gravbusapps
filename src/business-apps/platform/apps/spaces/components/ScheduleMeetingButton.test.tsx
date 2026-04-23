import React from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import { ScheduleMeetingButton } from './ScheduleMeetingButton'

describe('ScheduleMeetingButton', () => {
  it('opens scheduling when clicked', () => {
    const onScheduleMeeting = jest.fn()

    render(
      <ScheduleMeetingButton
        members={[
          {
            id: 'member-1',
            spaceId: 'space-1',
            userId: 'user-1',
            role: 'editor',
            joinedAt: '2026-04-20T10:00:00Z',
            userName: 'Alex Product'
          }
        ]}
        linkedCalendar={{
          id: 'calendar-1',
          name: 'Product Calendar',
          color: '#3B82F6',
          defaultColor: '#3B82F6',
          type: 'shared',
          permission: 'editor',
          memberCount: 2,
          canEdit: true,
          isOwner: false,
          hasColorOverride: false
        }}
        onScheduleMeeting={onScheduleMeeting}
      />
    )

    fireEvent.click(screen.getByTestId('schedule-meeting-button'))

    expect(onScheduleMeeting).toHaveBeenCalledTimes(1)
  })

  it('stays disabled when the linked calendar is not editable', () => {
    const onScheduleMeeting = jest.fn()

    render(
      <ScheduleMeetingButton
        members={[
          {
            id: 'member-1',
            spaceId: 'space-1',
            userId: 'user-1',
            role: 'editor',
            joinedAt: '2026-04-20T10:00:00Z',
            userName: 'Alex Product'
          }
        ]}
        linkedCalendar={{
          id: 'calendar-1',
          name: 'Product Calendar',
          color: '#3B82F6',
          defaultColor: '#3B82F6',
          type: 'shared',
          permission: 'viewer',
          memberCount: 2,
          canEdit: false,
          isOwner: false,
          hasColorOverride: false
        }}
        onScheduleMeeting={onScheduleMeeting}
      />
    )

    expect(screen.getByTestId('schedule-meeting-button')).toBeDisabled()
  })
})
