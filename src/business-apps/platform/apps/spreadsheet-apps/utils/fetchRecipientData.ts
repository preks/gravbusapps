/**
 * Fetch recipient data from GraphQL
 *
 * Utilities to fetch user/employee data (name, email, avatar) for bulk collection recipients.
 */

import { GraphQLClient } from '@/common/network/graphql/GraphQLClient'
import { normalizeImageSrc } from './normalizeImageSrc'

export interface RecipientData {
  id: string
  name: string
  email: string
  avatar?: string
}

/**
 * GraphQL query to fetch employee data by user ID
 * Returns name, and avatar (pictureThumbnail)
 * Note: userId field is String type in the Employee table
 * Email is fetched from communication relationship (heuristic match on value)
 */
const GET_EMPLOYEES_BY_USER_IDS = `
  query GetEmployeesByUserIds($userIds: [String!]!) {
    Employee(where: { userId: { _in: $userIds }, isDeleted: { _eq: false } }) {
      id
      userId
      firstName
      lastName
      displayName
      pictureThumbnail
      communication(where: { isDeleted: { _eq: false } }, limit: 10) {
        value
        typeRef
        channelRef
        purpose
      }
    }
  }
`

/**
 * GraphQL query to fetch employee data by employee IDs
 */
const GET_EMPLOYEES_BY_IDS = `
  query GetEmployeesByIds($employeeIds: [uuid!]!) {
    Employee(where: { id: { _in: $employeeIds }, isDeleted: { _eq: false } }) {
      id
      userId
      firstName
      lastName
      displayName
      pictureThumbnail
      communication(where: { isDeleted: { _eq: false } }, limit: 10) {
        value
        typeRef
        channelRef
        purpose
      }
    }
  }
`

interface EmployeeResult {
  id: string
  userId?: string
  firstName?: string
  lastName?: string
  displayName?: string
  pictureThumbnail?: string
  communication?: Array<{
    value: string
    typeRef?: string
    channelRef?: string
    purpose?: string
  }>
}

/**
 * Get display name from employee data
 */
function getDisplayName(employee: EmployeeResult): string {
  if (employee.displayName) return employee.displayName
  if (employee.firstName || employee.lastName) {
    return `${employee.firstName || ''} ${employee.lastName || ''}`.trim()
  }
  return 'Unknown'
}

/**
 * Get email from employee communication data
 */
function getEmail(employee: EmployeeResult): string {
  if (!employee.communication?.length) return ''

  const values = employee.communication
    .map(c => c.value)
    .filter((v): v is string => typeof v === 'string' && v.trim().length > 0)

  // Prefer a real email format if possible
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  const strictMatch = values.find(v => emailRegex.test(v.trim()))
  if (strictMatch) return strictMatch.trim()

  // Fallback: anything that looks like it contains an email
  const softMatch = values.find(v => v.includes('@'))
  return softMatch?.trim() || ''
}

/**
 * Fetch recipient data for multiple user/employee IDs
 * Tries to match by userId first, then by employeeId
 *
 * @param graphqlClient - The GraphQL client instance
 * @param recipientIds - Array of recipient IDs (could be userIds or employeeIds)
 * @returns Map of recipientId to RecipientData
 */
export async function fetchRecipientsData(
  graphqlClient: GraphQLClient,
  recipientIds: string[]
): Promise<Map<string, RecipientData>> {
  const resultMap = new Map<string, RecipientData>()

  if (!recipientIds.length) return resultMap

  const uniqueIds = [...new Set(recipientIds)]
  console.warn('[fetchRecipientsData] Fetching recipient data:', uniqueIds.length)

  try {
    const foundByUserId = await fetchByUserIds(graphqlClient, uniqueIds, resultMap)
    const remainingIds = uniqueIds.filter(id => !foundByUserId.has(id))
    if (remainingIds.length > 0) {
      await fetchByEmployeeIds(graphqlClient, remainingIds, resultMap)
    }
    fillMissingRecipients(uniqueIds, resultMap)
  } catch (error) {
    console.error('[fetchRecipientsData] Error fetching recipient data:', error)

    fillMissingRecipients(uniqueIds, resultMap)
  }

  return resultMap
}

async function fetchByUserIds(
  graphqlClient: GraphQLClient,
  userIds: string[],
  resultMap: Map<string, RecipientData>
): Promise<Set<string>> {
  const foundByUserId = new Set<string>()
  const userIdResult = await graphqlClient.request<{ Employee: EmployeeResult[] }>(GET_EMPLOYEES_BY_USER_IDS, {
    userIds
  })
  console.warn('[fetchRecipientsData] Found employees by userId:', userIdResult.Employee?.length || 0)

  for (const emp of userIdResult.Employee || []) {
    if (!emp.userId) continue
    foundByUserId.add(emp.userId)
    resultMap.set(emp.userId, {
      id: emp.userId,
      name: getDisplayName(emp),
      email: getEmail(emp),
      avatar: normalizeImageSrc(emp.pictureThumbnail)
    })
  }

  return foundByUserId
}

async function fetchByEmployeeIds(
  graphqlClient: GraphQLClient,
  employeeIds: string[],
  resultMap: Map<string, RecipientData>
): Promise<void> {
  console.warn('[fetchRecipientsData] Trying IDs as employeeIds:', employeeIds.length)
  const employeeIdResult = await graphqlClient.request<{ Employee: EmployeeResult[] }>(GET_EMPLOYEES_BY_IDS, {
    employeeIds
  })
  console.warn('[fetchRecipientsData] Found employees by employeeId:', employeeIdResult.Employee?.length || 0)

  for (const emp of employeeIdResult.Employee || []) {
    resultMap.set(emp.id, {
      id: emp.id,
      name: getDisplayName(emp),
      email: getEmail(emp),
      avatar: normalizeImageSrc(emp.pictureThumbnail)
    })
  }
}

function fillMissingRecipients(ids: string[], resultMap: Map<string, RecipientData>): void {
  for (const id of ids) {
    if (resultMap.has(id)) continue
    resultMap.set(id, { id, name: 'Unknown', email: '', avatar: undefined })
  }
}
