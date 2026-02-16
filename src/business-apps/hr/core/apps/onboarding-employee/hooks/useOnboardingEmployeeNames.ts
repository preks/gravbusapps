import { useCallback, useEffect, useMemo, useState } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'

const GET_EMPLOYEES_BY_USER_IDS = `
  query GetEmployeesByUserIds($userIds: [String!]!) {
    Employee(where: { userId: { _in: $userIds }, isDeleted: { _eq: false } }) {
      id
      userId
      firstName
      lastName
      fullName
      displayName
      preferredName
      pictureThumbnail
    }
  }
`

interface EmployeeRow {
  id: string
  userId?: string
  firstName?: string
  lastName?: string
  fullName?: string
  displayName?: string
  preferredName?: string
  pictureThumbnail?: string | null
}

function toDisplayName(e: EmployeeRow): string {
  if (e.displayName?.trim()) return e.displayName.trim()
  if (e.fullName?.trim()) return e.fullName.trim()
  if (e.preferredName?.trim()) return e.preferredName.trim()
  const first = e.firstName?.trim() ?? ''
  const last = e.lastName?.trim() ?? ''
  if (first || last) return `${first} ${last}`.trim()
  return '–'
}

export interface UseOnboardingEmployeeNamesProps {
  userIds: string[]
  accessToken: string
  enabled?: boolean
}

export interface EmployeeDisplayInfo {
  displayName: string
  employeeId: string
  pictureThumbnail?: string | null
}

export interface UseOnboardingEmployeeNamesReturn {
  displayNames: Map<string, string>
  /** userId -> Employee.id (for navigation to employee record) */
  employeeIds: Map<string, string>
  /** userId -> pictureThumbnail (base64 or URL) */
  pictureThumbnails: Map<string, string | null>
  /** userId -> { displayName, employeeId, pictureThumbnail } for use with PersonDisplay */
  employeeInfo: Map<string, EmployeeDisplayInfo>
  isLoading: boolean
  error: string | null
  refetch: () => Promise<void>
}

/**
 * Fetches Employee by userIds via GraphQL and returns a map userId -> display name.
 * Display name: displayName || fullName || (firstName + ' ' + lastName).
 */
export function useOnboardingEmployeeNames({
  userIds,
  accessToken,
  enabled = true
}: UseOnboardingEmployeeNamesProps): UseOnboardingEmployeeNamesReturn {
  const client = useGraphQLClient(accessToken)
  const [displayNames, setDisplayNames] = useState<Map<string, string>>(new Map())
  const [employeeIds, setEmployeeIds] = useState<Map<string, string>>(new Map())
  const [pictureThumbnails, setPictureThumbnails] = useState<Map<string, string | null>>(new Map())
  const [employeeInfo, setEmployeeInfo] = useState<Map<string, EmployeeDisplayInfo>>(new Map())
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const uniqueIds = useMemo(() => {
    const set = new Set<string>()
    for (const id of userIds) {
      if (id?.trim()) set.add(id.trim())
    }
    return Array.from(set)
  }, [userIds])

  const fetchNames = useCallback(async () => {
    if (!enabled || uniqueIds.length === 0) {
      setDisplayNames(new Map())
      setEmployeeIds(new Map())
      setPictureThumbnails(new Map())
      setEmployeeInfo(new Map())
      return
    }
    setIsLoading(true)
    setError(null)
    try {
      const result = await client.request<{ Employee: EmployeeRow[] }>(GET_EMPLOYEES_BY_USER_IDS, {
        userIds: uniqueIds
      })
      const nameMap = new Map<string, string>()
      const idMap = new Map<string, string>()
      const picMap = new Map<string, string | null>()
      const infoMap = new Map<string, EmployeeDisplayInfo>()
      const list = result?.Employee ?? []
      for (const emp of list) {
        if (emp.userId) {
          const displayName = toDisplayName(emp)
          nameMap.set(emp.userId, displayName)
          idMap.set(emp.userId, emp.id)
          picMap.set(emp.userId, emp.pictureThumbnail ?? null)
          infoMap.set(emp.userId, {
            displayName,
            employeeId: emp.id,
            pictureThumbnail: emp.pictureThumbnail ?? null
          })
        }
      }
      for (const uid of uniqueIds) {
        if (!nameMap.has(uid)) nameMap.set(uid, '–')
      }
      setDisplayNames(nameMap)
      setEmployeeIds(idMap)
      setPictureThumbnails(picMap)
      setEmployeeInfo(infoMap)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load names')
      setDisplayNames(new Map())
      setEmployeeIds(new Map())
      setPictureThumbnails(new Map())
      setEmployeeInfo(new Map())
    } finally {
      setIsLoading(false)
    }
  }, [client, uniqueIds, enabled])

  useEffect(() => {
    fetchNames()
  }, [fetchNames])

  return {
    displayNames,
    employeeIds,
    pictureThumbnails,
    employeeInfo,
    isLoading,
    error,
    refetch: fetchNames
  }
}
