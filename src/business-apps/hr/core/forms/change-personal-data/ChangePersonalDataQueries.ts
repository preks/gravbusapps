export const EMPLOYEE_DATA_QUERY = `query fetchEmployee($idEmployee: uuid!) {
  EmployeeByPk(id: $idEmployee) {
    id
    version
    academicTitleRef
    birthName
    birthDate
    firstName
    notes
    genderRef
    birthPlace
    title
    lastName
    severelyDisabilityDegree
    schoolQualificationRef
    maritalStatusRef
    nationalityRef
    displayName
    preferredName
    salutationRef
    languageRef
    picture
    pictureThumbnail
    userId
  }
  EmployeePosition(where: {employeeId: {_eq: $idEmployee}}) {
    siteLocation {
      name
    }
    structureId
    jobPosition{
      name
    }
    organizationalUnit{
      name
    }
    organizationalUnitId
  }
}
`

export const CATALOG_DATA_QUERY = `query fetchCatalogData($activeUserLocale: String!) {
    schoolQualification: CatalogEntry(where: {catalog: {identifier: {_eq: "SchoolQualification"}}}) {
      value
      id
      translations(where: {localeCode: {_eq: $activeUserLocale}}) {
        localeCode
        value
      }
      catalog {
        defaultLocale
      }
    }
    academicTitle: CatalogEntry(where: {catalog: {version: {_eq: "v1"}, identifier: {_eq: "AcademicTitle"}}}) {
      value
      id
      translations(where: {localeCode: {_eq: $activeUserLocale}}) {
        localeCode
        value
      }
      catalog {
        defaultLocale
      }
    }
    salutation: CatalogEntry(where: {catalog: {version: {_eq: "v1"}, identifier: {_eq: "Salutation"}}}) {
      value
      id
      translations(where: {localeCode: {_eq: $activeUserLocale}}) {
        localeCode
        value
      }
      catalog {
        defaultLocale
      }
    }
    
    gender: CatalogEntry(where: {catalog: {version: {_eq: "v1"}, identifier: {_eq: "Gender"}}}) {
     value
      id
      translations(where: {localeCode: {_eq: $activeUserLocale}}) {
        localeCode
        value
      }
      catalog {
        defaultLocale
      }
    }
    
    nationality: CatalogEntry(where: {catalog: {version: {_eq: "v1"}, identifier: {_eq: "Nationality"}}}) {
      value
      id
      translations(where: {localeCode: {_eq: $activeUserLocale}}) {
        localeCode
        value
      }
      catalog {
        defaultLocale
      }
    }
    
    maritalStatus: CatalogEntry(where: {catalog: {version: {_eq: "v1"}, identifier: {_eq: "MaritalStatus"}}}) {
     value
      id
      translations(where: {localeCode: {_eq: $activeUserLocale}}) {
        localeCode
        value
      }
      catalog {
        defaultLocale
      }
    }
    
    language: CatalogEntry(where: {catalog: {version: {_eq: "v1"}, identifier: {_eq: "Languages"}}}) {
      value
      id
      translations(where: {localeCode: {_eq: $activeUserLocale}}) {
        localeCode
        value
      }
      catalog {
        defaultLocale
      }
    }
    
    documentGroup: CatalogEntry(where: {catalog: {version: {_eq: "v1"}, identifier: {_eq: "DocumentGroup"}}}) {
      value
      id
      translations(where: {localeCode: {_eq: $activeUserLocale}}) {
        localeCode
        value
      }
      catalog {
        defaultLocale
      }
    }
    
    documentType: CatalogEntry(where: {catalog: {version: {_eq: "v1"}, identifier: {_eq: "DocumentType"}}}) {
      value
      id
      translations(where: {localeCode: {_eq: $activeUserLocale}}) {
        localeCode
        value
      }
      catalog {
        defaultLocale
      }
    }
    
  }
  `
