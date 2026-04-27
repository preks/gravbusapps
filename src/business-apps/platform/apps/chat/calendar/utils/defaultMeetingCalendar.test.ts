import { InternalCalendarPermission, InternalCalendarType, type InternalCalendarSummary } from '../types'
import { getDefaultMeetingCalendarId, PERSONAL_CALENDAR_ID } from './defaultMeetingCalendar'

describe('getDefaultMeetingCalendarId', () => {
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

  it('prefers an explicit requested calendar id', () => {
    expect(
      getDefaultMeetingCalendarId({
        includePersonal: true,
        requestedMeetingCalendarId: 'space-calendar',
        selectedInternalCalendarIds: [],
        sharedCalendars: [createCalendar({ id: 'other-calendar' })]
      })
    ).toBe('space-calendar')
  })

  it('defaults to My Calendar when personal is visible', () => {
    expect(
      getDefaultMeetingCalendarId({
        includePersonal: true,
        selectedInternalCalendarIds: ['shared-calendar'],
        sharedCalendars: [createCalendar({ id: 'shared-calendar' })]
      })
    ).toBe(PERSONAL_CALENDAR_ID)
  })

  it('defaults to the only editable shared calendar that is selected when personal is hidden', () => {
    expect(
      getDefaultMeetingCalendarId({
        includePersonal: false,
        selectedInternalCalendarIds: ['shared-calendar'],
        sharedCalendars: [createCalendar({ id: 'shared-calendar' })]
      })
    ).toBe('shared-calendar')
  })

  it('defaults to My Calendar when multiple editable shared calendars are selected', () => {
    expect(
      getDefaultMeetingCalendarId({
        includePersonal: false,
        selectedInternalCalendarIds: ['shared-calendar-1', 'shared-calendar-2'],
        sharedCalendars: [createCalendar({ id: 'shared-calendar-1' }), createCalendar({ id: 'shared-calendar-2' })]
      })
    ).toBe(PERSONAL_CALENDAR_ID)
  })

  it('defaults to My Calendar when the selected shared calendars are not editable', () => {
    expect(
      getDefaultMeetingCalendarId({
        includePersonal: false,
        selectedInternalCalendarIds: ['shared-calendar'],
        sharedCalendars: [createCalendar({ id: 'shared-calendar', canEdit: false })]
      })
    ).toBe(PERSONAL_CALENDAR_ID)
  })
})
