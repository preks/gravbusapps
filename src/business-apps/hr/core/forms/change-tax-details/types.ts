export interface CatalogEntry {
  id: string
  value?: string
  translations?: Array<{ localeCode: string; value: string }>
  objectValue?: unknown
}

export interface TaxInfoFormValues {
  taxNumber: string
  taxBracketRef: string | null
  healthInsuranceName: string
  healthInsuranceTypeRef: string | null
  taxIdentificationNumber: string
  taxableChurchAffiliationRef: string | null
  socialSecurityNumber: string
  childTaxAllowance: string
  requestAtTaxOffice: boolean
  employeeTaxOffice: string
  individualFreeAmount: string
  healthInsuranceDocumentTypeId: string | null
  healthInsuranceDocumentValidTo: string
  uploadedHealthInsuranceDocumentId?: string
  uploadNewHealthInsuranceDocument: boolean
}

export interface TaxDetailsCatalogs {
  taxBracket: CatalogEntry[]
  religion: CatalogEntry[]
  healthInsuranceType: CatalogEntry[]
  documentType: CatalogEntry[]
}
