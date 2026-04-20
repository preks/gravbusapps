import React from 'react'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { SpaceCalendar } from './SpaceCalendar'

const mockGetCalendarEventsFiltered = jest.fn()
const mockChatClient = {
  getCalendarEventsFiltered: mockGetCalendarEventsFiltered
}

jest.mock('@/common/network/chat/useChatClient', () => ({
  useChatClient: () => mockChatClient
}))

jest.mock('@/common/utils/navigationUtils', () => ({
  navigateTo: jest.fn(),
  buildPlatformUrl: jest.fn((path: string) => path)
}))

const linkedCalendar = {
  id: 'calendar-1',
  name: 'Product Calendar',
  color: '#3B82F6',
  defaultColor: '#3B82F6',
  type: 'shared' as const,
  permission: 'editor' as const,
  memberCount: 2,
  canEdit: true,
  isOwner: false,
  hasColorOverride: false
}

describe('SpaceCalendar', () => {
  beforeEach(() => {
    mockGetCalendarEventsFiltered.mockReset()
  })

  it('opens scheduling from the empty state', async () => {
    const onScheduleMeeting = jest.fn()
    mockGetCalendarEventsFiltered.mockResolvedValue({ events: [] })

    render(
      <SpaceCalendar
        calendar={linkedCalendar}
        accessToken="token"
        onScheduleMeeting={onScheduleMeeting}
        data-testid="space-calendar"
      />
    )

    await waitFor(() => {
      expect(screen.getByTestId('space-calendar-schedule-meeting')).toBeInTheDocument()
    })

    fireEvent.click(screen.getByTestId('space-calendar-schedule-meeting'))

    expect(onScheduleMeeting).toHaveBeenCalledTimes(1)
  })

  it('refetches meetings when the refresh token changes', async () => {
    mockGetCalendarEventsFiltered.mockResolvedValue({ events: [] })

    const { rerender } = render(
      <SpaceCalendar calendar={linkedCalendar} accessToken="token" refreshToken={0} data-testid="space-calendar" />
    )

    await waitFor(() => {
      expect(mockGetCalendarEventsFiltered).toHaveBeenCalledTimes(1)
    })

    rerender(
      <SpaceCalendar calendar={linkedCalendar} accessToken="token" refreshToken={1} data-testid="space-calendar" />
    )

    await waitFor(() => {
      expect(mockGetCalendarEventsFiltered).toHaveBeenCalledTimes(2)
    })
  })
})
