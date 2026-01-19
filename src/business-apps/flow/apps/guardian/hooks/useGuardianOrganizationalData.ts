import { useState, useCallback } from 'react'
import { GuardianViewMode, GuardianFilter } from '../types/guardianTypes'
import { getGuardianOrgGraph } from '../queries/GuardianQueries'

interface OrganizationalDataParams {
  viewMode: GuardianViewMode
  filters: GuardianFilter
}

interface OrganizationalDataResult {
  users: any[]
  departments: any[]
  companies: any[]
  locations: any[]
  capabilities: any[]
  relationships: any[]
  metadata: {
    totalUsers: number
    activeDepartments: number
    lastUpdated: string
  }
}

export const useGuardianOrganizationalData = (accessToken: string) => {
  const [isLoading, setIsLoading] = useState(false)

  const toApiDateTime = (d: Date): string => d.toISOString().slice(0, 19).replace('T', ' ')
  const buildTimeFilter = (timeRange: string) => {
    const now = new Date()
    const endDate = toApiDateTime(now)
    switch (timeRange) {
      case '1h':
        return { timeframe: 'custom' as const, startDate: toApiDateTime(new Date(now.getTime() - 60 * 60 * 1000)), endDate }
      case '6h':
        return { timeframe: 'custom' as const, startDate: toApiDateTime(new Date(now.getTime() - 6 * 60 * 60 * 1000)), endDate }
      case '24h':
        return { timeframe: 'custom' as const, startDate: toApiDateTime(new Date(now.getTime() - 24 * 60 * 60 * 1000)), endDate }
      case '7d':
        return { timeframe: 'custom' as const, startDate: toApiDateTime(new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)), endDate }
      case '30d':
        return { timeframe: 'custom' as const, startDate: toApiDateTime(new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)), endDate }
      case 'all':
      default:
        return { timeframe: 'ytd' as const }
    }
  }

  const fetchOrganizationalData = useCallback(
    async (params: OrganizationalDataParams): Promise<OrganizationalDataResult> => {
      setIsLoading(true)

      try {
        const response = await getGuardianOrgGraph(accessToken, {
          ...buildTimeFilter(params.filters.timeRange),
          limitUsers: 250
        })

        const data = response?.data
        const users = Array.isArray(data?.users) ? data.users : []
        const departments = Array.isArray(data?.departments) ? data.departments : []
        const relationships = Array.isArray(data?.relationships) ? data.relationships : []

        const filteredUsers = params.filters.showUsers ? users : []
        const filteredDepartments = params.filters.showDepartments ? departments : []

        const nodeIds = new Set<string>([
          ...filteredUsers.map((u: any) => String(u.id)),
          ...filteredDepartments.map((d: any) => String(d.id))
        ])

        return {
          users: filteredUsers,
          departments: filteredDepartments,
          companies: [],
          locations: [],
          capabilities: [],
          relationships: relationships.filter((rel: any) => nodeIds.has(String(rel.from)) && nodeIds.has(String(rel.to))),
          metadata: {
            totalUsers: Number(data?.metadata?.totalUsers) || filteredUsers.length,
            activeDepartments: Number(data?.metadata?.activeDepartments) || filteredDepartments.length,
            lastUpdated: String(data?.metadata?.lastUpdated || new Date().toISOString())
          }
        }
      } catch (error) {
        console.error('Error fetching organizational data:', error)
        throw error
      } finally {
        setIsLoading(false)
      }
    },
    [accessToken]
  )

  return {
    fetchOrganizationalData,
    isLoading
  }
}
