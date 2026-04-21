import React from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import { SpaceDetail } from './SpaceDetail'

const mockSpaceScheduleMeetingModal = jest.fn(() => null)
const mockSpaceCalendar = jest.fn(() => <div data-testid="space-calendar" />)

const mockSpace = {
  id: 'space-1',
  name: 'Product',
  isPublic: false,
  ownerId: 'owner-1',
  settings: {
    contentCounts: {
      documents: 0,
      notes: 0,
      spreadsheets: 0,
      slides: 0,
      total: 0
    },
    dimension: {
      type: 'organization_unit' as const,
      id: 'dimension-1',
      name: 'Product'
    }
  },
  members: [
    {
      id: 'member-1',
      spaceId: 'space-1',
      userId: 'user-2',
      role: 'editor',
      joinedAt: '2026-04-20T10:00:00Z'
    }
  ],
  createdAt: '2026-04-20T10:00:00Z',
  updatedAt: '2026-04-20T10:00:00Z'
}

const mockLinkedCalendar = {
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

jest.mock('./components', () => {
  return {
    ScheduleMeetingButton: ({
      onScheduleMeeting,
      disabled,
      'data-testid': testId = 'schedule-meeting-button'
    }: any) => (
      <button type="button" onClick={onScheduleMeeting} disabled={disabled} data-testid={testId}>
        Schedule Meeting
      </button>
    ),
    SpaceHero: () => <div data-testid="space-hero" />,
    SpaceStats: () => <div data-testid="space-stats" />,
    SpacePinned: () => <div data-testid="space-pinned" />,
    SpaceActivity: () => <div data-testid="space-activity" />,
    SpaceMembersTab: () => <div data-testid="space-members-tab" />,
    SpaceCalendar: (props: any) => mockSpaceCalendar(props),
    SpaceRealTimeActivity: () => <div data-testid="space-realtime-activity" />,
    SpaceTeamChatPanel: () => <div data-testid="space-team-chat-panel" />,
    SpaceTeamPresence: () => <div data-testid="space-team-presence" />,
    AddContentDialog: () => null,
    SpaceScheduleMeetingModal: (props: any) => mockSpaceScheduleMeetingModal(props)
  }
})

jest.mock('./components/SpaceDrivePanel', () => ({
  SpaceDrivePanel: () => <div data-testid="space-drive-panel" />
}))

jest.mock('./components/InviteMemberDialog', () => ({
  InviteMemberDialog: () => null
}))

jest.mock('./components/MoveContentDialog', () => ({
  MoveContentDialog: () => null
}))

jest.mock('./components/SpaceSettingsDialog', () => ({
  SpaceSettingsDialog: () => null
}))

jest.mock('./hooks/useSpace', () => ({
  useSpace: () => ({
    space: mockSpace,
    isLoading: false,
    refresh: jest.fn(),
    updateSpace: jest.fn(),
    addMember: jest.fn(),
    updateMember: jest.fn(),
    removeMember: jest.fn(),
    deleteSpace: jest.fn().mockResolvedValue(true)
  })
}))

jest.mock('./hooks/useSpaceContent', () => ({
  useSpaceContent: () => ({
    documents: [],
    notes: [],
    spreadsheets: [],
    slides: [],
    allContent: [],
    moveContent: jest.fn(),
    addItemsToLocalState: jest.fn(),
    refresh: jest.fn()
  })
}))

jest.mock('./hooks/useSpaceActivity', () => ({
  useSpaceActivity: () => ({
    activities: [],
    isLoading: false,
    refresh: jest.fn()
  })
}))

jest.mock('./hooks/useSpaceUserLookup', () => ({
  useSpaceUserLookup: () => ({
    getUserInfo: (userId: string) => ({
      name: userId === 'user-2' ? 'Alex Product' : 'Owner Person',
      avatar: `${userId}.png`
    })
  })
}))

jest.mock('./hooks/useLinkedGroupChat', () => ({
  useLinkedGroupChat: () => ({
    conversation: null,
    isLoading: false,
    error: null
  })
}))

jest.mock('./hooks/useLinkedSharedCalendar', () => ({
  useLinkedSharedCalendar: () => ({
    calendar: mockLinkedCalendar
  })
}))

jest.mock('./hooks/useSpaceCall', () => ({
  useSpaceCall: () => ({
    startAudioCall: jest.fn(),
    startVideoCall: jest.fn(),
    canStartCall: false
  })
}))

describe('SpaceDetail', () => {
  beforeEach(() => {
    mockSpaceScheduleMeetingModal.mockClear()
    mockSpaceCalendar.mockClear()
  })

  it('opens the schedule meeting modal with space defaults from the overview CTA', () => {
    render(
      <SpaceDetail spaceId="space-1" accessToken="token" userInfo={{ id: 'owner-1' }} data-testid="space-detail" />
    )

    const calendarProps = mockSpaceCalendar.mock.calls.at(-1)?.[0]
    expect(calendarProps).toMatchObject({
      refreshToken: 0
    })
    expect(calendarProps.onScheduleMeeting).toEqual(expect.any(Function))

    fireEvent.click(screen.getByTestId('space-detail-schedule-meeting'))

    const modalProps = mockSpaceScheduleMeetingModal.mock.calls.at(-1)?.[0]

    expect(modalProps).toMatchObject({
      isOpen: true,
      accessToken: 'token',
      defaultCalendarId: 'calendar-1',
      initialTitle: 'calendar-meeting-title'
    })
    expect(modalProps.initialParticipants).toEqual([
      expect.objectContaining({
        id: 'user-2',
        userId: 'user-2',
        displayName: 'Alex Product'
      })
    ])
  })
})
