import axios, { AxiosInstance } from 'axios'
import type {
  Meeting,
  CalendarEvent,
  CreateMeetingData,
  UpdateMeetingData,
  InvitationResponse,
  MeetingParticipant
} from './types'

export class CalendarApiClient {
  private client: AxiosInstance
  private token: string | null = null

  constructor(baseURL: string, accessToken?: string) {
    this.client = axios.create({
      baseURL,
      headers: {
        'Content-Type': 'application/json'
      }
    })

    // Add auth interceptor
    this.client.interceptors.request.use(config => {
      if (this.token) {
        config.headers.Authorization = `Bearer ${this.token}`
      }
      return config
    })

    if (accessToken) {
      this.setToken(accessToken)
    }
  }

  setToken(token: string) {
    this.token = token
  }

  // ==================== Meeting CRUD ====================

  /**
   * Create a new meeting
   */
  async createMeeting(data: CreateMeetingData): Promise<Meeting> {
    const response = await this.client.post<{ meeting: Meeting }>('/meetings', data)
    return response.data.meeting
  }

  /**
   * Get a meeting by ID
   */
  async getMeeting(meetingId: string): Promise<Meeting> {
    const response = await this.client.get<{ meeting: Meeting }>(`/meetings/${meetingId}`)
    return response.data.meeting
  }

  /**
   * Update a meeting
   */
  async updateMeeting(meetingId: string, data: UpdateMeetingData): Promise<Meeting> {
    const response = await this.client.patch<{ meeting: Meeting }>(`/meetings/${meetingId}`, data)
    return response.data.meeting
  }

  /**
   * Cancel/delete a meeting
   */
  async cancelMeeting(meetingId: string): Promise<void> {
    await this.client.delete(`/meetings/${meetingId}`)
  }

  // ==================== Calendar Views ====================

  /**
   * Get calendar events for a date range
   */
  async getCalendarEvents(startDate: Date, endDate: Date): Promise<CalendarEvent[]> {
    const response = await this.client.get<{ events: CalendarEvent[] }>('/meetings/calendar/events', {
      params: {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString()
      }
    })

    // Convert date strings to Date objects
    return response.data.events.map(event => ({
      ...event,
      start: new Date(event.start),
      end: new Date(event.end)
    }))
  }

  /**
   * Get pending meeting invitations
   */
  async getPendingInvitations(): Promise<Meeting[]> {
    const response = await this.client.get<{ meetings: Meeting[] }>('/meetings/invitations/pending')
    return response.data.meetings
  }

  /**
   * Get meetings organized by the current user
   */
  async getOrganizedMeetings(includeCompleted: boolean = false): Promise<Meeting[]> {
    const response = await this.client.get<{ meetings: Meeting[] }>('/meetings/organized/list', {
      params: { includeCompleted: String(includeCompleted) }
    })
    return response.data.meetings
  }

  // ==================== Invitations ====================

  /**
   * Respond to a meeting invitation
   */
  async respondToInvitation(meetingId: string, response: InvitationResponse): Promise<MeetingParticipant> {
    const result = await this.client.post<{ participant: MeetingParticipant }>(
      `/meetings/${meetingId}/respond`,
      response
    )
    return result.data.participant
  }

  /**
   * Invite additional participants to a meeting
   */
  async inviteParticipants(meetingId: string, userIds: string[], optionalUserIds?: string[]): Promise<Meeting> {
    const response = await this.client.post<{ meeting: Meeting }>(`/meetings/${meetingId}/invite`, {
      userIds,
      optionalUserIds
    })
    return response.data.meeting
  }

  // ==================== Meeting Actions ====================

  /**
   * Start a meeting
   */
  async startMeeting(meetingId: string): Promise<Meeting> {
    const response = await this.client.post<{ meeting: Meeting }>(`/meetings/${meetingId}/start`)
    return response.data.meeting
  }

  /**
   * End a meeting
   */
  async endMeeting(meetingId: string): Promise<Meeting> {
    const response = await this.client.post<{ meeting: Meeting }>(`/meetings/${meetingId}/end`)
    return response.data.meeting
  }

  /**
   * Link a Cloudflare WebRTC session to a calendar meeting
   * This stores the Cloudflare meeting ID for transcript polling
   */
  async linkWebrtcSession(meetingId: string, cloudFlareMeetingId: string): Promise<void> {
    await this.client.post(`/meetings/${meetingId}/link-webrtc-session`, {
      cloudFlareMeetingId
    })
  }

  /**
   * Resolve and store Cloudflare Session ID from Meeting ID
   * This should be called after the host joins the call
   */
  async resolveAndLinkSession(meetingId: string): Promise<{ meeting: Meeting; sessionId: string | null }> {
    const response = await this.client.post<{ meeting: Meeting; sessionId: string | null }>(
      `/meetings/${meetingId}/resolve-session`
    )
    return response.data
  }
}

// Factory function to create client with proper base URL
export const createCalendarApiClient = (apiUrl: string, accessToken?: string): CalendarApiClient => {
  return new CalendarApiClient(apiUrl, accessToken)
}
