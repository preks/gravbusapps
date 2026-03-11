/**
 * Query to fetch an employee with their work communications
 */
export const getEmployeeWithWorkCommunications = `
  query GetEmployeeWithWorkCommunications($employeeId: uuid!) {
    Employee(
      where: {
        _and: [
          { id: { _eq: $employeeId } }
          { isDeleted: { _eq: false } }
        ]
      }
      limit: 1
    ) {
      id
      firstName
      lastName
      workCommunications: EmployeeCommunication(
        where: {
          _and: [
            { isDeleted: { _eq: false } }
            { purpose: { _eq: "INTERNAL" } }
            { value: { _neq: "" } }
            { 
              _or: [
                { channelRef: { _eq: "CommunicationChannel:v1:e-mail" } }
                { channelRef: { _eq: "CommunicationChannel:v1:Mobile" } }
                { channelRef: { _eq: "CommunicationChannel:v1:Phone" } }
              ]
            }
          ]
        }
      ) {
        id
        purpose
        value
        channel {
          value
        }
        type {
          value
        }
      }
    }
  }
`
