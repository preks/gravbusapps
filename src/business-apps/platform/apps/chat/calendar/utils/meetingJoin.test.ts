import {
  canJoinMeeting,
  dispatchJoinMeetingEvent,
  getMeetingCallType,
  handleMeetingJoin,
  hasExternalMeetingLink
} from './meetingJoin'

describe('meetingJoin', () => {
  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('detects external meeting links', () => {
    expect(hasExternalMeetingLink({ meetingLink: 'https://meet.example.com/room' })).toBe(true)
    expect(hasExternalMeetingLink({ meetingLink: 'auto-generate' })).toBe(false)
    expect(hasExternalMeetingLink({ meetingLink: undefined })).toBe(false)
  })

  it('uses dashboard join rules for internal and external meetings', () => {
    expect(canJoinMeeting({ status: 'scheduled', meetingLink: undefined, isVideoCall: true })).toBe(true)
    expect(canJoinMeeting({ status: 'in_progress', meetingLink: 'auto-generate' })).toBe(true)
    expect(canJoinMeeting({ status: 'cancelled', meetingLink: undefined, isVideoCall: true })).toBe(false)
    expect(canJoinMeeting({ status: 'completed', meetingLink: 'https://meet.example.com/room' })).toBe(true)
    expect(canJoinMeeting({ status: 'scheduled', meetingLink: undefined })).toBe(false)
  })

  it('resolves the call type before allowing joins', () => {
    expect(getMeetingCallType({ meetingLink: 'https://meet.example.com/room' })).toBe('video')
    expect(getMeetingCallType({ isVideoCall: true })).toBe('video')
    expect(getMeetingCallType({ callType: 'audio' })).toBe('audio')
    expect(getMeetingCallType({ metadata: { callType: 'audio' } })).toBe('audio')
    expect(getMeetingCallType({})).toBeNull()
  })

  it('dispatches the platform chat join event with meeting defaults', () => {
    const dispatchSpy = jest.spyOn(window, 'dispatchEvent')

    dispatchJoinMeetingEvent({
      id: 'meeting-1',
      title: 'Product Sync'
    })

    expect(dispatchSpy).toHaveBeenCalledTimes(1)
    const joinEvent = dispatchSpy.mock.calls[0][0] as CustomEvent
    expect(joinEvent.type).toBe('chat:join-meeting')
    expect(joinEvent.detail).toEqual({
      meetingId: 'meeting-1',
      conversationId: 'meeting-1',
      title: 'Product Sync'
    })
  })

  it('opens external links and delegates internal joins', () => {
    const openSpy = jest.spyOn(window, 'open').mockImplementation(() => null)
    const onInternalJoin = jest.fn()

    handleMeetingJoin({
      id: 'meeting-2',
      title: 'External meeting',
      status: 'scheduled',
      meetingLink: 'https://meet.example.com/room'
    })

    expect(openSpy).toHaveBeenCalledWith('https://meet.example.com/room', '_blank', 'noopener,noreferrer')

    handleMeetingJoin(
      {
        id: 'meeting-3',
        title: 'Internal meeting',
        status: 'scheduled',
        isVideoCall: true
      },
      onInternalJoin
    )

    expect(onInternalJoin).toHaveBeenCalledWith({
      id: 'meeting-3',
      title: 'Internal meeting',
      status: 'scheduled',
      isVideoCall: true
    })
  })
})
