import type { Control } from 'react-hook-form'

export interface CatalogTranslation {
  value?: string
}

export interface CatalogEntry {
  id: string | number
  value?: string
  translations?: CatalogTranslation[]
  parentEntryId?: string | null
}

export interface EmployeeByPk {
  id?: string
  userId?: string
  version?: number
  personalDocument?: {
    id?: string | null
    documentGroup?: string | null
    type?: string | null
  } | null
  personalDocumentId?: string | null
  status?: string | null
  salutationRef?: string | null
  salutation?: CatalogEntry | null
  title?: string
  firstName?: string
  lastName?: string
  preferredName?: string
  displayName?: string
  fullName?: string
  birthName?: string
  birthDate?: string | null
  birthPlace?: string
  genderRef?: string | null
  gender?: CatalogEntry | null
  nationalityRef?: string | null
  nationality?: CatalogEntry | null
  languageRef?: string | null
  language?: CatalogEntry | null
  maritalStatusRef?: string | null
  maritalStatus?: CatalogEntry | null
  severelyDisabilityDegree?: string | number | null
  schoolQualificationRef?: string | null
  schoolQualification?: CatalogEntry | null
  academicTitleRef?: string[] | string | null
  notes?: string
  employeeId?: string
  pictureThumbnail?: string
}

export interface EmployeeDataResponse {
  EmployeeByPk?: EmployeeByPk
  EmployeePosition?: Array<{
    jobPosition?: {
      name?: string
    }
  }>
}

export interface CatalogsDataResponse {
  salutation?: CatalogEntry[]
  gender?: CatalogEntry[]
  nationality?: CatalogEntry[]
  language?: CatalogEntry[]
  maritalStatus?: CatalogEntry[]
  schoolQualification?: CatalogEntry[]
  academicTitle?: CatalogEntry[]
  documentGroup?: CatalogEntry[]
  documentType?: CatalogEntry[]
}

export interface ChangePersonalDataContextData {
  employee: EmployeeDataResponse | null
  catalogs: CatalogsDataResponse | null
}

export type PersonalDataFormValues = {
  salutationRef: string | null
  title: string
  firstName: string
  lastName: string
  displayName: string
  preferredName: string
  birthName: string
  birthDate: string
  birthPlace?: string
  genderRef?: string | null
  nationalityRef?: string | null
  languageRef?: string | null
  maritalStatusRef?: string | null
  severelyDisabilityDegree?: string | number
  schoolQualificationRef?: string | null
  academicTitleRefs?: string[]
  comment?: string
  employeeDocumentId?: string
  documentGroupId?: string | null
  documentTypeId?: string | null
}

export type TypedControl = Control<PersonalDataFormValues>
