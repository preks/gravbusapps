import { env } from '@/common/env/EnvUtils'
import { RestClient } from '../rest/RestClient'

export interface TeammateResponse {
  id: string
  userId: string
  firstName: string
  lastName: string
  personnelCode: string
  pictureUrl: string // JSON string that needs parsing
  picture_thumbnail?: string
  organizationalUnit?: {
    organizationalUnitId: string
    organizationalUnitName: string
    organizationalUnitAssignmentId: string
  }
  jobPosition?: {
    id?: string
    name?: string
  }
  siteLocation?: {
    id?: string
    name?: string
  }
  company?: {
    id?: string
    name?: string
  }
  costCenter?: {
    costCenterId: string
    costCenterName: string
    costCenterAssignmentId: string
  }
  matrixUnit?: {
    matrixUnitId: string
    matrixUnitName: string
    matrixUnitAssignmentId: string
  }
  employeeProfile?: {
    jobTitle?: string
  }
  email?: string
  phoneNumber?: string
}

/**
 * Client for fetching employee teammates data
 */
export class EmployeeTeammatesClient extends RestClient {
  private static instance: EmployeeTeammatesClient

  private constructor() {
    // Use employees API base URL
    super(env('NEXT_PUBLIC_EMPLOYEES_API_URL') ?? '')
  }

  /**
   * Get the singleton instance of the client
   */
  public static getInstance(): EmployeeTeammatesClient {
    if (!EmployeeTeammatesClient.instance) {
      EmployeeTeammatesClient.instance = new EmployeeTeammatesClient()
    }
    return EmployeeTeammatesClient.instance
  }

  /**
   * Get teammates for a specific employee
   * @param employeeId - ID of the employee to fetch teammates for
   * @param accessToken - Access token for authorization
   * @returns Promise resolving to an array of teammates
   */
  public async getTeammates(employeeId: string, accessToken: string): Promise<TeammateResponse[]> {
    return this.get<TeammateResponse[]>(`/orgchart/api/v1/employees/${employeeId}/teammates`, {
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    })
  }
}
