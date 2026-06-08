import React from 'react'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { PendingInvitationsPanel } from './PendingInvitationsPanel'
import { InvitationStatus, MeetingRecurrence, MeetingStatus, PendingInvitationGroup } from '../types'

jest.mock('@newwork/nw-design-system', () => jest.requireActual('@/__mocks__/@newwork/nw-design-system'))

const HOUR = 60 * 60 * 1000

const buildMeeting = (overrides: Record<string, unknown> = {}) => ({
  id: 'meeting-id',
  title: 'Weekly sync',
  startTime: new Date(Date.now() + 24 * HOUR).toISOString(),
  endTime: new Date(Date.now() + 25 * HOUR).toISOString(),
  timezone: 'UTC',
  status: MeetingStatus.SCHEDULED,
  recurrence: MeetingRecurrence.NONE,
  organizerId: 'organizer-id',
  reminderMinutes: [15],
  isAllDay: false,
  color: '#3B82F6',
  createdAt: '2026-03-01T09:00:00.000Z',
  updatedAt: '2026-03-01T09:00:00.000Z',
  organizer: {
    id: 'organizer-id',
    email: 'organizer@test.com',
    displayName: 'Organizer'
  },
  participants: [],
  ...overrides
})

const buildSeriesGroup = (): PendingInvitationGroup => ({
  kind: 'series',
  seriesRootId: 'series-root-id',
  title: 'Weekly sync',
  organizer: {
    id: 'organizer-id',
    email: 'organizer@test.com',
    displayName: 'Organizer'
  },
  recurrence: MeetingRecurrence.WEEKLY,
  pendingMeetings: [
    buildMeeting({ id: 'meeting-1', recurrence: MeetingRecurrence.WEEKLY }),
    buildMeeting({
      id: 'meeting-2',
      parentMeetingId: 'series-root-id',
      startTime: new Date(Date.now() + 7 * 24 * HOUR).toISOString(),
      endTime: new Date(Date.now() + 7 * 24 * HOUR + HOUR).toISOString()
    })
  ],
  pendingCount: 2,
  dateRange: {
    start: new Date(Date.now() + 24 * HOUR).toISOString(),
    end: new Date(Date.now() + 7 * 24 * HOUR + HOUR).toISOString()
  }
})

