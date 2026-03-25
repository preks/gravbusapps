import { RestClient } from '../rest/RestClient'
import { env } from '../../env/EnvUtils'
import { setAccessTokenToAuthorizationHeader } from '../HeaderUtils'
import { FeedbackRequestPayload } from '../../../business-apps/hr/core/forms/feedback-request-form/types'

export interface FeedbackRequestResponse {
  id: string
  status: string
  message: string
  [key: string]: any
}

export interface BulkFeedbackRequestPayload {
  requestedFromList: string[]
  subjectUserId: string
  requestMessage?: string
}

/**
 * Client for interacting with Feedback Request service
 * Enables requesting feedback from employees
 */
export class FeedbackRequestClient extends RestClient {
  constructor() {
    super(env('NEXT_PUBLIC_BASE_URL') ?? '')
  }

  /**
   * Set the access token for authentication
   * @param accessToken - The access token to use for authentication
   */
  setAccessToken(accessToken: string) {
    if (!this.headers) {
      this.headers = {}
    }

    this.headers['Authorization'] = setAccessTokenToAuthorizationHeader(accessToken)
  }

  /**
   * Request feedback from an employee
   * @param payload - The feedback request payload
   * @returns A Promise that resolves to a FeedbackRequestResponse
   */
  public async requestFeedback(payload: FeedbackRequestPayload): Promise<FeedbackRequestResponse> {
    try {
      return await this.post<FeedbackRequestResponse>('/processes/employee/requestFeedback', payload, {
        headers: {
          'Content-Type': 'application/json'
        }
      })
    } catch (error) {
      console.error('FeedbackRequestClient: Error requesting feedback:', error)
      throw error
    }
  }

  /**
   * Request feedback from multiple employees in bulk
   */
  public async bulkRequestFeedback(payload: BulkFeedbackRequestPayload): Promise<FeedbackRequestResponse> {
    try {
      return await this.post<FeedbackRequestResponse>('/processes/employee/bulkRequestFeedback', payload, {
        headers: {
          'Content-Type': 'application/json'
        }
      })
    } catch (error) {
      console.error('FeedbackRequestClient: Error requesting feedback in bulk:', error)
      throw error
    }
  }
}
