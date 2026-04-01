import { useEffect, useCallback, useState } from 'react'
import { useGraphqlClient } from '../../../../../../common/network/graphql/useGraphQLClient'
import { getCurrentActiveUserLocale } from '../../../../../../common/utils/windowUtils'
import { getTranslatedValue } from '../utils/formatters'

/**
 * GraphQL query to fetch employee data including:
 * - Personal information
 * - Employment details
 * - Feedback
 * - Absence entitlements
 * - Performance goals
 */
export const GET_EMPLOYEE_DATA = /*sql*/ `
 query GetEmployeeData($employeeId: uuid!, $structureId: uuid, $hasStructureId: Boolean!, $activeUserLocale: String!) {
 Catalog(where: {identifier: {_eq: "AcademicTitle"}}) {
    id
    catalogEntries(where: {isDeleted: {_eq: false}}) {
      id
      value
      translations(where: {localeCode: {_eq: $activeUserLocale}}) {
        value
      }
    }
  }
  EmployeePosition(where: {employeeId: {_eq: $employeeId}}) {
    id
    organizationalUnitId
    supervisorEmployeeId
    organizationalUnit {
      id
      name
      description
      organizationalUnitEmployeeAggregate {
        aggregate {
          count
        }
      }
    }
    supervisor {
      firstName
      lastName
      displayName
      id
      pictureThumbnail
      employeePosition {
        jobPosition {
          name
        }
      }
    }
    jobPosition {
      id
      name
      jobFunction {
        id
        name
        jobFamily {
          value
        }
      }
      jobLevel{
        id
        name
      }
      jobProfile {
        name
        jobProfileSkills {
          skill {
            id
            name
          }
          requiredLevel
        }
      }
    }
    jobPositionId
    siteLocation {
      name
      id
    }
    companyId
    company {
      name
    }
    siteLocationId
    costCenterId
    costCenter {
      id
      name
    }
    matrixUnitEmployees(where: {structureId: {_eq: $structureId}}) @include(if: $hasStructureId) {
      structureId
      matrixUnit {
        id
        name
      }
    }
    employeeCapabilities(where: {structureId: {_eq: $structureId}}) @include(if: $hasStructureId) {
      structureId
      capability {
        id
        name
      }
    }
    employee {
      id
      code
      fullName
      displayName
      workspace
      version
      externalId
      hrReferenceCode
      pictureThumbnail
      userId
      additionalProperties
      skills(where: {isDeleted: {_eq: false}}) {
        id
        level
        isDeleted
        recordState
        processInstanceId
        verificationDocumentId
        additionalProperties
        synchronizedAt
        validFrom
        validTo
        createdAt
        updatedAt
        skill {
          id
          updatedAt
          createdAt
          name
          additionalProperties
        }
      }
        
      salutation {
        value
        id
        translations(where: {localeCode: {_eq: $activeUserLocale}}) {
          value
        }
      }
      maritalStatus {
        id
        value
        translations(where: {localeCode: {_eq: $activeUserLocale}}) {
          value
        }
      }
      gender {
        translations(where: {localeCode: {_eq: $activeUserLocale}}) {
          value
        }
        value
        id
      }
      academicTitleRef
      firstName
      preferredName
      birthDate
      birthName
      lastName
      jobHistories {
        activeFrom
        activeTo
        company
        exitDate
        hireDate
        jobPosition
        locality
      }
      addresses {
        id
        version
        addressLine
        postalCode
        locality
        type
        country {
          id
          code
          value
        }
      }
      relationship {
        isEmergencyContact
        type {
          id
          value
        }
        firstName
        lastName
        birthDate
        phoneNumber
        email
      }
      communication {
        id
        version
        channelRef
        value
        purpose
        type {
          value
        }
        channel {
          value
          code
          additionalValue1
        }
      }
      workingCondition {
        id
        version
        regionRef
        probationEnd
        contractType {
          value
          id
        }
        employmentType {
          value
          id
        }
        region {
          value
          id
          parentEntry {
            code
          }
        }
        remote {
          id
          value
        }
        hireDate
        vacationDays
        exitDate
        additionalProperties
      }
      workingHours {
        id
        version
        weeklyHours
        fullTimeEquivalent
        mondayHours
        remote {
          id
          value
        }
        thursdayHours
        wednesdayHours
        tuesdayHours
        fridayHours
        saturdayHours
        sundayHours
        weeklyDays
      }
      workPermit {
        type {
          value
        }
      }
      bankAccounts {
        iban
        bankName
        accountHolder
      }
      taxDetails {
        taxNumber
        taxBracketRef
        taxIdentificationNumber
        socialSecurityNumber
        taxableChurchAffiliationRef
        childTaxAllowance
        healthInsuranceName
        healthInsuranceTypeRef
        additionalProperties
        updatedAt
      }
      nationality {
        value
        translations(where: {localeCode: {_eq: $activeUserLocale}}) {
          value
        }
      }
      birthPlace
    }
  }
  Subordinates: EmployeePosition(where: {supervisorEmployeeId: {_eq: $employeeId}}) {
    employee {
      id
      firstName
      lastName
      pictureThumbnail
      picture
      displayName
    }
    jobPosition {
      id
      name
    }
  }
  EmployeeFeedback(where: {isDeleted: {_eq: false}, employeeId: {_eq: $employeeId}}) {
    feedback
    feedbackDate
    feedbackPublic
    senderEmployeeId
    senderEmployee {
      firstName
      lastName
      displayName
      employeePosition {
        employee {
          pictureThumbnail
          picture
        }
      }
    }
  }
  EmployeeAbsenceEntitlement(where: {isDeleted: {_eq: false}, employeeId: {_eq: $employeeId}}) {
    employeeId
    type {
      id
      value
      objectValue
      translations(where: {localeCode: {_eq: $activeUserLocale}}) {
        localeCode
        value
      }
    }
    available
    pending
    total
    approved
    validFrom
    validTo
  }
  EmployeePerformanceGoal(where: {isDeleted: {_eq: false}, employeeId: {_eq: $employeeId}}, orderBy: {progressPercent: DESC}) {
    id 
    employeeId
    dueDate
    completionDate
    startDate
    status
    title
    progressPercent
    version
    createdAt
    updatedAt
    additionalProperties
  }
}
 
`

