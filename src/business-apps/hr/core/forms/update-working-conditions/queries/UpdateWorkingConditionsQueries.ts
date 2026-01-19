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
  startDate?: string | null
  probationEndDate?: string | null
  endDate?: string | null
}

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
      workingCondition {
        contractType { id value }
        employmentType { id value }
        id
        hireDate
        region { id value }
        remote { id value }
        vacationDays
        version
        exitDate
        employeeId
        probationEnd
      }
    }
    allEmploymentRegions: CatalogEntry(
      where: {catalog: {version: { _eq: "v1" }, identifier: { _eq: "EmploymentRegion" }}},
      orderBy: {value: ASC}
    ) {
      id
      value
      translations(where: {localeCode: {_eq: $activeUserLocale}}) { localeCode value }
      catalog { defaultLocale }
    }
    contractTypes: CatalogEntry(where: {catalog: {version: {_eq: "v1"}, identifier: {_eq: "ContractType"}}}) {
      id
      value
      additionalValue2
      translations(where: {localeCode: {_eq: $activeUserLocale}}) { localeCode value }
      catalog { defaultLocale }
    }
    employmentTypes: CatalogEntry(where: {catalog: {version: {_eq: "v1"}, identifier: {_eq: "EmploymentType"}}}) {
      id
      value
      translations(where: {localeCode: {_eq: $activeUserLocale}}) { localeCode value }
      catalog { defaultLocale }
    }
    remote: CatalogEntry(where: {catalog: {version: {_eq: "v1"}, identifier: {_eq: "RemoteWork"}}}) {
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

export const useWorkingConditionsLookups = (context: BusinessAppContextProps) => {
  const graphqlClient = useGraphQLClient(context.accessToken)
  const [employmentTypes, setEmploymentTypes] = useState<SelectOption[]>([])
  const [contractTypes, setContractTypes] = useState<SelectOption[]>([])
  const [remoteOptions, setRemoteOptions] = useState<SelectOption[]>([])
  const [regions, setRegions] = useState<SelectOption[]>([])
  const [current, setCurrent] = useState<WorkingConditionsRecord | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [jobTitle, setJobTitle] = useState<string>('')
  const [firstName, setFirstName] = useState<string>('')
  const [lastName, setLastName] = useState<string>('')
  const [pictureThumbnail, setPictureThumbnail] = useState<string>('')
  const [countryId, setCountryId] = useState<string>('')

  const toOptions = (arr?: any[]): SelectOption[] =>
    (arr || []).map((e: any) => ({
      id: e.id,
      value: e.value,
      label: e.translations?.[0]?.value || e.value,
      additionalValue2: e.additionalValue2 || null
    }))

  const load = useCallback(async () => {
    const employeeId =
      (context as any)?.additionalData?.psi_taskPayload?.psi_initialParameters?.employeeId ||
      context.userInfo?.employeeDetails?.employeeId

    if (!employeeId) return
    setLoading(true)
    setError(null)
    try {
      const locale = getCurrentActiveUserLocale() || 'en-US'
      const res = await graphqlClient.request<any>(GET_WORKING_CONDITIONS_LOOKUPS, {
        id: employeeId,
        activeUserLocale: locale
      })
      setEmploymentTypes(toOptions(res?.employmentTypes))
      setContractTypes(toOptions(res?.contractTypes))
      setRemoteOptions(toOptions(res?.remote))
      const employeeCountry = res?.employee?.[0]?.addresses?.[0]?.country || null
      const employeeCountryId = employeeCountry?.id || ''
      const employeeCountryValue = employeeCountry?.value || ''
      setCountryId(employeeCountryId)
      if (employeeCountryId) {
        try {
          const regRes = await graphqlClient.request<any>(GET_REGIONS_BY_COUNTRY, {
            countryId: employeeCountryId,
            activeUserLocale: locale
          })
          const regionOptions = toOptions(regRes?.CatalogEntry)
          if (regionOptions.length > 0) {
            setRegions(regionOptions)
          } else {
            const label = employeeCountryValue?.split(':').pop() || employeeCountryValue || 'Country'
            setRegions([{ id: employeeCountryId, value: employeeCountryValue, label }])
          }
        } catch {
          const label = employeeCountryValue?.split(':').pop() || employeeCountryValue || 'Country'
          setRegions([{ id: employeeCountryId, value: employeeCountryValue, label }])
        }
      } else {
        setRegions(toOptions(res?.allEmploymentRegions))
      }
      const wcRaw = res?.employee?.[0]?.workingCondition?.[0] || null
      const wc: WorkingConditionsRecord | null = wcRaw
        ? {
            id: wcRaw.id,
            version: wcRaw.version,
            employmentTypeRef: wcRaw.employmentType?.id,
            contractTypeRef: wcRaw.contractType?.id,
            remoteRef: wcRaw.remote?.id,
            regionRef: wcRaw.region?.id,
            startDate: wcRaw.hireDate || null,
            probationEndDate: wcRaw.probationEnd || null,
            endDate: wcRaw.exitDate || null
          }
        : null
      setCurrent(wc)
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
  }, [
    (context as any)?.additionalData?.psi_taskPayload?.psi_initialParameters?.employeeId,
    context.userInfo?.employeeDetails?.employeeId,
    graphqlClient
  ])

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
    jobTitle,
    firstName,
    lastName,
    pictureThumbnail,
    loading,
    error,
    refetch: load
  }
}
