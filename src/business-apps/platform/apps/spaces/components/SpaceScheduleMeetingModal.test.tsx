import React from 'react'
import { render } from '@testing-library/react'
import { SpaceScheduleMeetingModal } from './SpaceScheduleMeetingModal'

const mockCreateMeetingModal = jest.fn(() => null)
const mockUseInternalCalendars = jest.fn()
const mockUseCreateMeeting = jest.fn(() => jest.fn())

jest.mock('@/business-apps/platform/apps/chat/calendar/components', () => ({
  CreateMeetingModal: (props: any) => mockCreateMeetingModal(props)
}))

jest.mock('@/business-apps/platform/apps/chat/calendar/hooks', () => ({
  useInternalCalendars: (...args: any[]) => mockUseInternalCalendars(...args),
  useCreateMeeting: (...args: any[]) => mockUseCreateMeeting(...args)
}))

describe('SpaceScheduleMeetingModal', () => {
  beforeEach(() => {
    mockCreateMeetingModal.mockClear()
    mockUseCreateMeeting.mockClear()
    mockUseInternalCalendars.mockReset()
    mockUseInternalCalendars.mockReturnValue({
      calendars: [
        {
          id: 'space-calendar',
          name: 'Space Calendar',
          color: '#111111',
          defaultColor: '#111111',
          type: 'shared',
          ownerId: 'owner-1',
          permission: 'owner',
          memberCount: 2,
          canEdit: true,
          isOwner: true,
          hasColorOverride: false
        },
        {
          id: 'other-calendar',
          name: 'Other Calendar',
          color: '#222222',
          defaultColor: '#222222',
          type: 'shared',
          ownerId: 'owner-1',
          permission: 'owner',
          memberCount: 2,
          canEdit: true,
          isOwner: true,
          hasColorOverride: false
        }
      ]
    })
  })

  it('passes only the linked space calendar and keeps My Calendar available as an alternative', () => {
    render(
      <SpaceScheduleMeetingModal
        isOpen
        onOpenChange={jest.fn()}
        accessToken="token"
        defaultCalendarId="space-calendar"
      />
    )

    expect(mockCreateMeetingModal).toHaveBeenCalledWith(
      expect.objectContaining({
        includePersonal: true,
        defaultCalendarId: 'space-calendar',
        availableCalendars: [
          expect.objectContaining({
            id: 'space-calendar',
            name: 'Space Calendar'
          })
        ]
      })
    )
  })
})
