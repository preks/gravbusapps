import { useCallback, useMemo, useState } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { useRestClient } from '@/common/network/rest/useRestClient'
import { env } from '@/common/env/EnvUtils'

export type InvestmentGroup = {
  id: string
  code?: string
  value?: string
}

export type InvestmentGroupPermissionRecord = {
  id?: string
  version?: number
  investmentGroupRef: string
  adminRoles: string[]
  viewerRoles: string[]
  managerRelationsRoles: string[]
  managerManagementRoles: string[]
}

const GET_INVESTMENT_GROUPS_AND_PERMISSIONS = `
  query GetInvestmentGroupsAndPermissions {
    # Get all investment groups
    investmentGroups: CatalogEntry(
      where: {
        catalog: { name: { _eq: "Investment Group" } }
        isDeleted: { _eq: false }
      }
      orderBy: [{ additionalValue1: ASC }, { value: ASC }]
    ) {
      id
      code
      value
      additionalValue1
      displayOrder
    }

    # Get all investment group permissions
    investmentGroupPermissions: InvestmentGroupPermission {
      id
      version
      investmentGroupRef
      adminRoles
      viewerRoles
      managerRelationsRoles
      managerManagementRoles
    }
  }
`

function normalizeRoleArray(input: unknown): string[] {
  if (!input) return []
  if (Array.isArray(input)) {
    return input
      .map((r: any) => (typeof r === 'string' ? r : r?.roleName))
      .filter((v: any): v is string => typeof v === 'string' && v.length > 0)
  }
  return []
}

function toPayloadRoles(names: string[] | undefined | null): Array<{ roleName: string }> | undefined {
  if (!names) return undefined
  return names
    .map(n => (typeof n === 'string' ? n.trim() : ''))
    .filter(n => n.length > 0)
    .map(roleName => ({ roleName }))
}

