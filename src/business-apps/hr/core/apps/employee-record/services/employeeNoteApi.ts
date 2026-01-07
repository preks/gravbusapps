import { env } from '@/common/env/EnvUtils'
import { setAccessTokenToAuthorizationHeader } from '@/common/network/HeaderUtils'
import { RestClient } from '@/common/network/rest/RestClient'

export interface CreateEmployeeNotePayload {
  employeeNote: {
    notes: string
    employee: string
  }
}

export interface UpdateEmployeeNotePayload {
  employeeNote: {
    id: string
    version: number
    notes: string
    employee: string
  }
}

export interface DeleteEmployeeNotePayload {
  employeeNote: {
    id: string
    version: number
    notes: string
    employee: string
  }
}

export interface EmployeeNoteResponse {
  employeeNote?: {
    id: string
    notes: string
    employeeId: string
    createdAt: string
    createdBy: string
  }
}

/**
 * Client for interacting with Employee Note API
 */
export class EmployeeNoteClient extends RestClient {
  constructor() {
    let url: string = env('NEXT_PUBLIC_PROCESSES_ENDPOINT') || env('NEXT_PUBLIC_KOGITO_PROCESSES_ENDPOINT') || ''
    if (!url.endsWith('/')) {
      url += '/'
    }

    super(url, {})
  }

  setAccessToken(accessToken: string) {
    if (!this.headers) {
      this.headers = {}
    }

    this.headers['Authorization'] = setAccessTokenToAuthorizationHeader(accessToken)
  }

  /**
   * Create a new employee note
   * @param payload - The employee note payload
   * @returns Promise with the created employee note
   */
  public async createEmployeeNote(payload: CreateEmployeeNotePayload): Promise<EmployeeNoteResponse> {
    try {
      return await this.post<EmployeeNoteResponse>('/employee/createEmployeeNote', payload, {
        headers: {
          'Content-Type': 'application/json'
        }
      })
    } catch (error) {
      console.error('EmployeeNoteClient: Error creating employee note:', error)
      throw error
    }
  }

  /**
   * Update an existing employee note
   * @param payload - The employee note payload with id, version, notes, and employee
   * @returns Promise with the updated employee note
   */
  public async updateEmployeeNote(payload: UpdateEmployeeNotePayload): Promise<EmployeeNoteResponse> {
    try {
      return await this.post<EmployeeNoteResponse>('/employee/updateEmployeeNote', payload, {
        headers: {
          'Content-Type': 'application/json'
        }
      })
    } catch (error) {
      console.error('EmployeeNoteClient: Error updating employee note:', error)
      throw error
    }
  }

  /**
   * Delete an employee note
   * @param payload - The employee note payload with id, version, notes, and employee
   * @returns Promise with the deleted employee note response
   */
  public async deleteEmployeeNote(payload: DeleteEmployeeNotePayload): Promise<EmployeeNoteResponse> {
    try {
      return await this.post<EmployeeNoteResponse>('/employee/deleteEmployeeNote', payload, {
        headers: {
          'Content-Type': 'application/json'
        }
      })
    } catch (error) {
      console.error('EmployeeNoteClient: Error deleting employee note:', error)
      throw error
    }
  }
}
