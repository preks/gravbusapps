import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'

export interface EmployeePictureResponse {
  EmployeeByPk: {
    id: string
    version: number | null
    firstName?: string
    lastName?: string
    pictureThumbnail: string | null
    picture: string | null
  } | null
  EmployeePosition: Array<{
    jobPosition?: {
      name?: string
    }
  }>
}

export const GET_EMPLOYEE_PICTURE = `
  query GetEmployeePicture($employeeId: uuid!) {
    EmployeeByPk(id: $employeeId) {
      id
      version
      firstName
      lastName
      pictureThumbnail
      picture
    }
    EmployeePosition(where: { employeeId: { _eq: $employeeId } }) {
      jobPosition {
        name
      }
    }
  }
`

export const useGetEmployeePicture = (context: BusinessAppContextProps) => {
  const graphqlClient = useGraphQLClient(context.accessToken)

  const toDataUrl = (raw: string): string => {
    if (!raw) return raw
    if (raw.startsWith('data:')) return raw
    if (raw.startsWith('/9j/')) return `data:image/jpeg;base64,${raw}`
    if (raw.startsWith('iVBOR')) return `data:image/png;base64,${raw}`
    if (raw.startsWith('R0lGOD')) return `data:image/gif;base64,${raw}`
    return `data:image/*;base64,${raw}`
  }

  const fetchEmployeePicture = async (
    employeeId: string
  ): Promise<{
    thumbnail: string | null
    version: number | null
    firstName?: string
    lastName?: string
    jobTitle?: string
  }> => {
    const response = await graphqlClient.request<EmployeePictureResponse>(GET_EMPLOYEE_PICTURE, { employeeId })

    const employee = response?.EmployeeByPk
    if (!employee) return { thumbnail: null, version: null }

    let thumbnail: string | null = employee.pictureThumbnail

    if (!thumbnail && employee.picture) {
      try {
        JSON.parse(employee.picture)
        thumbnail = null
      } catch {
        thumbnail = employee.picture
      }
    }

    const parsed = thumbnail ? toDataUrl(thumbnail) : null
    const position = response?.EmployeePosition?.[0]
    const jobTitle = position?.jobPosition?.name

    return {
      thumbnail: parsed,
      version: employee.version ?? null,
      firstName: employee.firstName,
      lastName: employee.lastName,
      jobTitle
    }
  }

  return { fetchEmployeePicture }
}
