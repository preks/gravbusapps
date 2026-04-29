import { useEffect, useState } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { getCurrentActiveStructureId } from '@/common/utils/windowUtils'
import {
  GET_HUB_LEGAL_ENTITIES,
  GET_HUB_MANAGERS,
  GET_HUB_ORGANIZATIONAL_UNITS,
  GET_HUB_SITE_LOCATIONS,
  HubFilterOption,
  HubManagerOption,
  HubManagerPositionOption
} from '../queries/HubFilterQueries'

export interface HubFilterOptionsState {
  departments: HubFilterOption[]
  locations: HubFilterOption[]
  legalEntities: HubFilterOption[]
  managers: HubManagerOption[]
  isLoading: boolean
  error: string | null
}

const EMPTY_STATE: HubFilterOptionsState = {
  departments: [],
  locations: [],
  legalEntities: [],
  managers: [],
  isLoading: false,
  error: null
}

const readFulfilled = <T>(result: PromiseSettledResult<T>): T | null =>
  result.status === 'fulfilled' ? result.value : null

const mapManagers = (positions: HubManagerPositionOption[] = []): HubManagerOption[] => {
  const unique = new Map<string, HubManagerOption>()
  positions.forEach(position => {
    const manager = position.supervisorEmployee
    if (manager?.id) {
      unique.set(manager.id, manager)
    }
  })
  return Array.from(unique.values()).sort((a, b) => {
    const left = `${a.lastName ?? ''} ${a.firstName ?? ''}`.trim()
    const right = `${b.lastName ?? ''} ${b.firstName ?? ''}`.trim()
    return left.localeCompare(right)
  })
}

export const useHubFilterOptions = (accessToken: string): HubFilterOptionsState => {
  const [state, setState] = useState<HubFilterOptionsState>({ ...EMPTY_STATE, isLoading: true })
  const graphqlClient = useGraphQLClient(accessToken)

  useEffect(() => {
    const structureId = getCurrentActiveStructureId()
    if (!accessToken || !structureId) {
      setState({ ...EMPTY_STATE })
      return
    }

    let cancelled = false
    setState(prev => ({ ...prev, isLoading: true, error: null }))

    const fetchAll = async () => {
      try {
        const [orgUnits, locations, legalEntities, managers] = await Promise.allSettled([
          graphqlClient.request<{ OrganizationalUnit: HubFilterOption[] }>(GET_HUB_ORGANIZATIONAL_UNITS, {
            structureId
          }),
          graphqlClient.request<{ SiteLocation: HubFilterOption[] }>(GET_HUB_SITE_LOCATIONS, { structureId }),
          graphqlClient.request<{ Company: HubFilterOption[] }>(GET_HUB_LEGAL_ENTITIES, { structureId }),
          graphqlClient.request<{ EmployeePosition: HubManagerPositionOption[] }>(GET_HUB_MANAGERS, { structureId })
        ])

        if (cancelled) {
          return
        }

        const orgUnitData = readFulfilled(orgUnits)
        const locationData = readFulfilled(locations)
        const legalEntityData = readFulfilled(legalEntities)
        const managerData = readFulfilled(managers)
        const allFailed = [orgUnits, locations, legalEntities, managers].every(result => result.status === 'rejected')

        setState({
          departments: orgUnitData?.OrganizationalUnit ?? [],
          locations: locationData?.SiteLocation ?? [],
          legalEntities: legalEntityData?.Company ?? [],
          managers: mapManagers(managerData?.EmployeePosition),
          isLoading: false,
          error: allFailed ? 'Filter options failed to load' : null
        })
      } catch (err) {
        if (cancelled) {
          return
        }
        const message = err instanceof Error ? err.message : 'Failed to load filter options'
        setState({ ...EMPTY_STATE, error: message })
      }
    }

    fetchAll()

    return () => {
      cancelled = true
    }
  }, [accessToken, graphqlClient])

  return state
}
