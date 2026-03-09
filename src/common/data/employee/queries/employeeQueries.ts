// Employee Queries (lightweight + helpers)
// Pattern aligned with src/common/data/investment/queries/*

export interface EmployeeSearchVariables {
  search?: string
  limit?: number
  offset?: number
}

/**
 * Lightweight employee search for autocomplete.
 *
 * IMPORTANT – Two-part pattern (do not break):
 * 1. Backend (here): Include `communication` in the where _or clause so email search works.
 *    Without it, typing "user@example.com" returns no results.
 * 2. Client (useEmployeeSearch, ShareAppDialog): Pass `communication` through; filter with
 *    getWorkEmailFromCommunication() only at use sites. Do not compute workEmail in the hook.
 */
export const SEARCH_EMPLOYEES_LIGHT = (variables: EmployeeSearchVariables = {}): string => {
  const rawSearch = (variables.search || '').trim()
  const search = rawSearch.replace(/\\/g, '\\\\').replace(/"/g, '\\"')
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
								{ lastName: { _ilike: "%${search}%" } },
								{ userId: { _ilike: "%${search}%" } },
								{ communication: { value: { _ilike: "%${search}%" }, channelRef: { _ilike: "%e-mail%" }, isDeleted: { _eq: false } } }
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
				communication(where: { isDeleted: { _eq: false } }) {
					value
					channelRef
				}
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
        communication(where: { isDeleted: { _eq: false } }) {
          value
          channelRef
        }
        employeePosition {
          jobPosition { name }
          organizationalUnit { id name }
        }
      }
    }
  `
}

// Fetch a single employee by userId (Keycloak ID) with lightweight fields
export const GET_EMPLOYEE_LIGHT_BY_USER_ID = (userId: string): string => {
  const safeId = (userId || '').replace(/"/g, '')
  return `
    query GetEmployeeLightByUserId {
      Employee(where: { userId: { _eq: "${safeId}" } }, limit: 1) {
        id
        displayName
        firstName
        lastName
        userId
        pictureThumbnail
        communication(where: { isDeleted: { _eq: false } }) {
          value
          channelRef
        }
        employeePosition {
          jobPosition { name }
          organizationalUnit { id name }
        }
      }
    }
  `
}