/**
 * Hook to fetch employee data using the project's GraphQL client
 * @param employeeId - The ID of the employee to fetch
 * @param structureId - The ID of the organizational structure
 * @param skipRequest - Whether to skip the request (optional)
 */
export const useEmployeeData = (
  accessToken: string,
  activeStructureId: string,
  employeeId: string,
  skipRequest = false
) => {
  const client = useGraphqlClient(accessToken)
  const structureId = activeStructureId

  const [data, setData] = useState<EmployeeData | null>(null)
  const [error, setError] = useState<Error | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const fetchData = useCallback(async () => {
    if (skipRequest || !accessToken || !employeeId) {
      setData(null)
      setIsLoading(false)
      return
    }
    setIsLoading(true)
    setError(null)

    try {
      const variables = {
        employeeId,
        structureId: structureId ?? '',
        hasStructureId: !!structureId,
        activeUserLocale: getCurrentActiveUserLocale()
      }
      const result = await client.request<EmployeeData>(GET_EMPLOYEE_DATA, variables)
      setData(result)
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch employee data'))
    } finally {
      setIsLoading(false)
    }
  }, [accessToken, client, employeeId, structureId, skipRequest, setData, setIsLoading, setError]) // Added state setters to dependencies as they are used, though stable

  // Same as fetchData but skips the loading state — used for background refreshes after
  // process completions so the UI doesn't flash a spinner unnecessarily.
  const silentFetchData = useCallback(async () => {
    if (skipRequest || !accessToken || !employeeId) return
    try {
      const variables = {
        employeeId,
        structureId: structureId ?? '',
        hasStructureId: !!structureId,
        activeUserLocale: getCurrentActiveUserLocale()
      }
      const result = await client.request<EmployeeData>(GET_EMPLOYEE_DATA, variables)
      setData(result)
    } catch {
      // silently swallow — the UI already shows the latest optimistic data
    }
  }, [accessToken, client, employeeId, structureId, skipRequest, setData])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Extract data from the result
  const employeePosition = data?.EmployeePosition?.[0]
  const subordinates = data?.Subordinates ?? []
  let employee = null

  if (employeePosition?.employee) {
    const enhancedEmployeePosition = {
      ...employeePosition,
      subordinates
    }

    employee = {
      ...employeePosition.employee,
      employeePosition: enhancedEmployeePosition
    }
  }

  if (employee?.academicTitleRef) {
    const employeeAcademicTitles = new Set(employee?.academicTitleRef ?? [])
    const filteredAcademicTitles =
      data?.Catalog?.[0]?.catalogEntries?.filter(academicTitle => employeeAcademicTitles.has(academicTitle.id)) ?? []
    const translatedAcademicTitles = filteredAcademicTitles.map(academicTitle => getTranslatedValue(academicTitle))
    employee.academicTitleRef = translatedAcademicTitles.join(' ')
  }

  return {
    employeeData: data,
    employee,
    employeePosition,
    feedback: data?.EmployeeFeedback || [],
    absenceEntitlements: data?.EmployeeAbsenceEntitlement || [],
    performanceGoals: data?.EmployeePerformanceGoal || [],
    loading: isLoading,
    error,
    refetch: fetchData,
    silentRefetch: silentFetchData
  }
}

