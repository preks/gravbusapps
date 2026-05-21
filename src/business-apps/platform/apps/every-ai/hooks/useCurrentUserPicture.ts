import { useState, useEffect } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'

type EmployeePictureResponse = {
  EmployeeByPk: {
    pictureThumbnail: string | null
    picture: string | null
  } | null
}

const toDataUrl = (raw: string): string => {
  if (!raw) return raw
  if (raw.startsWith('data:')) return raw
  if (raw.startsWith('/9j/')) return `data:image/jpeg;base64,${raw}`
  if (raw.startsWith('iVBOR')) return `data:image/png;base64,${raw}`
  if (raw.startsWith('R0lGOD')) return `data:image/gif;base64,${raw}`
  return `data:image/*;base64,${raw}`
}

export function useCurrentUserPicture(employeeId: string | undefined, accessToken: string) {
  const [pictureThumbnail, setPictureThumbnail] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const graphqlClient = useGraphQLClient(accessToken)

  useEffect(() => {
    if (!employeeId || !accessToken) {
      setPictureThumbnail(null)
      return
    }

    const fetchPicture = async () => {
      setIsLoading(true)
      try {
        const query = `
          query GetEmployeePicture($id: uuid!) {
            EmployeeByPk(id: $id) {
              pictureThumbnail
              picture
            }
          }
        `
        const result = await graphqlClient.request<EmployeePictureResponse>(query, {
          id: employeeId
        })

        const employee = result.EmployeeByPk
        if (!employee) {
          setPictureThumbnail(null)
          return
        }

        let thumbnail = employee.pictureThumbnail

        if (!thumbnail && employee.picture) {
          try {
            JSON.parse(employee.picture)
            thumbnail = null
          } catch {
            thumbnail = employee.picture
          }
        }

        setPictureThumbnail(thumbnail ? toDataUrl(thumbnail) : null)
      } catch (error) {
        console.error('[useCurrentUserPicture] Failed to fetch user picture:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchPicture()
  }, [employeeId, accessToken, graphqlClient])

  return { pictureThumbnail, isLoading }
}
