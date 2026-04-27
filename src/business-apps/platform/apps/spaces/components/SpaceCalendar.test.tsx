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

jest.mock('@newwork/nw-design-system', () => {
  const actual = jest.requireActual('@newwork/nw-design-system')

  return {
    ...actual,
    ScrollArea: ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) => (
      <div {...props}>{children}</div>
    )
  }
})

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

const buildMeeting = (overrides: Record<string, unknown> = {}) => ({
  id: 'meeting-1',
  title: 'Product Sync',
  start: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
  end: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
  status: 'scheduled',
  isVideoCall: true,
  participantCount: 3,
  ...overrides
})

describe('SpaceCalendar', () => {
  beforeEach(() => {
    mockGetCalendarEventsFiltered.mockReset()
  })

  afterEach(() => {
    jest.restoreAllMocks()
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

  it('renders a join action for internal meetings and dispatches the chat event', async () => {
    const dispatchSpy = jest.spyOn(window, 'dispatchEvent')
    mockGetCalendarEventsFiltered.mockResolvedValue({ events: [buildMeeting()] })

    render(<SpaceCalendar calendar={linkedCalendar} accessToken="token" data-testid="space-calendar" />)

    const joinButton = await screen.findByTestId('space-calendar-meeting-meeting-1-join')

    expect(joinButton).toHaveTextContent('common-join')

    fireEvent.click(joinButton)

    expect(dispatchSpy).toHaveBeenCalledTimes(1)
    const joinEvent = dispatchSpy.mock.calls[0][0] as CustomEvent
    expect(joinEvent.type).toBe('chat:join-meeting')
    expect(joinEvent.detail).toEqual({
      meetingId: 'meeting-1',
      conversationId: 'meeting-1',
      title: 'Product Sync'
    })
  })

  it('opens external meeting links from the meeting action', async () => {
    const openSpy = jest.spyOn(window, 'open').mockImplementation(() => null)
    mockGetCalendarEventsFiltered.mockResolvedValue({
      events: [buildMeeting({ id: 'meeting-2', meetingLink: 'https://meet.example.com/room' })]
    })

    render(<SpaceCalendar calendar={linkedCalendar} accessToken="token" data-testid="space-calendar" />)

    const openButton = await screen.findByTestId('space-calendar-meeting-meeting-2-join')

    expect(openButton).toHaveTextContent('common-open')

    fireEvent.click(openButton)

    expect(openSpy).toHaveBeenCalledWith('https://meet.example.com/room', '_blank', 'noopener,noreferrer')
  })

  it('does not render a join action for non-joinable meetings', async () => {
    mockGetCalendarEventsFiltered.mockResolvedValue({
      events: [buildMeeting({ id: 'meeting-3', isVideoCall: undefined, meetingLink: undefined })]
    })

    render(<SpaceCalendar calendar={linkedCalendar} accessToken="token" data-testid="space-calendar" />)

    await waitFor(() => {
      expect(screen.getByTestId('space-calendar-meeting-meeting-3')).toBeInTheDocument()
    })

    expect(screen.queryByTestId('space-calendar-meeting-meeting-3-join')).not.toBeInTheDocument()
  })
})