export const useInvestmentGroupPermissions = (context: BusinessAppContextProps) => {
  const graphqlClient = useGraphQLClient(context.accessToken)
  const restClient = useRestClient(env('NEXT_PUBLIC_KOGITO_PROCESSES_ENDPOINT'))

  const [groups, setGroups] = useState<InvestmentGroup[]>([])
  const [groupsLoading, setGroupsLoading] = useState(false)
  const [groupsError, setGroupsError] = useState<string | null>(null)

  const [permission, setPermission] = useState<InvestmentGroupPermissionRecord | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [permissionsByGroup, setPermissionsByGroup] = useState<Record<string, InvestmentGroupPermissionRecord>>({})

  const fetchGroups = useCallback(async () => {
    if (context.accessToken) {
      setGroupsLoading(true)
      setGroupsError(null)
      try {
        const result = await graphqlClient.request<{
          investmentGroups: any[]
          investmentGroupPermissions: any[]
        }>(GET_INVESTMENT_GROUPS_AND_PERMISSIONS)

        const mappedGroups: InvestmentGroup[] = (result?.investmentGroups || []).map(e => ({
          id: e.id,
          code: e.code,
          value: e.value
        }))
        setGroups(mappedGroups)

        const permsMap: Record<string, InvestmentGroupPermissionRecord> = {}
        for (const row of result?.investmentGroupPermissions || []) {
          const norm: InvestmentGroupPermissionRecord = {
            id: row.id,
            version: row.version,
            investmentGroupRef: row.investmentGroupRef,
            adminRoles: normalizeRoleArray(row.adminRoles),
            viewerRoles: normalizeRoleArray(row.viewerRoles),
            managerRelationsRoles: normalizeRoleArray(row.managerRelationsRoles),
            managerManagementRoles: normalizeRoleArray(row.managerManagementRoles)
          }
          if (norm.investmentGroupRef) {
            permsMap[norm.investmentGroupRef] = norm
          }
        }
        // Pre-seed empty records for groups without permissions
        for (const g of mappedGroups) {
          if (!permsMap[g.id]) {
            permsMap[g.id] = {
              investmentGroupRef: g.id,
              adminRoles: [],
              viewerRoles: [],
              managerRelationsRoles: [],
              managerManagementRoles: []
            }
          }
        }
        setPermissionsByGroup(permsMap)
      } catch (err) {
        console.error('Error fetching investment groups:', err)
        setGroupsError(err instanceof Error ? err.message : 'Failed to fetch investment groups')
      } finally {
        setGroupsLoading(false)
      }
    }
  }, [context.accessToken, graphqlClient])

  const fetchPermissionByGroupRef = useCallback(
    async (groupRef: string) => {
      if (!context.accessToken || !groupRef) return null
      setLoading(true)
      setError(null)
      try {
        const existing = permissionsByGroup[groupRef]
        const result: InvestmentGroupPermissionRecord = existing ?? {
          investmentGroupRef: groupRef,
          adminRoles: [],
          viewerRoles: [],
          managerRelationsRoles: [],
          managerManagementRoles: []
        }
        setPermission(result)
        return result
      } catch (err) {
        console.error('Error resolving group permission:', err)
        setError(err instanceof Error ? err.message : 'Failed to resolve group permission')
        return null
      } finally {
        setLoading(false)
      }
    },
    [context.accessToken, permissionsByGroup]
  )

  const savePermission = useCallback(
    async (record: InvestmentGroupPermissionRecord) => {
      if (!context.accessToken) throw new Error('No access token')
      if (!record.investmentGroupRef) throw new Error('Missing investmentGroupRef')

      const payload: any = {
        changeMode: record.id ? 'UPDATE' : 'INSERT',
        investmentGroupPermission: {
          ...(record.id ? { id: record.id } : {}),
          ...(record.version != null ? { version: record.version } : {}),
          investmentGroupRef: record.investmentGroupRef,
          adminRoles: toPayloadRoles(record.adminRoles),
          viewerRoles: toPayloadRoles(record.viewerRoles),
          managerRelationsRoles: toPayloadRoles(record.managerRelationsRoles),
          managerManagementRoles: toPayloadRoles(record.managerManagementRoles)
        }
      }

      await restClient.post('/investment-relations/saveInvestmentGroupPermission', payload, {
        headers: { Authorization: `Bearer ${context.accessToken}` }
      })

      // Refresh entire cache from GraphQL using the single query
      try {
        const res = await graphqlClient.request<{
          investmentGroups: any[]
          investmentGroupPermissions: any[]
        }>(GET_INVESTMENT_GROUPS_AND_PERMISSIONS)

        const permsMap: Record<string, InvestmentGroupPermissionRecord> = {}
        for (const row of res?.investmentGroupPermissions || []) {
          const norm: InvestmentGroupPermissionRecord = {
            id: row.id,
            version: row.version,
            investmentGroupRef: row.investmentGroupRef,
            adminRoles: normalizeRoleArray(row.adminRoles),
            viewerRoles: normalizeRoleArray(row.viewerRoles),
            managerRelationsRoles: normalizeRoleArray(row.managerRelationsRoles),
            managerManagementRoles: normalizeRoleArray(row.managerManagementRoles)
          }
          if (norm.investmentGroupRef) permsMap[norm.investmentGroupRef] = norm
        }
        setPermissionsByGroup(permsMap)

        const updated = permsMap[record.investmentGroupRef] || {
          investmentGroupRef: record.investmentGroupRef,
          adminRoles: record.adminRoles || [],
          viewerRoles: record.viewerRoles || [],
          managerRelationsRoles: record.managerRelationsRoles || [],
          managerManagementRoles: record.managerManagementRoles || []
        }
        setPermission(updated)
        return updated
      } catch (e) {
        // Fall back to local optimistic state if refetch fails
        console.warn('Refetch after saving investment group permission failed. Using optimistic state.', e)
        setError('Failed to refresh permissions from server. Showing latest saved values.')
        const fallback: InvestmentGroupPermissionRecord = {
          id: record.id,
          version: record.version,
          investmentGroupRef: record.investmentGroupRef,
          adminRoles: record.adminRoles || [],
          viewerRoles: record.viewerRoles || [],
          managerRelationsRoles: record.managerRelationsRoles || [],
          managerManagementRoles: record.managerManagementRoles || []
        }
        setPermissionsByGroup(prev => ({ ...prev, [record.investmentGroupRef]: fallback }))
        setPermission(fallback)
        return fallback
      }
    },
    [context.accessToken, restClient, graphqlClient]
  )

  const deletePermission = useCallback(
    async (record: Pick<InvestmentGroupPermissionRecord, 'id' | 'version' | 'investmentGroupRef'>) => {
      if (!context.accessToken) throw new Error('No access token')
      if (!record.id) throw new Error('Missing id')
      const payload: any = {
        changeMode: 'DELETE',
        investmentGroupPermission: {
          id: record.id,
          version: record.version ?? 0
        }
      }
      await restClient.post('/investment-relations/saveInvestmentGroupPermission', payload, {
        headers: { Authorization: `Bearer ${context.accessToken}` }
      })
      // Update local cache and view state
      setPermissionsByGroup(prev => {
        const next = { ...prev }
        delete next[record.investmentGroupRef]
        return next
      })
      setPermission({
        investmentGroupRef: record.investmentGroupRef,
        adminRoles: [],
        viewerRoles: [],
        managerRelationsRoles: [],
        managerManagementRoles: []
      })
    },
    [context.accessToken, restClient]
  )

  const state = useMemo(
    () => ({ groups, groupsLoading, groupsError, permission, loading, error }),
    [groups, groupsLoading, groupsError, permission, loading, error]
  )

  return {
    ...state,
    fetchGroups,
    fetchPermissionByGroupRef,
    savePermission,
    deletePermission,
    permissionsByGroup
  }
}
