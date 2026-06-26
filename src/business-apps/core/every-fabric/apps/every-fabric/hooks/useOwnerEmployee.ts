/**
 * Resolve a workforce agent's owner (a platform user id) to a displayable
 * employee identity: name, avatar, and job title ("role").
 *
 * The owner_user_id stored on a workforce profile is a platform/Keycloak user
 * id. We look up the matching EmployeePosition (joined on employee.userId) so
 * the Role & ownership card can show the accountable person as an avatar + name
 * + role instead of a raw UUID.
 */
import { useEffect, useState } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'

export interface OwnerEmployee {
  userId: string
  employeeId: string | null
  displayName: string
  pictureThumbnail: string | null
  /** The owner's job position name, shown as their "role". */
  jobTitle: string | null
  /** The owner's own org unit (not the agent's), kept for completeness. */
  department: string | null
}

const OWNER_BY_USER_ID_QUERY = `
  query OwnerByUserId($userId: String!) {
    EmployeePosition(where: { employee: { userId: { _eq: $userId } } }, limit: 1) {
      employeeId
      firstName
      lastName
      employee {
        id
        displayName
        pictureThumbnail
      }
      jobPosition {
        name
      }
      organizationalUnit {
        name
      }
    }
  }
`

interface RawOwnerPosition {
  employeeId: string | null
  firstName: string | null
  lastName: string | null
  employee: { id: string; displayName: string | null; pictureThumbnail: string | null } | null
  jobPosition: { name: string | null } | null
  organizationalUnit: { name: string | null } | null
}

/** Resolve one owner user id to a name / avatar / job title for display. */
export function useOwnerEmployee(
  accessToken: string,
  ownerUserId?: string | null
): { owner: OwnerEmployee | null; loading: boolean } {
  const graphqlClient = useGraphQLClient(accessToken)
  const [owner, setOwner] = useState<OwnerEmployee | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    let cancelled = false
    const id = ownerUserId?.trim()
    if (!accessToken || !id) {
      setOwner(null)
      setLoading(false)
      return
    }
    setLoading(true)
    graphqlClient
      .request<{ EmployeePosition: RawOwnerPosition[] }>(OWNER_BY_USER_ID_QUERY, { userId: id })
      .then(result => {
        if (cancelled) return
        const position = result.EmployeePosition?.[0]
        if (!position) {
          setOwner(null)
          return
        }
        const displayName =
          position.employee?.displayName ||
          [position.firstName, position.lastName].filter(Boolean).join(' ').trim() ||
          'Unknown'
        setOwner({
          userId: id,
          employeeId: position.employeeId ?? position.employee?.id ?? null,
          displayName,
          pictureThumbnail: position.employee?.pictureThumbnail ?? null,
          jobTitle: position.jobPosition?.name ?? null,
          department: position.organizationalUnit?.name ?? null
        })
      })
      .catch(() => {
        // Non-critical: the component falls back to the raw id display.
        if (!cancelled) setOwner(null)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [accessToken, ownerUserId, graphqlClient])

  return { owner, loading }
}
