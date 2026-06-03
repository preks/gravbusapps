import { useEffect, useState } from 'react'
import type { OrgchartClient } from '@/common/network/orgchart/OrgchartClient'
import { useOrgchartClient } from '@/common/network/orgchart/useOrgchartClient'
import { getCurrentActiveStructureId } from '@/common/utils/windowUtils'

import {
  useActiveStructureDepartmentsQueries,
  type StructureDepartment
} from '../queries/useActiveStructureDepartmentsQueries'

interface ActiveStructureResponse {
  structure?: { structureId?: string }
}

function toErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Failed to load departments'
}

async function resolveActiveStructureId(orgchartClient: OrgchartClient, accessToken?: string): Promise<string> {
  const fromWindow = getCurrentActiveStructureId()
  if (fromWindow) {
    return fromWindow
  }

  const response = await orgchartClient.getStructuresActive<ActiveStructureResponse>(
    { isPlanningMode: false },
    { headers: { Authorization: `Bearer ${accessToken}` } }
  )

  const structureId = response.structure?.structureId?.trim()
  if (!structureId) {
    throw new Error('No active structure found')
  }

  return structureId
}

export function useActiveStructureDepartments(accessToken?: string) {
  const { fetchDepartments } = useActiveStructureDepartmentsQueries(accessToken ?? '')
  const orgchartClient = useOrgchartClient(accessToken)
  const [departments, setDepartments] = useState<StructureDepartment[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!accessToken) {
      setDepartments([])
      setLoading(false)
      setError(null)
      return
    }

    let cancelled = false

    async function loadDepartments() {
      setLoading(true)
      setError(null)

      try {
        const structureId = await resolveActiveStructureId(orgchartClient, accessToken)
        const result = await fetchDepartments(structureId)

        if (cancelled) {
          return
        }
        setDepartments(result.OrganizationalUnit ?? [])
      } catch (err) {
        console.error('Failed to load departments from active structure:', toErrorMessage(err))
        if (cancelled) {
          return
        }
        setDepartments([])
        setError(toErrorMessage(err))
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    void loadDepartments()

    return () => {
      cancelled = true
    }
  }, [accessToken, fetchDepartments, orgchartClient])

  return { departments, loading, error }
}
