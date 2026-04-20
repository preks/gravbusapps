import React from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import { ScheduleMeetingButton } from './ScheduleMeetingButton'

jest.mock('@/common/utils/navigationUtils', () => ({
  navigateTo: jest.fn(),
  buildPlatformUrl: jest.fn((path: string) => path)
}))

const { navigateTo } = jest.requireMock('@/common/utils/navigationUtils') as {
  navigateTo: jest.Mock
}

describe('ScheduleMeetingButton', () => {
  afterEach(() => {
    jest.clearAllMocks()
  })

  it('opens chat calendar with the linked shared calendar preselected', () => {
    render(
      <ScheduleMeetingButton
        spaceId="space-1"
        spaceName="Product"
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
      />
    )

    fireEvent.click(screen.getByTestId('schedule-meeting-button'))

    expect(navigateTo).toHaveBeenCalledWith(expect.stringContaining('action=createMeeting'))
    expect(navigateTo).toHaveBeenCalledWith(expect.stringContaining('calendarId=calendar-1'))
    expect(navigateTo).toHaveBeenCalledWith(expect.stringContaining('calendarIds=calendar-1'))
    expect(navigateTo).toHaveBeenCalledWith(expect.stringContaining('participantDrafts='))
  })
})
