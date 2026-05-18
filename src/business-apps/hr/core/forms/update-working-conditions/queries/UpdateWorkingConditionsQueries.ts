import { useCallback, useEffect, useState } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { getCurrentActiveUserLocale } from '@/common/utils/windowUtils'

export interface SelectOption {
  id: string
  label: string
  value: string
  additionalValue2?: string | null
}

export interface WorkingConditionsRecord {
  id?: string
  version?: number
  employmentTypeRef?: string
  contractTypeRef?: string
  remoteRef?: string
  regionRef?: string
  activeFrom?: string | null
  activeTo?: string | null
  startDate?: string | null
  probationEndDate?: string | null
  endDate?: string | null
  additionalProperties?: {
    fixedTermReason?: string
  }
}

export interface WorkingConditionValidationRecord {
  id?: string
  version?: number
  activeFrom?: string | null
  activeTo?: string | null
}

type WorkingConditionChangeMode = 'UPDATE' | 'INSERT'

export const GET_WORKING_CONDITIONS_LOOKUPS = `
  query MyQuery($id: uuid!, $activeUserLocale: String!) {
    Employee(where: {id: {_eq: $id}}) {
      firstName
      lastName
      employeePosition { jobPosition { name } }
      id
      pictureThumbnail
    }
    employee: Employee(where: {isDeleted: {_eq: false}, id: {_eq: $id}}) {
      id
      addresses(where: {type: {_eq: "PRIMARY"}}) {
        country { value id }
        type
      }
      workingCondition(
        where: {
          isDeleted: {_eq: false}
        }
        orderBy: [{activeFrom: DESC}, {createdAt: DESC}]
      ) {
        contractTypeRef
        contractType { id value }
        employmentTypeRef
        employmentType { id value }
        id
        hireDate
        regionRef
        region { id value }
        remoteRef
        remote { id value }
        activeFrom
        activeTo
        vacationDays
        version
        exitDate
        employeeId
        probationEnd
        additionalProperties
      }
      workingConditionValidationRecords: workingCondition(where: {isDeleted: {_eq: false}}) {
        id
        version
        activeFrom
        activeTo
      }
    }
    allEmploymentRegions: CatalogEntry(
      where: {catalog: {version: { _eq: "v1" }, identifier: { _eq: "EmploymentRegion" }}, isDeleted: { _eq: false }},
      orderBy: {value: ASC}
    ) {
      id
      value
      additionalValue3
      translations(where: {localeCode: {_eq: $activeUserLocale}}) { localeCode value }
      catalog { defaultLocale }
    }
    contractTypes: CatalogEntry(where: {catalog: {version: {_eq: "v1"}, identifier: {_eq: "ContractType"}}, isDeleted: { _eq: false }}) {
      id
      value
      additionalValue2
      translations(where: {localeCode: {_eq: $activeUserLocale}}) { localeCode value }
      catalog { defaultLocale }
    }
    employmentTypes: CatalogEntry(where: {catalog: {version: {_eq: "v1"}, identifier: {_eq: "EmploymentType"}}, isDeleted: { _eq: false }}) {
      id
      value
      translations(where: {localeCode: {_eq: $activeUserLocale}}) { localeCode value }
      catalog { defaultLocale }
    }
    remote: CatalogEntry(where: {catalog: {version: {_eq: "v1"}, identifier: {_eq: "RemoteWork"}}, isDeleted: { _eq: false }}) {
      value
      id
      code
    }
  }
`

export const GET_REGIONS_BY_COUNTRY = `
  query MyQuery($countryId: String!, $activeUserLocale: String!) {
    CatalogEntry(
      where: {
        catalog: { version: { _eq: "v1" }, identifier: { _eq: "EmploymentRegion" } },
        additionalValue3: { _eq: $countryId }
        isDeleted: { _eq: false }
      },
      orderBy: { value: ASC }
    ) {
      id
      value
      translations(where: { localeCode: { _eq: $activeUserLocale } }) { value }
      catalog { defaultLocale }
    }
  }
`

/** Full employment region catalog (e.g. when address has no country or no regions for that country). */
export const GET_ALL_EMPLOYMENT_REGIONS = `
  query GetAllEmploymentRegions($activeUserLocale: String!) {
    CatalogEntry(
      where: { catalog: { version: { _eq: "v1" }, identifier: { _eq: "EmploymentRegion" } }, isDeleted: { _eq: false } },
      orderBy: { value: ASC },
      limit: 500
    ) {
      id
      value
      additionalValue3
      translations(where: { localeCode: { _eq: $activeUserLocale } }) { localeCode value }
      catalog { defaultLocale }
    }
  }
`

