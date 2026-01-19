export const EMPLOYEE_REF = `
    id
    code
    firstName
    lastName
    displayName
    fullName
    picture
    pictureThumbnail
    userId
    employeePosition {
      jobPosition { name }
      organizationalUnit { id name }
    }
`
