import { useState, useEffect } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'

type EmployeePictureResponse = {
  EmployeeByPk: {
    pictureThumbnail: string | null
    picture: string | null
  } | null
}

type EmployeePictureByUserIdResponse = {
  Employee: Array<{
    pictureThumbnail: string | null
    picture: string | null
  }>
}

const toDataUrl = (raw: string): string => {
  if (!raw) return raw
  if (raw.startsWith('data:')) return raw
  if (raw.startsWith('/9j/')) return `data:image/jpeg;base64,${raw}`
  if (raw.startsWith('iVBOR')) return `data:image/png;base64,${raw}`
  if (raw.startsWith('R0lGOD')) return `data:image/gif;base64,${raw}`
  return `data:image/*;base64,${raw}`
}

function resolveThumbnail(pictureThumbnail: string | null, picture: string | null): string | null {
  let thumbnail = pictureThumbnail

  if (!thumbnail && picture) {
    try {
      JSON.parse(picture)
      thumbnail = null
    } catch {
      thumbnail = picture
    }
  }

  return thumbnail ? toDataUrl(thumbnail) : null
}

const GET_EMPLOYEE_PICTURE = `
  query GetEmployeePicture($id: uuid!) {
    EmployeeByPk(id: $id) {
      pictureThumbnail
      picture
    }
  }
`

const GET_EMPLOYEE_PICTURE_BY_USER_ID = `
  query GetEmployeePictureByUserId($userId: String!) {
    Employee(
      where: { userId: { _eq: $userId }, isDeleted: { _eq: false } }
      limit: 1
    ) {
      pictureThumbnail
      picture
    }
  }
`

export function useCurrentUserPicture(employeeId: string | undefined, accessToken: string, userId?: string) {
  const [pictureThumbnail, setPictureThumbnail] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const graphqlClient = useGraphQLClient(accessToken)

  useEffect(() => {
    if (!accessToken || (!employeeId && !userId)) {
      setPictureThumbnail(null)
      return
    }

    const fetchPicture = async () => {
      setIsLoading(true)
      try {
        if (employeeId) {
          const result = await graphqlClient.request<EmployeePictureResponse>(GET_EMPLOYEE_PICTURE, {
            id: employeeId
          })
          setPictureThumbnail(
            resolveThumbnail(result.EmployeeByPk?.pictureThumbnail ?? null, result.EmployeeByPk?.picture ?? null)
          )
          return
        }

        const result = await graphqlClient.request<EmployeePictureByUserIdResponse>(GET_EMPLOYEE_PICTURE_BY_USER_ID, {
          userId
        })
        const employee = result.Employee?.[0]
        setPictureThumbnail(employee ? resolveThumbnail(employee.pictureThumbnail, employee.picture) : null)
      } catch (error) {
        console.error('[useCurrentUserPicture] Failed to fetch user picture:', error)
        setPictureThumbnail(null)
      } finally {
        setIsLoading(false)
      }
    }

    fetchPicture()
  }, [employeeId, userId, accessToken, graphqlClient])

  return { pictureThumbnail, isLoading }
}
