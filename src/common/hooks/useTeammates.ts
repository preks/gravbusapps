import { useState, useEffect } from 'react'
import { EmployeeTeammatesClient, TeammateResponse } from '../network/employee/EmployeeTeammatesClient'

export interface Teammate {
  id: string
  userId: string
  firstName: string
  lastName: string
  fullName: string
  personnelCode: string
  pictureUrl?: string
  organizationalUnitId?: string
  organizationalUnitName?: string
  jobPositionId?: string
  jobPositionName?: string
  costCenterId?: string
  costCenterName?: string
  matrixUnitId?: string
  matrixUnitName?: string
  jobTitle?: string
  email?: string
  phoneNumber?: string
}

interface UseTeammatesResult {
  teammates: Teammate[]
  loading: boolean
  error: Error | null
  refetch: () => void
}

/**
 * Custom hook for fetching employee teammates data
 * @param employeeId - ID of the employee to fetch teammates for
 * @param accessToken - Access token for authorization
 * @returns Object containing teammates data, loading state, error state, and refetch function
 */
export const useTeammates = (employeeId: string, accessToken: string): UseTeammatesResult => {
  const [teammates, setTeammates] = useState<Teammate[]>([])
  const [loading, setLoading] = useState<boolean>(true)
  const [error, setError] = useState<Error | null>(null)

  const fetchTeammates = async () => {
    if (!employeeId || !accessToken) {
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    try {
      const teammatesClient = EmployeeTeammatesClient.getInstance()
      const response = await teammatesClient.getTeammates(employeeId, accessToken)
      const formattedTeammates: Teammate[] = response.map((teammate: TeammateResponse) => {
        // Extract the image path from the pictureUrl JSON string
        let pictureUrl: string | undefined
        try {
          if (teammate.pictureUrl) {
            const pictureData = JSON.parse(teammate.pictureUrl)
            // API returns path in the format: "/api/v1/tenant/downloads/userProfile/pics/{id}/{fileId}.jpeg"
            pictureUrl = pictureData.path
          }
        } catch (e) {
          console.error('Error parsing pictureUrl JSON:', e)
          pictureUrl = undefined
        }

        return {
          id: teammate.id,
          userId: teammate.userId,
          firstName: teammate.firstName,
          lastName: teammate.lastName,
          fullName: `${teammate.firstName} ${teammate.lastName}`,
          personnelCode: teammate.personnelCode,
          pictureUrl: pictureUrl,
          organizationalUnitId: teammate.organizationalUnit?.organizationalUnitId,
          organizationalUnitName: teammate.organizationalUnit?.organizationalUnitName,
          jobPositionId: teammate.jobPosition?.id,
          jobPositionName: teammate.jobPosition?.name,
          costCenterId: teammate.costCenter?.costCenterId,
          costCenterName: teammate.costCenter?.costCenterName,
          matrixUnitId: teammate.matrixUnit?.matrixUnitId,
          matrixUnitName: teammate.matrixUnit?.matrixUnitName,
          jobTitle: teammate.employeeProfile?.jobTitle,
          email: teammate.email,
          phoneNumber: teammate.phoneNumber
        }
      })

      setTeammates(formattedTeammates)
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch teammates'))
      console.error('Error fetching teammates:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchTeammates()
  }, [employeeId, accessToken])

  return {
    teammates,
    loading,
    error,
    refetch: fetchTeammates
  }
}
