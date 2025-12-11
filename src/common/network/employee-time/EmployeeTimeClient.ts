import { RestClient } from '../rest/RestClient'
import { env } from '@/common/env/EnvUtils'
import { setAccessTokenToAuthorizationHeader } from '../HeaderUtils'

export interface CreateEmployeeAttendancePayload {
  employeeAttendance: {
    version: number
    employeeAttendanceTypeRef: string
    attendanceDate: string
    startTime: string
    endTime?: string
    recordedTime?: string
    breakTime?: string
    effectiveTime?: string
    plannedTime?: string
    differenceTime?: string
    manualOverride?: boolean
    notes?: string
    attendanceLocation?: string
    employee: string
  }
}

export interface CreateEmployeeAttendanceResponse {
  id?: string
  status?: string
  message?: string
  [key: string]: any
}

export class EmployeeTimeClient extends RestClient {
  constructor() {
    super(env('NEXT_PUBLIC_BASE_URL') ?? '')
  }

  setAccessToken(accessToken: string) {
    if (!this.headers) {
      this.headers = {}
    }
    this.headers['Authorization'] = setAccessTokenToAuthorizationHeader(accessToken)
  }

  async createEmployeeAttendance(payload: CreateEmployeeAttendancePayload): Promise<CreateEmployeeAttendanceResponse> {
    return this.post<CreateEmployeeAttendanceResponse>('/processes/employee-time/createEmployeeAttendance', payload, {
      headers: { 'Content-Type': 'application/json' }
    })
  }

  async updateEmployeeAttendance(payload: {
    employeeAttendance: {
      id: string
      version: number
      endTime?: string
      recordedTime?: string
      breakTime?: string
      effectiveTime?: string
      plannedTime?: string
      differenceTime?: string
      notes?: string
      attendanceLocation?: string
    }
  }): Promise<CreateEmployeeAttendanceResponse> {
    return this.post<CreateEmployeeAttendanceResponse>('/processes/employee-time/updateEmployeeAttendance', payload, {
      headers: { 'Content-Type': 'application/json' }
    })
  }
}
