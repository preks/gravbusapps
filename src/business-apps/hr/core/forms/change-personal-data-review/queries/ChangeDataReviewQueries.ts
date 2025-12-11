export const EMPLOYEE_DATA_QUERY = `query fetchEmployeeForReview($idEmployee: uuid!) {
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
  EmployeePosition(where: {employeeId: {_eq: $idEmployee}}, limit: 1) {
    siteLocation {
      name
    }
    structureId
    jobPosition {
      name
    }
    organizationalUnit {
      name
    }
    organizationalUnitId
  }
}
`
