import { useCallback, useMemo } from 'react'
import {
  EmployeeNoteClient,
  CreateEmployeeNotePayload,
  UpdateEmployeeNotePayload,
  DeleteEmployeeNotePayload,
  EmployeeNoteResponse
} from '../services/employeeNoteApi'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'

export const useEmployeeNoteApi = (context: BusinessAppContextProps) => {
  const client = useMemo(() => {
    const apiClient = new EmployeeNoteClient()
    apiClient.setAccessToken(context.accessToken)
    return apiClient
  }, [context.accessToken])

  const createEmployeeNote = useCallback(
    async (payload: CreateEmployeeNotePayload): Promise<EmployeeNoteResponse> => {
      return await client.createEmployeeNote(payload)
    },
    [client]
  )

  const updateEmployeeNote = useCallback(
    async (payload: UpdateEmployeeNotePayload): Promise<EmployeeNoteResponse> => {
      return await client.updateEmployeeNote(payload)
    },
    [client]
  )

  const deleteEmployeeNote = useCallback(
    async (payload: DeleteEmployeeNotePayload): Promise<EmployeeNoteResponse> => {
      return await client.deleteEmployeeNote(payload)
    },
    [client]
  )

  return { createEmployeeNote, updateEmployeeNote, deleteEmployeeNote }
}