/**
 * Types for employee data response
 */
export interface EmployeeData {
  Catalog: {
    id: string
    catalogEntries: {
      id: string
      value: string
      translations: {
        value: string
      }[]
    }[]
  }[]
  EmployeePosition: EmployeePosition[]
  Subordinates: {
    employee: {
      id: string
      firstName: string
      lastName: string
      pictureThumbnail: string
      picture: string
    }
    jobPosition: {
      name: string
    }
  }[]
  EmployeeFeedback: EmployeeFeedback[]
  EmployeeAbsenceEntitlement: EmployeeAbsenceEntitlement[]
  EmployeePerformanceGoal: EmployeePerformanceGoal[]
}

interface EmployeeSkill {
  id: string
  level: string | null
  isDeleted: boolean
  recordState?: string | null
  processInstanceId?: string | null
  verificationDocumentId?: string | null
  acl?: unknown
  additionalProperties?: unknown
  synchronizedAt: string | null
  validFrom?: string | null
  validTo?: string | null
  createdAt?: string | null
  updatedAt?: string | null
  skill: {
    id: string
    name: string
    updatedAt: string | null
    createdAt: string | null
    additionalProperties?: unknown
  }
}

export interface Employee {
  id: string
  code: string
  workspace: string
  version: number
  externalId?: string | null
  hrReferenceCode?: string | null
  pictureThumbnail: string
  userId?: string
  skills: EmployeeSkill[]
  additionalProperties: {
    email: string
    phone: string
    mobile: string
    userId?: string
    SAPNumber?: string
  }
  salutation: CodeValue
  maritalStatus: CodeValue
  gender: CodeValue
  academicTitleRef: string
  firstName: string
  preferredName: string
  birthDate: string
  birthName: string
  lastName: string
  displayName: string
  ethnicity: CodeValue
  birthPlace: string
  nationality: CodeValue
  language: CodeValue
  jobHistories: JobHistory[]
  addresses: Address[]
  relationship: Relationship[]
  communication: Communication[]
  workingCondition: WorkingCondition[]
  workingHours: WorkingHours[]
  workPermit: WorkPermit
  bankAccounts: BankAccount[]
  taxDetails: TaxDetail[]
  fullTimeEquivalent: number
  employeePosition?: EmployeePosition
}