describe('PendingInvitationsPanel', () => {
  it('keeps series occurrences hidden until expanded, then allows bulk and per-occurrence responses', () => {
    const onRespond = jest.fn().mockResolvedValue(undefined)
    const onRespondSeries = jest.fn().mockResolvedValue(undefined)

    render(
      <PendingInvitationsPanel
        isOpen
        onClose={jest.fn()}
        groups={[buildSeriesGroup()]}
        onRespond={onRespond}
        onRespondSeries={onRespondSeries}
      />
    )

    // Occurrences hidden by default
    expect(screen.queryByTestId('pending-invitations-occurrence-meeting-1')).not.toBeInTheDocument()

    fireEvent.click(screen.getByTestId('pending-invitations-series-series-root-id-accept-button'))
    expect(onRespondSeries).toHaveBeenCalledWith('series-root-id', InvitationStatus.ACCEPTED)

    fireEvent.click(screen.getByTestId('pending-invitations-series-toggle-series-root-id'))
    expect(screen.getByTestId('pending-invitations-occurrence-meeting-1')).toBeInTheDocument()

    fireEvent.click(screen.getByTestId('pending-invitations-occurrence-meeting-1-accept-button'))
    expect(onRespond).toHaveBeenCalledWith('meeting-1', InvitationStatus.ACCEPTED)
  })

  it('shows the recording notice on the series header when any occurrence is recorded', () => {
    const group = buildSeriesGroup() as Extract<PendingInvitationGroup, { kind: 'series' }>
    group.pendingMeetings[1] = { ...group.pendingMeetings[1], transcriptionEnabled: true }

    render(
      <PendingInvitationsPanel
        isOpen
        onClose={jest.fn()}
        groups={[group]}
        onRespond={jest.fn()}
        onRespondSeries={jest.fn()}
      />
    )

    expect(screen.getByTestId('pending-invitations-series-recording-series-root-id')).toBeInTheDocument()
  })

  it('opens an in-dialog detail view and navigates back to the list', async () => {
    const onRespond = jest.fn().mockResolvedValue(undefined)
    const groups: PendingInvitationGroup[] = [{ kind: 'single', seriesRootId: 'meeting-id', meeting: buildMeeting() }]

    render(
      <PendingInvitationsPanel
        isOpen
        onClose={jest.fn()}
        groups={groups}
        onRespond={onRespond}
        onRespondSeries={jest.fn()}
      />
    )

    fireEvent.click(screen.getByTestId('pending-invitations-single-meeting-id-open-button'))
    expect(screen.getByTestId('pending-invitations-detail-meeting-id')).toBeInTheDocument()

    fireEvent.click(screen.getByTestId('pending-invitations-detail-meeting-id-accept-button'))
    expect(onRespond).toHaveBeenCalledWith('meeting-id', InvitationStatus.ACCEPTED)

    // Responding from detail returns to the list
    await waitFor(() => expect(screen.getByTestId('pending-invitations-filter')).toBeInTheDocument())
  })

  it('filters out past invitations when the Upcoming filter is active', () => {
    const groups: PendingInvitationGroup[] = [
      {
        kind: 'single',
        seriesRootId: 'past-meeting',
        meeting: buildMeeting({
          id: 'past-meeting',
          startTime: new Date(Date.now() - 5 * HOUR).toISOString(),
          endTime: new Date(Date.now() - 4 * HOUR).toISOString()
        })
      },
      { kind: 'single', seriesRootId: 'meeting-id', meeting: buildMeeting() }
    ]

    render(
      <PendingInvitationsPanel
        isOpen
        onClose={jest.fn()}
        groups={groups}
        onRespond={jest.fn()}
        onRespondSeries={jest.fn()}
      />
    )

    expect(screen.getByTestId('pending-invitations-group-single-past-meeting')).toBeInTheDocument()

    fireEvent.click(screen.getByTestId('pending-invitations-filter-upcoming'))

    expect(screen.queryByTestId('pending-invitations-group-single-past-meeting')).not.toBeInTheDocument()
    expect(screen.getByTestId('pending-invitations-group-single-meeting-id')).toBeInTheDocument()
  })

  it('opens a series detail view and bulk-responds from it', async () => {
    const onRespondSeries = jest.fn().mockResolvedValue(undefined)

    render(
      <PendingInvitationsPanel
        isOpen
        onClose={jest.fn()}
        groups={[buildSeriesGroup()]}
        onRespond={jest.fn()}
        onRespondSeries={onRespondSeries}
      />
    )

    fireEvent.click(screen.getByTestId('pending-invitations-series-series-root-id-open-button'))
    expect(screen.getByTestId('pending-invitations-detail-series-root-id')).toBeInTheDocument()

    fireEvent.click(screen.getByTestId('pending-invitations-detail-series-series-root-id-accept-button'))
    expect(onRespondSeries).toHaveBeenCalledWith('series-root-id', InvitationStatus.ACCEPTED)

    await waitFor(() => expect(screen.getByTestId('pending-invitations-filter')).toBeInTheDocument())
  })

  it('renders an invited-participant avatar stack with overflow on the quick view', () => {
    const participants = Array.from({ length: 7 }, (_, index) => ({
      id: `p-${index}`,
      meetingId: 'meeting-id',
      userId: `user-${index}`,
      status: InvitationStatus.PENDING,
      isOrganizer: false,
      isOptional: false,
      user: { id: `user-${index}`, email: `u${index}@test.com`, displayName: `User ${index}` }
    }))
    const groups: PendingInvitationGroup[] = [
      { kind: 'single', seriesRootId: 'meeting-id', meeting: buildMeeting({ participants }) }
    ]

    render(
      <PendingInvitationsPanel
        isOpen
        onClose={jest.fn()}
        groups={groups}
        onRespond={jest.fn()}
        onRespondSeries={jest.fn()}
      />
    )

    expect(screen.getByTestId('pending-invitations-participants-stack')).toBeInTheDocument()
    expect(screen.getByTestId('pending-invitations-participants-overflow')).toHaveTextContent('+2')
  })

  it('does not render dialog content when closed', () => {
    const groups: PendingInvitationGroup[] = [{ kind: 'single', seriesRootId: 'meeting-id', meeting: buildMeeting() }]

    render(
      <PendingInvitationsPanel
        isOpen={false}
        onClose={jest.fn()}
        groups={groups}
        onRespond={jest.fn()}
        onRespondSeries={jest.fn()}
      />
    )

    expect(screen.queryByTestId('pending-invitations-dialog')).not.toBeInTheDocument()
  })

  it('keeps a stable responsive dialog shell and scrolls the list content inside it', () => {
    render(
      <PendingInvitationsPanel
        isOpen
        onClose={jest.fn()}
        groups={[buildSeriesGroup()]}
        onRespond={jest.fn()}
        onRespondSeries={jest.fn()}
      />
    )

    expect(screen.getByTestId('pending-invitations-dialog')).toHaveClass(
      'gba:w-full',
      'gba:max-w-xl',
      'gba:max-h-screen',
      'gba:sm:h-128',
      'gba:sm:max-h-128',
      'gba:flex',
      'gba:flex-col',
      'gba:overflow-hidden'
    )

    expect(screen.getByTestId('pending-invitations-list-scroll-area')).toHaveClass(
      'gba:flex-1',
      'gba:min-h-0',
      'gba:overflow-y-auto'
    )
  })
})
