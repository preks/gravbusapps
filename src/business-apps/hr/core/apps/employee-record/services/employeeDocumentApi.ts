import { env } from '@/common/env/EnvUtils'
import { setAccessTokenToAuthorizationHeader } from '@/common/network/HeaderUtils'
import { RestClient } from '@/common/network/rest/RestClient'

export interface DeleteEmployeeDocumentPayload {
  employeeDocument: {
    id: string
    version: number
    employeeId: string
    type: string
    name: string
    file: string
    mimeType: string
  }
}

export interface EmployeeDocumentResponse {
  employeeDocument?: {
    id: string
    employeeId: string
    name: string
    file: string
    type: string
    mimeType: string
  }
}

export class EmployeeDocumentClient extends RestClient {
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

  public async deleteEmployeeDocument(payload: DeleteEmployeeDocumentPayload): Promise<EmployeeDocumentResponse> {
    try {
      return await this.post<EmployeeDocumentResponse>('/employee/deleteEmployeeDocument', payload, {
        headers: {
          'Content-Type': 'application/json'
        }
      })
    } catch (error) {
      console.error('EmployeeDocumentClient: Error deleting employee document:', error)
      throw error
    }
  }
}