interface EmployeePosition {
  organizationalUnitId: string
  supervisorEmployeeId?: string | null
  organizationalUnit: {
    name: string
  }
  supervisor: {
    firstName: string
    lastName: string
    id: string
    displayName: string
    pictureThumbnail?: string
    employeePosition?: {
      jobPosition?: {
        name: string
      }
    }
  }
  jobPosition: {
    name: string
    id?: string
    jobFunction?: {
      id: string
      name: string
      jobFamily?: {
        value: string
      }
    }
    jobLevel?: {
      id: string
      name: string
    }
    jobProfile?: {
      name: string
      jobProfileSkills?: Array<{
        skill: { id: string; name: string }
        requiredLevel?: number | null
      }>
    }
  }
  jobPositionId: string
  jobLevel?: {
    name: string
    id: string
  }
  siteLocation: {
    name: string
    id: string
  }
  companyId: string
  company: {
    name: string
  }
  siteLocationId: string
  costCenterId: string
  costCenter: {
    id: string
    name: string
  }
  employee: Employee
  employeeId: string
  subordinates: {
    employee: {
      id: string
      firstName: string
      lastName: string
      pictureThumbnail: string
      picture: string
    }
    jobPosition: {
      name: string
    }
  }[]
  matrixUnitEmployees: {
    matrixUnit: {
      id: string
      name: string
    }
  }[]
  employeeCapabilities: {
    capability: {
      id: string
      name: string
    }
  }[]
}

interface CodeValue {
  id: string
  value: string
  translations?: {
    localeCode: string
    value: string
  }[]
  parentEntry?: {
    code?: string
  }
}

interface JobHistory {
  activeFrom: string
  activeTo: string
  company: string
  country: CodeValue
  exitDate: string
  hireDate: string
  jobPosition: string
  locality: string
  region: CodeValue
}

interface Address {
  id: string
  version: number
  addressLine: string[]
  postalCode: string
  locality: string
  region: CodeValue
  country: CodeValue
  type: string
}

interface Relationship {
  isEmergencyContact: boolean
  type: CodeValue
  firstName: string
  lastName: string
  birthDate: string
  phoneNumber: string
  email: string
}

interface Communication {
  id: string
  version: number
  channelRef: string
  value: string
  purpose: string
  type: {
    value: string
  }
  channel: {
    value: string
    code: string
    additionalValue1: string
  }
}

interface WorkingCondition {
  id: string
  version: number
  regionRef: string
  probationEnd: string
  contractType: CodeValue
  employmentType: CodeValue
  region: CodeValue
  remote: CodeValue
  hireDate: string
  vacationDays: number
  exitDate: string
  additionalProperties?: {
    fixedTermReason?: string
  }
}

interface WorkingHours {
  id: string
  version: number
  weeklyHours: number
  fullTimeEquivalent: number
  mondayHours: number
  remote: CodeValue
  thursdayHours: number
  wednesdayHours: number
  tuesdayHours: number
  fridayHours: number
  saturdayHours: number
  sundayHours: number
  weeklyDays: number
}

interface WorkPermit {
  type: {
    value: string
  }
}

interface BankAccount {
  iban: string
  bankName: string
  accountHolder: string
}

interface TaxDetail {
  taxNumber: string
  taxBracketRef: string
  taxIdentificationNumber: string
  socialSecurityNumber: string
  taxableChurchAffiliationRef: string
  childTaxAllowance: number
  healthInsuranceName: string
  healthInsuranceTypeRef: string
  additionalProperties?: {
    requestAtTaxOffice?: boolean
    employeeTaxOffice?: string
    individualFreeAmount?: string
  }
  updatedAt?: string | null
}

export interface EmployeeFeedback {
  feedback: string
  feedbackDate: string
  senderEmployeeId: string
  senderEmployee: {
    firstName: string
    lastName: string
    displayName?: string | null
    employeePosition: {
      employee: {
        pictureThumbnail: string
        picture: string
      }
    }
  }
}

export interface EmployeeAbsenceEntitlement {
  employeeId: string
  type: {
    id: string
    value: string
    translations: {
      localeCode: string
      value: string
    }[]
    objectValue?: {
      color?: string
      checkEntitlement?: boolean
    }
  }
  available: number
  pending: number
  total: number
  approved: number
  validFrom: string
  validTo: string
}

export interface EmployeePerformanceGoal {
  id?: string
  employeeId?: string
  dueDate: string
  completionDate: string
  startDate: string
  status: string
  title: string
  progressPercent: number
  version?: number
  createdAt?: string
  updatedAt?: string
  additionalProperties?: {
    goalType?: 'PERCENTAGE' | 'NUMERIC' | 'MILESTONE'
    numeric?: {
      target?: number
      current?: number
      unit?: string
    }
    milestones?: Array<{
      id: string
      title: string
      done: boolean
      doneAt?: string
    }>
  }
}