export const useWorkingConditionsLookups = (context: BusinessAppContextProps) => {
  const graphqlClient = useGraphQLClient(context.accessToken)
  const [employmentTypes, setEmploymentTypes] = useState<SelectOption[]>([])
  const [contractTypes, setContractTypes] = useState<SelectOption[]>([])
  const [remoteOptions, setRemoteOptions] = useState<SelectOption[]>([])
  const [regions, setRegions] = useState<SelectOption[]>([])
  const [current, setCurrent] = useState<WorkingConditionsRecord | null>(null)
  const [defaultWorkingCondition, setDefaultWorkingCondition] = useState<WorkingConditionsRecord | null>(null)
  const [workingConditionValidationRecords, setWorkingConditionValidationRecords] = useState<
    WorkingConditionValidationRecord[]
  >([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [jobTitle, setJobTitle] = useState<string>('')
  const [firstName, setFirstName] = useState<string>('')
  const [lastName, setLastName] = useState<string>('')
  const [pictureThumbnail, setPictureThumbnail] = useState<string>('')
  const [countryId, setCountryId] = useState<string>('')
  const [regionCatalogIsFull, setRegionCatalogIsFull] = useState(false)

  const toOptions = (arr?: any[]): SelectOption[] =>
    (arr || []).map((e: any) => ({
      id: e.id,
      value: e.value,
      label: e.translations?.[0]?.value || e.value,
      additionalValue2: e.additionalValue2 || null
    }))

  const toTimestamp = (value?: string | null): number | null => {
    if (!value) {
      return null
    }

    const timestamp = Date.parse(value)
    return Number.isNaN(timestamp) ? null : timestamp
  }

  const isActiveWorkingCondition = (record: any, today: string): boolean => {
    const activeFrom = toTimestamp(record?.activeFrom)
    const todayTimestamp = toTimestamp(today)

    if (activeFrom === null || todayTimestamp === null || activeFrom > todayTimestamp) {
      return false
    }

    const activeTo = toTimestamp(record?.activeTo)
    return activeTo === null || activeTo >= todayTimestamp
  }

  const isLegacyWorkingCondition = (record: any): boolean => !record?.activeFrom && !record?.activeTo

  const getCurrentWorkingCondition = (
    records: any[],
    today: string,
    workingConditionId?: string,
    changeMode?: WorkingConditionChangeMode
  ) => {
    if (changeMode === 'INSERT') {
      return null
    }

    if (workingConditionId) {
      return records.find(record => record?.id === workingConditionId) || null
    }

    const activeRecord = records.find(record => isActiveWorkingCondition(record, today))

    if (activeRecord) {
      return activeRecord
    }

    return records.find(isLegacyWorkingCondition) || null
  }

  const toWorkingConditionsRecord = (record: any): WorkingConditionsRecord | null => {
    if (!record) {
      return null
    }

    return {
      id: record.id,
      version: record.version,
      employmentTypeRef: record.employmentType?.id || record.employmentTypeRef,
      contractTypeRef: record.contractType?.id || record.contractTypeRef,
      remoteRef: record.remote?.id || record.remoteRef,
      regionRef: record.region?.id || record.regionRef,
      activeFrom: record.activeFrom || null,
      activeTo: record.activeTo || null,
      startDate: record.hireDate || null,
      probationEndDate: record.probationEnd || null,
      endDate: record.exitDate || null,
      additionalProperties: record.additionalProperties || undefined
    }
  }

  const load = useCallback(async () => {
    const additionalData = (context as any)?.additionalData
    const externalContextData = additionalData?.externalContextData
    const psiTaskPayload = additionalData?.psi_taskPayload
    const initialParameters = psiTaskPayload?.psi_initialParameters
    const employeeId =
      externalContextData?.employeeId ||
      additionalData?.employeeId ||
      psiTaskPayload?.employeeId ||
      initialParameters?.employeeId ||
      context.userInfo?.employeeDetails?.employeeId
    const workingConditionId =
      externalContextData?.workingConditionId ||
      additionalData?.workingConditionId ||
      psiTaskPayload?.workingConditionId ||
      initialParameters?.workingConditionId
    const changeMode =
      externalContextData?.changeMode ||
      additionalData?.changeMode ||
      psiTaskPayload?.changeMode ||
      initialParameters?.changeMode ||
      undefined

    if (!employeeId) return
    setLoading(true)
    setError(null)
    try {
      const locale = getCurrentActiveUserLocale() || 'en-US'
      const today = `${new Date().toISOString().slice(0, 10)}T00:00:00.000Z`
      const res = await graphqlClient.request<any>(GET_WORKING_CONDITIONS_LOOKUPS, {
        id: employeeId,
        activeUserLocale: locale
      })
      setEmploymentTypes(toOptions(res?.employmentTypes))
      setContractTypes(toOptions(res?.contractTypes))
      setRemoteOptions(toOptions(res?.remote))
      const employeeCountry = res?.employee?.[0]?.addresses?.[0]?.country || null
      const employeeCountryId = employeeCountry?.id || ''
      const workingConditionCandidates = res?.employee?.[0]?.workingCondition || []
      const wcRaw = getCurrentWorkingCondition(workingConditionCandidates, today, workingConditionId, changeMode)
      const defaultWorkingConditionRaw = getCurrentWorkingCondition(workingConditionCandidates, today)
      setWorkingConditionValidationRecords(res?.employee?.[0]?.workingConditionValidationRecords || [])
      const currentRegionId = wcRaw?.region?.id
      const allRegionsFromLookups = res?.allEmploymentRegions || []
      const currentRegionEntry = currentRegionId
        ? allRegionsFromLookups.find((r: { id: string }) => r.id === currentRegionId)
        : null
      const storedRegionParentCountryId = currentRegionEntry?.additionalValue3 ?? null

      const hasNoAddressCountry = !employeeCountryId?.trim()
      const storedRegionDoesNotMatchAddress =
        employeeCountryId &&
        currentRegionId &&
        (currentRegionEntry == null || storedRegionParentCountryId !== employeeCountryId)

      const toCatalogEntries = (r: any) => r?.CatalogEntry ?? r?.catalogEntry ?? []

      const loadFullRegionCatalog = async (): Promise<SelectOption[]> => {
        const res = await graphqlClient.request<any>(GET_ALL_EMPLOYMENT_REGIONS, {
          activeUserLocale: locale
        })
        return toOptions(toCatalogEntries(res))
      }

      let useFullRegionCatalog: boolean
      let regionOptions: SelectOption[]

      if (hasNoAddressCountry) {
        useFullRegionCatalog = true
        regionOptions = await loadFullRegionCatalog()
      } else {
        try {
          const regRes = await graphqlClient.request<any>(GET_REGIONS_BY_COUNTRY, {
            countryId: employeeCountryId,
            activeUserLocale: locale
          })
          const byCountry = toOptions(toCatalogEntries(regRes))
          if (byCountry.length > 0 && !storedRegionDoesNotMatchAddress) {
            useFullRegionCatalog = false
            regionOptions = byCountry
          } else {
            useFullRegionCatalog = true
            regionOptions = await loadFullRegionCatalog()
          }
        } catch {
          useFullRegionCatalog = true
          regionOptions = await loadFullRegionCatalog()
        }
      }

      setCountryId(employeeCountryId)
      setRegionCatalogIsFull(useFullRegionCatalog)
      setRegions(regionOptions.length > 0 ? regionOptions : toOptions(res?.allEmploymentRegions))
      setCurrent(toWorkingConditionsRecord(wcRaw))
      setDefaultWorkingCondition(toWorkingConditionsRecord(defaultWorkingConditionRaw))
      const jt = res?.Employee?.[0]?.employeePosition?.jobPosition?.name || ''
      setJobTitle(jt)
      setFirstName(res?.Employee?.[0]?.firstName || '')
      setLastName(res?.Employee?.[0]?.lastName || '')
      setPictureThumbnail(res?.Employee?.[0]?.pictureThumbnail || '')
    } catch (e: any) {
      setError(e?.message || 'Failed to load working condition lookups')
    } finally {
      setLoading(false)
    }
  }, [(context as any)?.additionalData, context.userInfo?.employeeDetails?.employeeId, graphqlClient])

  useEffect(() => {
    if (context.accessToken) load()
  }, [context.accessToken, load])

  return {
    employmentTypes,
    contractTypes,
    remoteOptions,
    regions,
    countryId,
    current,
    defaultWorkingCondition,
    workingConditionValidationRecords,
    jobTitle,
    firstName,
    lastName,
    pictureThumbnail,
    loading,
    error,
    refetch: load,
    regionCatalogIsFull
  }
}
