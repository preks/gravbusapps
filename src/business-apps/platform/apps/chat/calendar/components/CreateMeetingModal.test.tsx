import React from 'react'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { CreateMeetingModal } from './CreateMeetingModal'
import { InternalCalendarPermission, InternalCalendarType, type InternalCalendarSummary } from '../types'

jest.mock('@newwork/nw-design-system', () => jest.requireActual('@/__mocks__/@newwork/nw-design-system'))

jest.mock('../services/employeeSearchService', () => ({
  createEmployeeSearchService: jest.fn(() => ({
    searchEmployees: jest.fn().mockResolvedValue([])
  }))
}))

jest.mock('./AvailabilityPanel', () => ({
  AvailabilityPanel: () => <div data-testid="meeting-availability-panel" />
}))

describe('CreateMeetingModal', () => {
  const createCalendar = (overrides: Partial<InternalCalendarSummary> = {}): InternalCalendarSummary => ({
    id: 'calendar-1',
    name: 'Calendar 1',
    color: '#000000',
    defaultColor: '#000000',
    type: InternalCalendarType.SHARED,
    ownerId: 'owner-1',
    permission: InternalCalendarPermission.OWNER,
    memberCount: 1,
    canEdit: true,
    isOwner: true,
    hasColorOverride: false,
    ...overrides
  })

  const createProps = (overrides: Partial<React.ComponentProps<typeof CreateMeetingModal>> = {}) => ({
    isOpen: true,
    onClose: jest.fn(),
    onSubmit: jest.fn().mockResolvedValue(undefined),
    accessToken: 'access-token',
    ...overrides
  })

  afterEach(() => {
    jest.clearAllMocks()
  })

  it('defaults meeting chat off for meetings without a video call', () => {
    render(<CreateMeetingModal {...createProps()} />)

    const createChatToggle = screen.getByTestId('meeting-create-chat-toggle') as HTMLInputElement

    expect(createChatToggle.checked).toBe(false)
  })

  it('defaults meeting chat on when video call is enabled', () => {
    render(<CreateMeetingModal {...createProps()} />)

    fireEvent.click(screen.getByTestId('meeting-video-call-toggle'))

    const createChatToggle = screen.getByTestId('meeting-create-chat-toggle') as HTMLInputElement

    expect(createChatToggle.checked).toBe(true)
  })

  it('preserves a manual chat override when video call mode changes afterward', () => {
    render(<CreateMeetingModal {...createProps()} />)

    fireEvent.click(screen.getByTestId('meeting-video-call-toggle'))

    const createChatToggle = screen.getByTestId('meeting-create-chat-toggle') as HTMLInputElement
    fireEvent.click(createChatToggle)

    fireEvent.click(screen.getByTestId('meeting-video-call-toggle'))
    fireEvent.click(screen.getByTestId('meeting-video-call-toggle'))

    expect(createChatToggle.checked).toBe(false)
  })

  it('submits createConversation as false for regular meetings by default', async () => {
    const onSubmit = jest.fn().mockResolvedValue(undefined)

    render(<CreateMeetingModal {...createProps({ onSubmit })} />)

    fireEvent.change(screen.getByTestId('meeting-title-input'), { target: { value: 'Planning sync' } })
    fireEvent.click(screen.getByText('calendar-createMeeting'))

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ createConversation: false }))
    })
  })

  it('submits createConversation as true when the meeting includes a video call', async () => {
    const onSubmit = jest.fn().mockResolvedValue(undefined)

    render(<CreateMeetingModal {...createProps({ onSubmit })} />)

    fireEvent.change(screen.getByTestId('meeting-title-input'), { target: { value: 'Planning sync' } })
    fireEvent.click(screen.getByTestId('meeting-video-call-toggle'))
    fireEvent.click(screen.getByText('calendar-createMeeting'))

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          createConversation: true,
          meetingLink: 'auto-generate'
        })
      )
    })
  })

  it('submits createConversation on edit when enabling meeting chat for an existing meeting', async () => {
    const onUpdate = jest.fn().mockResolvedValue(undefined)

    render(
      <CreateMeetingModal
        {...createProps({
          onUpdate,
          editMeeting: {
            id: 'meeting-1',
            title: 'Planning sync',
            startTime: new Date('2026-02-01T10:00:00Z'),
            endTime: new Date('2026-02-01T11:00:00Z'),
            meetingLink: 'auto-generate',
            participants: []
          }
        })}
      />
    )

    fireEvent.click(screen.getByText('calendar-saveChanges'))

    await waitFor(() => {
      expect(onUpdate).toHaveBeenCalledWith(
        'meeting-1',
        expect.objectContaining({
          createConversation: true,
          meetingLink: 'auto-generate'
        })
      )
    })
  })

  it('applies the provided default calendar after calendars load late', async () => {
    const { rerender } = render(
      <CreateMeetingModal
        {...createProps({
          includePersonal: false,
          defaultCalendarId: 'space-calendar',
          availableCalendars: []
        })}
      />
    )

    expect(screen.queryByTestId('meeting-calendar-select')).not.toBeInTheDocument()

    rerender(
      <CreateMeetingModal
        {...createProps({
          includePersonal: false,
          defaultCalendarId: 'space-calendar',
          availableCalendars: [
            createCalendar({ id: 'other-calendar', name: 'Other Calendar' }),
            createCalendar({ id: 'space-calendar', name: 'Space Calendar' })
          ]
        })}
      />
    )

    await waitFor(() => {
      expect(screen.getByTestId('meeting-calendar-select')).toHaveValue('space-calendar')
    })
  })

  it('preserves a manual calendar selection when calendars refresh', async () => {
    const { rerender } = render(
      <CreateMeetingModal
        {...createProps({
          includePersonal: false,
          defaultCalendarId: 'space-calendar',
          availableCalendars: [
            createCalendar({ id: 'other-calendar', name: 'Other Calendar' }),
            createCalendar({ id: 'space-calendar', name: 'Space Calendar' })
          ]
        })}
      />
    )

    const calendarSelect = screen.getByTestId('meeting-calendar-select')
    fireEvent.change(calendarSelect, { target: { value: 'other-calendar' } })

    expect(calendarSelect).toHaveValue('other-calendar')

    rerender(
      <CreateMeetingModal
        {...createProps({
          includePersonal: false,
          defaultCalendarId: 'space-calendar',
          availableCalendars: [
            createCalendar({ id: 'space-calendar', name: 'Space Calendar', color: '#111111' }),
            createCalendar({ id: 'other-calendar', name: 'Other Calendar', color: '#222222' })
          ]
        })}
      />
    )

    await waitFor(() => {
      expect(screen.getByTestId('meeting-calendar-select')).toHaveValue('other-calendar')
    })
  })

  it('keeps the space calendar selected while still offering My Calendar as a switch target', async () => {
    render(
      <CreateMeetingModal
        {...createProps({
          includePersonal: true,
          defaultCalendarId: 'space-calendar',
          availableCalendars: [createCalendar({ id: 'space-calendar', name: 'Space Calendar' })]
        })}
      />
    )

    const calendarSelect = screen.getByTestId('meeting-calendar-select')

    await waitFor(() => {
      expect(calendarSelect).toHaveValue('space-calendar')
    })

    expect(screen.getByRole('option', { name: 'My calendar' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'Space Calendar' })).toBeInTheDocument()
    expect(screen.queryByRole('option', { name: 'Other Calendar' })).not.toBeInTheDocument()
  })
})
