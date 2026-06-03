import { useEffect, useState } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { useCatalogManagerClient } from '@/common/network/catalogs/useCatalogManagerClient'
import {
  getCurrentActiveStructureId,
  getCurrentActiveUserLocale,
  getTranslationFromI18nKeyAndLabel
} from '@/common/utils/windowUtils'
import { LEGAL_ENTITY_NOT_DEFINED_FILTER_ID } from '../constants/routes'
import {
  GET_HUB_EMPLOYEES,
  GET_HUB_LEGAL_ENTITIES,
  GET_HUB_MANAGERS,
  GET_HUB_ORGANIZATIONAL_UNITS,
  GET_HUB_SITE_LOCATIONS,
  HubEmployeeOption,
  HubEmployeePositionOption,
  HubFilterOption,
  HubManagerOption,
  HubManagerPositionOption
} from '../queries/HubFilterQueries'

export interface HubFilterOptionsState {
  departments: HubFilterOption[]
  locations: HubFilterOption[]
  legalEntities: HubFilterOption[]
  absenceTypes: HubFilterOption[]
  managers: HubManagerOption[]
  employees: HubEmployeeOption[]
  isLoading: boolean
  error: string | null
}

const EMPTY_STATE: HubFilterOptionsState = {
  departments: [],
  locations: [],
  legalEntities: [],
  absenceTypes: [],
  managers: [],
  employees: [],
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
    const left = `${a.firstName ?? ''} ${a.lastName ?? ''}`.trim()
    const right = `${b.firstName ?? ''} ${b.lastName ?? ''}`.trim()
    return left.localeCompare(right)
  })
}

const getEmployeeLabel = (employee: HubEmployeeOption): string =>
  employee.displayName || `${employee.firstName ?? ''} ${employee.lastName ?? ''}`.trim() || employee.id

const isActiveCatalogEntry = (entry: any): boolean => entry?.isDeleted !== true && entry?.is_deleted !== true

const mapEmployees = (positions: HubEmployeePositionOption[] = []): HubEmployeeOption[] => {
  const unique = new Map<string, HubEmployeeOption>()
  positions.forEach(position => {
    const employee = position.employee
    if (employee?.id) {
      unique.set(employee.id, employee)
    }
  })
  return Array.from(unique.values()).sort((a, b) => getEmployeeLabel(a).localeCompare(getEmployeeLabel(b)))
}

const buildLegalEntityOptions = (items: HubFilterOption[] = []): HubFilterOption[] => {
  const missingOption: HubFilterOption = {
    id: LEGAL_ENTITY_NOT_DEFINED_FILTER_ID,
    name: getTranslationFromI18nKeyAndLabel(
      'lowcoder:time_absence_hub.filters.legal_entity_not_defined',
      'Legal entity not defined'
    )
  }

  return [...items, missingOption].sort((a, b) => a.name.localeCompare(b.name))
}

export const useHubFilterOptions = (accessToken: string): HubFilterOptionsState => {
  const [state, setState] = useState<HubFilterOptionsState>({ ...EMPTY_STATE, isLoading: true })
  const graphqlClient = useGraphQLClient(accessToken)
  const catalogClient = useCatalogManagerClient(accessToken)

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
        catalogClient.setAccessToken(accessToken)
        const localeCode = getCurrentActiveUserLocale() ?? 'en-US'

        const [orgUnits, locations, legalEntities, managers, employees, absenceTypes] = await Promise.allSettled([
          graphqlClient.request<{ OrganizationalUnit: HubFilterOption[] }>(GET_HUB_ORGANIZATIONAL_UNITS, {
            structureId
          }),
          graphqlClient.request<{ SiteLocation: HubFilterOption[] }>(GET_HUB_SITE_LOCATIONS, { structureId }),
          graphqlClient.request<{ Company: HubFilterOption[] }>(GET_HUB_LEGAL_ENTITIES, { structureId }),
          graphqlClient.request<{ EmployeePosition: HubManagerPositionOption[] }>(GET_HUB_MANAGERS, { structureId }),
          graphqlClient.request<{ EmployeePosition: HubEmployeePositionOption[] }>(GET_HUB_EMPLOYEES, { structureId }),
          catalogClient.getCatalogEntriesList(
            { catalogIdentifier: 'AbsenceType', version: 'v1' },
            {
              limit: 1000,
              offset: 0,
              returnTotalRecords: false,
              localeCode,
              includeChildCatalogEntries: true
            }
          )
        ])

        if (cancelled) {
          return
        }

        const orgUnitData = readFulfilled(orgUnits)
        const locationData = readFulfilled(locations)
        const legalEntityData = readFulfilled(legalEntities)
        const managerData = readFulfilled(managers)
        const employeeData = readFulfilled(employees)
        const absenceTypeData = readFulfilled(absenceTypes)
        const allFailed = [orgUnits, locations, legalEntities, managers, employees, absenceTypes].every(
          result => result.status === 'rejected'
        )
        const normalizedAbsenceTypes: HubFilterOption[] = (absenceTypeData?.data ?? [])
          .filter(
            (entry: any) =>
              entry?.id && entry?.value && entry?.objectValue?.display !== false && isActiveCatalogEntry(entry)
          )
          .map((entry: any) => ({
            id: String(entry.id),
            name: String(entry.value),
            parentEntryId: String(entry.parentEntryId ?? '')
          }))
          .sort((left, right) => left.name.localeCompare(right.name))

        setState({
          departments: orgUnitData?.OrganizationalUnit ?? [],
          locations: locationData?.SiteLocation ?? [],
          legalEntities: buildLegalEntityOptions(legalEntityData?.Company ?? []),
          absenceTypes: normalizedAbsenceTypes,
          managers: mapManagers(managerData?.EmployeePosition),
          employees: mapEmployees(employeeData?.EmployeePosition),
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
  }, [accessToken, catalogClient, graphqlClient])

  return state
}
