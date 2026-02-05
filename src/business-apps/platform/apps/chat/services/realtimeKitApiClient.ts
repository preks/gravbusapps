import axios, { AxiosInstance } from 'axios'

export interface RealtimeKitMeeting {
  meetingId: string
  conversationId: string
  hostId: string
  callType: 'audio' | 'video'
  createdAt: string
  participantCount: number
}

export interface CreateMeetingResponse {
  success: boolean
  data: {
    sessionId: string // Database call session ID
    meetingId: string // Cloudflare meeting ID
    hostAuthToken: string
    meetingName?: string // Backend-generated meeting name (for 1-on-1 calls)
  }
}

export interface AddParticipantResponse {
  success: boolean
  data: {
    authToken: string
  }
}

export interface MeetingDetailsResponse {
  success: boolean
  data: RealtimeKitMeeting
}

export interface ParticipantInfo {
  id: string
  odName: string
}

export class RealtimeKitApiClient {
  private client: AxiosInstance

  constructor(baseUrl: string, accessToken: string) {
    this.client = axios.create({
      baseURL: `${baseUrl}/api/v1/realtimekit`,
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      timeout: 15000
    })
  }

  /**
   * Create a new Realtime Kit meeting for group calls
   */
  async createMeeting(
    conversationId: string,
    callType: 'audio' | 'video' = 'video',
    displayName?: string,
    firstName?: string,
    lastName?: string,
    meetingName?: string,
    transcriptionEnabled?: boolean,
    calendarMeetingId?: string | null,
    participants?: ParticipantInfo[],
    conversationType?: 'direct' | 'group' | 'meeting'
  ): Promise<CreateMeetingResponse> {
    const response = await this.client.post<CreateMeetingResponse>('/meetings', {
      conversationId,
      callType,
      displayName,
      firstName,
      lastName,
      meetingName,
      transcriptionEnabled,
      calendarMeetingId,
      participants,
      conversationType
    })
    return response.data
  }

  /**
   * Add a participant to an existing meeting and get their auth token
   */
  async addParticipant(
    meetingId: string,
    userId?: string,
    role: 'host' | 'participant' | 'viewer' = 'participant',
    displayName?: string,
    firstName?: string,
    lastName?: string
  ): Promise<AddParticipantResponse> {
    const response = await this.client.post<AddParticipantResponse>(`/meetings/${meetingId}/participants`, {
      userId,
      role,
      displayName,
      firstName,
      lastName
    })
    return response.data
  }

  /**
   * Get meeting details
   */
  async getMeetingDetails(meetingId: string): Promise<MeetingDetailsResponse> {
    const response = await this.client.get<MeetingDetailsResponse>(`/meetings/${meetingId}`)
    return response.data
  }

  /**
   * End a meeting
   */
  async endMeeting(meetingId: string): Promise<void> {
    await this.client.delete(`/meetings/${meetingId}`)
  }

  /**
   * Get all active meetings (for debugging)
   */
  async getActiveMeetings(): Promise<{ success: boolean; data: RealtimeKitMeeting[] }> {
    const response = await this.client.get('/meetings')
    return response.data
  }
}
