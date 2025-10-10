export const EMPLOYEE_REF = `
    id
    code
    firstName
    lastName
    displayName
    fullName
    picture
    pictureThumbnail
    employeePosition {
      jobPosition { name }
      organizationalUnit { id name }
    }
`
