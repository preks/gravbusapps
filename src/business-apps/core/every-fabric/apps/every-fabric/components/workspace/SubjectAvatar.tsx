/**
 * SubjectAvatar — renders the resolved avatar for a Case Panel `subject`.
 *
 * Handles `kind === 'employee'` by resolving `subject.id` against the
 * directory. The skill contract prefers `userId`, but for resilience
 * the query ORs on BOTH `userId` and the HRIS `Employee.id` so cases
 * opened by older skill versions keep rendering correctly. Falls back
 * to initials derived from `subject.label` while the lookup is in
 * flight or when the directory has no `pictureThumbnail`.
 *
 * Returns `null` when there is nothing to render so callers can drop
 * the slot entirely for non-employee subjects (project, asset, ...).
 *
 * Visual treatment mirrors `AssigneeChip` (rounded muted-bg circle,
 * `pictureThumbnail` via `normalizeAvatarSrc`, initials fallback).
 * Size is configurable because the Case Panel header wants 32px while
 * `AssigneeChip` uses 24px.
 */
import { useCallback, useEffect, useState, type FC } from 'react'

import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'

import { SubjectAvatarImage } from './SubjectAvatarImage'

import type { CaseSubject } from '../../utils/casePanelTrace'

interface SubjectAvatarProps {
  subject: CaseSubject | undefined
  accessToken?: string
  /** Pixel diameter of the avatar circle. Default 32. */
  size?: number
}

/**
 * Avatar resolver — accepts EITHER the directory `userId` OR the HRIS
 * `Employee.id` as `subject.id`. The offboarding skill v13 standardises
 * on `userId`, but cases opened by earlier skill versions still pass
 * `employee_id`. Querying both keeps already-running cases working
 * without forcing a re-open.
 */
// `Employee.userId` is a String, `Employee.id` is a Hasura `uuid` —
// declare them as separate variables so the OR branch on `id` only
// kicks in when the subject id is a valid UUID. Passing the string
// value into a `uuid` variable when it isn't UUID-shaped triggers a
// Hasura validation error, so we set `$idUuid` to null in that case
// and let the userId branch run alone.
const SUBJECT_EMPLOYEE_QUERY = `
  query GetSubjectEmployee($idString: String!, $idUuid: uuid) {
    Employee(
      where: {
        isDeleted: { _eq: false }
        _or: [{ userId: { _eq: $idString } }, { id: { _eq: $idUuid } }]
      }
      limit: 1
    ) {
      id
      userId
      displayName
      firstName
      lastName
      pictureThumbnail
    }
  }
`

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

interface RawSubjectEmployee {
  id: string
  userId: string
  displayName: string | null
  firstName: string | null
  lastName: string | null
  pictureThumbnail: string | null
}

interface ResolvedSubjectEmployee {
  displayName: string
  pictureThumbnail: string | null
}

function toResolved(e: RawSubjectEmployee): ResolvedSubjectEmployee {
  const displayName = e.displayName || [e.firstName, e.lastName].filter(Boolean).join(' ').trim() || 'Unknown'
  return { displayName, pictureThumbnail: e.pictureThumbnail ?? null }
}

function useResolvedSubjectEmployee(
  accessToken: string | undefined,
  subjectId: string | undefined
): ResolvedSubjectEmployee | undefined {
  const [resolved, setResolved] = useState<ResolvedSubjectEmployee | undefined>(undefined)
  const graphqlClient = useGraphQLClient(accessToken ?? '')

  const fetch = useCallback(async () => {
    if (!accessToken || !subjectId) {
      setResolved(undefined)
      return
    }
    try {
      const idUuid = UUID_RE.test(subjectId) ? subjectId : null
      const result = await graphqlClient.request<{ Employee: RawSubjectEmployee[] }>(SUBJECT_EMPLOYEE_QUERY, {
        idString: subjectId,
        idUuid
      })
      const row = result.Employee?.[0]
      setResolved(row ? toResolved(row) : undefined)
    } catch {
      setResolved(undefined)
    }
  }, [accessToken, subjectId, graphqlClient])

  useEffect(() => {
    fetch().catch(() => {
      /* swallow — handled in fetch */
    })
  }, [fetch])

  return resolved
}

function getInitials(label: string): string {
  const parts = label.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

export const SubjectAvatar: FC<SubjectAvatarProps> = ({ subject, accessToken, size = 32 }) => {
  const isEmployee = subject?.kind === 'employee' && Boolean(subject?.id)
  const resolved = useResolvedSubjectEmployee(accessToken, isEmployee ? subject?.id : undefined)

  if (!isEmployee || !subject) return null

  const labelForInitials = resolved?.displayName ?? subject.label ?? ''
  const initials = getInitials(labelForInitials)
  const altText = resolved?.displayName ?? subject.label ?? 'Employee avatar'

  const dimensionStyle = { width: `${size}px`, height: `${size}px` }
  const fontSizePx = Math.max(9, Math.round(size * 0.32))

  return (
    <div
      className="gba:flex gba:shrink-0 gba:items-center gba:justify-center gba:overflow-hidden gba:rounded-full gba:bg-muted"
      style={dimensionStyle}
      aria-hidden={resolved ? undefined : true}
      title={resolved?.displayName ?? subject.label}
    >
      {resolved?.pictureThumbnail ? (
        <SubjectAvatarImage pictureThumbnail={resolved.pictureThumbnail} alt={altText} />
      ) : (
        <span
          className="gba:font-semibold gba:text-muted-foreground gba:select-none"
          style={{ fontSize: `${fontSizePx}px` }}
        >
          {initials}
        </span>
      )}
    </div>
  )
}

export default SubjectAvatar
