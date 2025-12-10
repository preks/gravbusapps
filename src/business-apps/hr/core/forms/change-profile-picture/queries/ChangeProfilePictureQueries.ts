import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'

export interface EmployeePictureResponse {
  Employee: Array<{
    id: string
    version: number | null
    firstName?: string
    lastName?: string
    pictureThumbnail: string | null
    picture: string | null
    employeePosition?: Array<{
      jobPosition?: {
        name?: string
      }
    }>
  }>
}

export const GET_EMPLOYEE_PICTURE = `
  query GetEmployeePicture($employeeId: uuid!) {
    Employee(where: { employeePosition: { employeeId: { _eq: $employeeId } } }, limit: 1) {
      id
      version
      firstName
      lastName
      pictureThumbnail
      picture
      employeePosition {
        jobPosition {
          name
        }
      }
    }
  }
`

export const useGetEmployeePicture = (context: BusinessAppContextProps) => {
  const graphqlClient = useGraphQLClient(context.accessToken)

  const toDataUrl = (raw: string): string => {
    if (!raw) return raw
    if (raw.startsWith('data:')) return raw
    if (raw.startsWith('/9j/')) return `data:image/jpeg;base64,${raw}` // JPEG
    if (raw.startsWith('iVBOR')) return `data:image/png;base64,${raw}` // PNG
    if (raw.startsWith('R0lGOD')) return `data:image/gif;base64,${raw}` // GIF
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

    const employee = response?.Employee?.[0]
    if (!employee) return { thumbnail: null, version: null }

    let thumbnail: string | null = employee.pictureThumbnail

    // If thumbnail is missing, picture may either contain base64 data or JSON metadata
    if (!thumbnail && employee.picture) {
      try {
        JSON.parse(employee.picture) // JSON metadata → cannot extract without file service
        thumbnail = null
      } catch {
        // Not JSON → assume it's directly displayable (base64/data URL)
        thumbnail = employee.picture
      }
    }

    const parsed = thumbnail ? toDataUrl(thumbnail) : null
    // Get job title from first employee position
    const position = Array.isArray(employee.employeePosition) ? employee.employeePosition[0] : undefined
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
