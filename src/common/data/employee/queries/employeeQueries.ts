// Employee Queries (lightweight + helpers)
// Pattern aligned with src/common/data/investment/queries/*

export interface EmployeeSearchVariables {
  search?: string
  limit?: number
  offset?: number
}

// Lightweight employee search for autocomplete
export const SEARCH_EMPLOYEES_LIGHT = (variables: EmployeeSearchVariables = {}): string => {
  const search = (variables.search || '').trim()
  const limit = Math.min(variables.limit ?? 20, 100)
  const offset = variables.offset ?? 0

  return `
		query SearchEmployeesLight {
			Employee(
				limit: ${limit}
				offset: ${offset}
				orderBy: { displayName: ASC }
				where: {
					isDeleted: { _eq: false }
					_and: [
						{
							_or: [
								{ displayName: { _ilike: "%${search}%" } },
								{ firstName: { _ilike: "%${search}%" } },
								{ lastName: { _ilike: "%${search}%" } }
							]
						}
					]
				}
			) {
				id
				displayName
				firstName
				lastName
				userId
				pictureThumbnail
				employeePosition {
					jobPosition { name }
					organizationalUnit { id name }
				}
			}
		}
	`
}

// Fetch a single employee by id with lightweight fields for selectors
export const GET_EMPLOYEE_LIGHT_BY_ID = (id: string): string => {
  const safeId = (id || '').replace(/"/g, '')
  return `
    query GetEmployeeLightById {
      Employee(where: { id: { _eq: "${safeId}" } }, limit: 1) {
        id
        displayName
        firstName
        lastName
        userId
        pictureThumbnail
        employeePosition {
          jobPosition { name }
          organizationalUnit { id name }
        }
      }
    }
  `
}
