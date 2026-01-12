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
  
  // Remove duplicates
  const uniqueIds = [...new Set(recipientIds)]
  
  console.warn('[fetchRecipientsData] Fetching data for', uniqueIds.length, 'recipients:', uniqueIds)
  
  try {
    // First try: Query by userId
    const userIdResult = await graphqlClient.request<{ Employee: EmployeeResult[] }>(
      GET_EMPLOYEES_BY_USER_IDS,
      { userIds: uniqueIds }
    )
    
    console.warn('[fetchRecipientsData] Found', userIdResult.Employee?.length || 0, 'employees by userId')
    
    // Map results by userId
    const foundByUserId = new Set<string>()
    if (userIdResult.Employee) {
      for (const emp of userIdResult.Employee) {
        console.warn('[fetchRecipientsData] Employee data:', {
          userId: emp.userId,
          displayName: emp.displayName,
          firstName: emp.firstName,
          lastName: emp.lastName,
          email: getEmail(emp),
          avatar: emp.pictureThumbnail,
          communication: emp.communication
        })
        if (emp.userId) {
          foundByUserId.add(emp.userId)
          resultMap.set(emp.userId, {
            id: emp.userId,
            name: getDisplayName(emp),
            email: getEmail(emp),
            avatar: normalizeImageSrc(emp.pictureThumbnail)
          })
        }
      }
    }
    
    // Second try: Query remaining IDs by employeeId
    const remainingIds = uniqueIds.filter(id => !foundByUserId.has(id))
    
    if (remainingIds.length > 0) {
      console.warn('[fetchRecipientsData] Trying', remainingIds.length, 'IDs as employeeIds')
      
      const employeeIdResult = await graphqlClient.request<{ Employee: EmployeeResult[] }>(
        GET_EMPLOYEES_BY_IDS,
        { employeeIds: remainingIds }
      )
      
      console.warn('[fetchRecipientsData] Found', employeeIdResult.Employee?.length || 0, 'employees by employeeId')
      
      if (employeeIdResult.Employee) {
        for (const emp of employeeIdResult.Employee) {
          resultMap.set(emp.id, {
            id: emp.id,
            name: getDisplayName(emp),
            email: getEmail(emp),
            avatar: normalizeImageSrc(emp.pictureThumbnail)
          })
        }
      }
    }
    
    console.warn('[fetchRecipientsData] Total recipients found:', resultMap.size, 'Final result:', Array.from(resultMap.entries()))
    
    // Fill in missing recipients with defaults
    for (const id of uniqueIds) {
      if (!resultMap.has(id)) {
        console.warn('[fetchRecipientsData] No data found for recipient:', id)
        resultMap.set(id, {
          id,
          name: 'Unknown',
          email: '',
          avatar: undefined
        })
      }
    }
    
  } catch (error) {
    console.error('[fetchRecipientsData] Error fetching recipient data:', error)
    
    // Return defaults for all IDs on error
    for (const id of uniqueIds) {
      if (!resultMap.has(id)) {
        resultMap.set(id, {
          id,
          name: 'Unknown',
          email: '',
          avatar: undefined
        })
      }
    }
  }
  
  return resultMap
}
