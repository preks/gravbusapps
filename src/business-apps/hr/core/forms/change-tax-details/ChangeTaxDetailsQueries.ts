export const GET_TAX_DETAILS_EMPLOYEE = `query fetchEmployeeData($idEmployee: uuid!, $activeUserLocale: String!) {
  EmployeeTaxDetail(where: {employeeId: {_eq: $idEmployee}, isDeleted: {_eq: false}}) {
    id
    version
    updatedAt
    additionalProperties
    healthInsuranceName
    healthInsuranceTypeRef
    healthInsuranceDocument
    taxNumber
    taxBracketRef
    taxIdentificationNumber
    taxableChurchAffiliationRef
    wageTaxClassRef
    religionRef
    socialSecurityNumber
    childTaxAllowance
  }
  EmployeeByPk(id: $idEmployee){
    id
    gender{
      id
      value
      objectValue
      translations(where: {localeCode: {_eq: $activeUserLocale}}) {
        localeCode
        value
      }
    }
  }
}
`

/** Employee country from working condition: region.parentEntry = Country (id, code). */
export const GET_EMPLOYEE_COUNTRY = `query GetEmployeeCountry($employeeId: uuid!) {
  EmployeeWorkingCondition(where: {employeeId: {_eq: $employeeId}}) {
    region {
      parentEntry {
        id
        code
      }
    }
  }
}
`

export const GET_TAX_DETAILS_CATALOG = `query fetchTaxDetailsCatalog($activeUserLocale: String!) {
  taxBracket: CatalogEntry(where: {catalog: {version: {_eq: "v1"}, identifier: {_eq: "TaxBracket"}}}, orderBy: {value: ASC}) {
    id
    value
    objectValue
    translations(where: {localeCode: {_eq: $activeUserLocale}}) {
      localeCode
      value
    }
  }
  religion: CatalogEntry(where: {catalog: {version: {_eq: "v1"}, identifier: {_eq: "TaxableChurchAffiliation"}}}, orderBy: {value: ASC}) {
    id
    value
    objectValue
    translations(where: {localeCode: {_eq: $activeUserLocale}}) {
      localeCode
      value
    }
  }
  healthInsuranceType: CatalogEntry(where: {catalog: {version: {_eq: "v1"}, identifier: {_eq: "HealthInsuranceType"}}}, orderBy: {value: ASC}) {
    id
    value
    objectValue
    translations(where: {localeCode: {_eq: $activeUserLocale}}) {
      localeCode
      value
    }
  }
  documentType: CatalogEntry(where: {catalog: {version: {_eq: "v1"}, identifier: {_eq: "DocumentType"}}, parentEntryId: {_eq: "DocumentGroup:v1:SALARY"}, value: {_ilike: "%Insurance%"}}, orderBy: {value: ASC}) {
    id
    value
    parentEntryId
    translations(where: {localeCode: {_eq: $activeUserLocale}}) {
      localeCode
      value
    }
  }
}
`
