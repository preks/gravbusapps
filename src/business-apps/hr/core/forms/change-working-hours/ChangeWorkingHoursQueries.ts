export const EMPLOYEE_DATA_QUERY = `query MyQuery ($employeeId: uuid!) {
  Employee(where: {id: {_eq: $employeeId}}) {
    firstName
    lastName
    employeePosition{
      jobPosition {
        name
      }
    }
    id
    pictureThumbnail
  }
 employee: Employee(where: {isDeleted: {_eq: false}, id: {_eq: $employeeId}}) {
    id
    workingHours {
      fridayHours
      id
      mondayHours
      saturdayHours
      sundayHours
      thursdayHours
      tuesdayHours
      version
      wednesdayHours
      weeklyHours
      employeeId
      remoteRef
    }
  }
}
`
export const ALL_EMPLOYEE_DATA_QUERY = `query MyQuery($userId: String!, $structureId: uuid!) {
  allEmployees: Employee(where:{isDeleted: {_eq: false}, employeePosition: {structureId: {_eq: $structureId}}}, orderBy: {firstName: ASC}) {
      firstName
      lastName
      id
    }
  loggedInEmployee: Employee(where: {userId: {_eq: $userId}}) {
    id
    firstName
    lastName
    userId
  }
}`
