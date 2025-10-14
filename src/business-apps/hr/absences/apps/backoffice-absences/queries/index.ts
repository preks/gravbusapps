/**
 * GraphQL Queries for Backoffice Absences
 * Centralized exports for all GraphQL queries used in the backoffice absences app
 */

export {
  GET_EMPLOYEE_ABSENCES,
  GET_TEAM_EMPLOYEES,
  GET_ORGANIZATIONAL_UNITS_FROM_EMPLOYEES,
  type GetEmployeeAbsencesVariables,
  type GetEmployeeAbsencesResponse,
  type EmployeeAbsence,
  type EmployeeAbsenceAggregate
} from './absenceQueries'
