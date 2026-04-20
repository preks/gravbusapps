export const GET_TAX_DETAILS_EMPLOYEE = `query fetchEmployeeData($idEmployee: uuid!, $activeUserLocale: String!) {
  EmployeeTaxDetail(where: {employeeId: {_eq: $idEmployee}, isDeleted: {_eq: false}}) {
    id
    version
    updatedAt
    additionalProperties
    healthInsuranceName
    healthInsuranceTypeRef
    healthInsuranceDocument {
      id
      type
    }
    taxNumber
    taxBracketRef
    taxIdentificationNumber
    taxableChurchAffiliationRef
    wageTaxClassRef
    socialSecurityNumber
    childTaxAllowance
  }
  EmployeeByPk(id: $idEmployee){
    id
    birthDate
    birthName
    lastName
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
  EmployeeWorkingCondition(where: {employeeId: {_eq: $idEmployee}}) {
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
  taxBracket: CatalogEntry(where: {catalog: {version: {_eq: "v1"}, identifier: {_eq: "TaxBracket"}}, isDeleted: {_eq: false}}, orderBy: {value: ASC}) {
    id
    value
    objectValue
    translations(where: {localeCode: {_eq: $activeUserLocale}}) {
      localeCode
      value
    }
  }
  churchAffiliation: CatalogEntry(where: {catalog: {version: {_eq: "v1"}, identifier: {_eq: "TaxableChurchAffiliation"}}, isDeleted: {_eq: false}}, orderBy: {value: ASC}) {
    id
    value
    objectValue
    translations(where: {localeCode: {_eq: $activeUserLocale}}) {
      localeCode
      value
    }
  }
  healthInsuranceType: CatalogEntry(where: {catalog: {version: {_eq: "v1"}, identifier: {_eq: "HealthInsuranceType"}}, isDeleted: {_eq: false}}, orderBy: {value: ASC}) {
    id
    value
    objectValue
    translations(where: {localeCode: {_eq: $activeUserLocale}}) {
      localeCode
      value
    }
  }
  documentType: CatalogEntry(where: {catalog: {version: {_eq: "v1"}, identifier: {_eq: "DocumentType"}}, parentEntryId: {_eq: "DocumentGroup:v1:SALARY"}, value: {_ilike: "%Insurance%"}, isDeleted: {_eq: false}}, orderBy: {value: ASC}) {
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
