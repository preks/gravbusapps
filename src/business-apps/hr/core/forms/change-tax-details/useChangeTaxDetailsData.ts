import { useEffect, useState } from 'react'
import { UseFormReturn } from 'react-hook-form'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import { getCurrentActiveUserLocale } from '@/common/utils/windowUtils'
import { GET_TAX_DETAILS_EMPLOYEE, GET_TAX_DETAILS_CATALOG } from './ChangeTaxDetailsQueries'
import { isEmployeeInGermany, isEmployeeInRomania } from './validationScope'
import type { TaxInfoFormValues, TaxDetailsCatalogs, CatalogEntry } from './types'

const defaultCatalogs: TaxDetailsCatalogs = {
  taxBracket: [],
  religion: [],
  churchAffiliation: [],
  healthInsuranceType: [],
  documentType: []
}

function getEmployeeIdFromContext(additionalData: unknown, userInfo: unknown): string {
  const ad = additionalData as any
  return (
    ad?.psi_taskPayload?.employeeId ||
    ad?.psi_taskPayload?.initialParameters?.employeeId ||
    ad?.psi_taskPayload?.psi_initialParameters?.employeeId ||
    (typeof ad?.contextData === 'object' && ad?.contextData?.employeeId) ||
    (userInfo as any)?.employeeDetails?.employeeId ||
    ''
  )
}

export function useChangeTaxDetailsData(
  accessToken: string | undefined,
  additionalData: unknown,
  userInfo: unknown,
  form: UseFormReturn<TaxInfoFormValues>,
  initialRef: React.MutableRefObject<TaxInfoFormValues>
) {
  const graphqlClient = useGraphQLClient(accessToken)
  const employeeId = getEmployeeIdFromContext(additionalData, userInfo)
  const [data, setData] = useState<unknown>(null)
  const [catalogs, setCatalogs] = useState<TaxDetailsCatalogs>(defaultCatalogs)
  const [isReady, setIsReady] = useState(false)
  const [employeeCountryCode, setEmployeeCountryCode] = useState<string | null>(null)
  const [employeeGender, setEmployeeGender] = useState<string | null>(null)

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsReady(false)
        const locale = getCurrentActiveUserLocale() || 'en-US'
        const catalogsRes = await graphqlClient.request<Record<string, unknown>>(GET_TAX_DETAILS_CATALOG, {
          activeUserLocale: locale
        })
        setCatalogs({
          taxBracket: (catalogsRes?.taxBracket as CatalogEntry[]) || [],
          religion: (catalogsRes?.religion as CatalogEntry[]) || [],
          churchAffiliation: (catalogsRes?.churchAffiliation as CatalogEntry[]) || [],
          healthInsuranceType: (catalogsRes?.healthInsuranceType as CatalogEntry[]) || [],
          documentType: (catalogsRes?.documentType as CatalogEntry[]) || []
        })

        let employeeDetails: unknown = null
        if (employeeId) {
          const employeeRes = await graphqlClient.request<any>(GET_TAX_DETAILS_EMPLOYEE, {
            idEmployee: employeeId,
            activeUserLocale: locale
          })
          employeeDetails = employeeRes?.EmployeeTaxDetail?.[0] ?? null
          setData(employeeDetails)
          const g = employeeRes?.EmployeeByPk?.gender?.value
          setEmployeeGender(typeof g === 'string' ? g.toLowerCase() : null)
          const entry = employeeRes?.EmployeeWorkingCondition?.[0]?.region?.parentEntry
          setEmployeeCountryCode(entry?.code ?? null)
        } else {
          setEmployeeCountryCode(null)
        }

        const emp = employeeDetails as any
        const defaults: TaxInfoFormValues = {
          taxNumber: emp?.taxNumber ?? '',
          taxBracketRef: emp?.taxBracketRef ?? null,
          healthInsuranceName: emp?.healthInsuranceName ?? '',
          healthInsuranceTypeRef: emp?.healthInsuranceTypeRef ?? null,
          taxIdentificationNumber: emp?.taxIdentificationNumber ?? '',
          religionRef: emp?.religionRef ?? null,
          taxableChurchAffiliationRef: emp?.taxableChurchAffiliationRef ?? null,
          socialSecurityNumber: emp?.socialSecurityNumber ?? '',
          childTaxAllowance: emp?.childTaxAllowance ?? '',
          requestAtTaxOffice: Boolean(emp?.additionalProperties?.requestAtTaxOffice ?? false),
          employeeTaxOffice: String(emp?.additionalProperties?.employeeTaxOffice ?? ''),
          individualFreeAmount: String(emp?.additionalProperties?.individualFreeAmount ?? ''),
          healthInsuranceDocumentTypeId: null,
          healthInsuranceDocumentValidTo: '',
          uploadNewHealthInsuranceDocument: false
        }
        form.reset(defaults)
        initialRef.current = defaults
        void form.trigger()
      } catch {
        // no-op
      } finally {
        setIsReady(true)
      }
    }
    fetchData()
  }, [employeeId, graphqlClient])

  const isEmployeeInGermanyFlag = isEmployeeInGermany(employeeCountryCode)
  const isEmployeeInRomaniaFlag = isEmployeeInRomania(employeeCountryCode)

  return {
    data,
    catalogs,
    isReady,
    employeeCountryCode,
    isEmployeeInGermany: isEmployeeInGermanyFlag,
    isEmployeeInRomania: isEmployeeInRomaniaFlag,
    employeeGender
  }
}
