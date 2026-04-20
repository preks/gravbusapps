/**
 * Entity registry (core): HR and Recruiting entities.
 *
 * Organization entities live in ./entityRegistryOrg.ts.
 * CRM, Finance, and Other entities live in ./entityRegistryCrm.ts.
 * Field definitions MUST match exactly what the corresponding query requests.
 */

import type { EntityFieldDef, EntityQueryDef } from './entityQueries'
import { EMPLOYEE_QUERY, EMPLOYEE_ABSENCE_QUERY, PERFORMANCE_GOAL_QUERY } from './graphql'
import { JOB_CANDIDATE_QUERY, JOB_APPLICATION_QUERY, JOB_POSTING_QUERY, EMPLOYEE_BENEFIT_QUERY } from './graphqlOrg'

type F = EntityFieldDef
const f = (
  key: string,
  label: string,
  type: F['type'],
  defaultVisible: boolean,
  path: string,
  extractor?: F['extractor']
): F => ({ key, label, type, defaultVisible, path, ...(extractor ? { extractor } : {}) })

export const ENTITY_REGISTRY_CORE: Record<string, EntityQueryDef> = {
  Employee: {
    displayName: 'Employees',
    description: 'HR employee records',
    category: 'hr',
    query: EMPLOYEE_QUERY,
    entityKey: 'Employee',
    aggregateKey: 'EmployeeAggregate',
    boolExpType: 'EmployeeBoolExp',
    orderByType: 'EmployeeOrderBy',
    fields: [
      f('id', 'ID', 'text', false, 'id'),
      f('firstName', 'First Name', 'text', true, 'firstName'),
      f('lastName', 'Last Name', 'text', true, 'lastName'),
      f('displayName', 'Display Name', 'text', true, 'displayName'),
      f('fullName', 'Full Name', 'text', false, 'fullName'),
      f('code', 'Employee Code', 'text', false, 'code'),
      f('email', 'Email', 'email', true, 'communication', 'employeeEmail'),
      f('phone', 'Phone', 'text', false, 'communication', 'employeePhone'),
      f('birthDate', 'Birth Date', 'date', false, 'birthDate'),
      f('hireDate', 'Hire Date', 'date', false, 'workingCondition.0.hireDate'),
      f('contractType', 'Contract Type', 'text', false, 'workingCondition.0.contractType.value'),
      f('employmentType', 'Employment Type', 'text', false, 'workingCondition.0.employmentType.value'),
      f('jobPosition', 'Job Position', 'text', true, 'employeePosition.jobPosition.name'),
      f('department', 'Department', 'text', true, 'employeePosition.organizationalUnit.name'),
      f('supervisor', 'Supervisor', 'text', false, 'employeePosition.supervisor.displayName'),
      f('costCenter', 'Cost Center', 'text', false, 'employeePosition.costCenter.name'),
      f('gender', 'Gender', 'text', false, 'gender.value'),
      f('nationality', 'Nationality', 'text', false, 'nationality.value'),
      f('pictureThumbnail', 'Photo', 'text', false, 'pictureThumbnail')
    ]
  },
  EmployeeAbsence: {
    displayName: 'Employee Absences',
    description: 'Leave and absence records',
    category: 'hr',
    query: EMPLOYEE_ABSENCE_QUERY,
    entityKey: 'EmployeeAbsence',
    aggregateKey: 'EmployeeAbsenceAggregate',
    boolExpType: 'EmployeeAbsenceBoolExp',
    orderByType: 'EmployeeAbsenceOrderBy',
    fields: [
      f('id', 'ID', 'text', false, 'id'),
      f('startDate', 'Start Date', 'date', true, 'startDate'),
      f('endDate', 'End Date', 'date', true, 'endDate'),
      f('status', 'Status', 'text', true, 'status'),
      f('calendarDays', 'Calendar Days', 'number', true, 'calendarDays'),
      f('effectiveDays', 'Effective Days', 'number', true, 'effectiveDays'),
      f('absenceType', 'Absence Type', 'text', true, 'type.value'),
      f('employeeName', 'Employee', 'text', true, 'employee.displayName'),
      f('department', 'Department', 'text', false, 'employee.employeePosition.organizationalUnit.name'),
      f('createdAt', 'Created At', 'datetime', false, 'createdAt')
    ]
  },
  EmployeePerformanceGoal: {
    displayName: 'Performance Goals',
    description: 'Employee performance goals',
    category: 'hr',
    query: PERFORMANCE_GOAL_QUERY,
    entityKey: 'EmployeePerformanceGoal',
    aggregateKey: 'EmployeePerformanceGoalAggregate',
    boolExpType: 'EmployeePerformanceGoalBoolExp',
    orderByType: 'EmployeePerformanceGoalOrderBy',
    fields: [
      f('id', 'ID', 'text', false, 'id'),
      f('title', 'Title', 'text', true, 'title'),
      f('status', 'Status', 'text', true, 'status'),
      f('progressPercent', 'Progress %', 'number', true, 'progressPercent'),
      f('startDate', 'Start Date', 'date', true, 'startDate'),
      f('dueDate', 'Due Date', 'date', true, 'dueDate'),
      f('completionDate', 'Completed', 'date', false, 'completionDate'),
      f('employeeId', 'Employee ID', 'text', false, 'employeeId'),
      f('createdAt', 'Created At', 'datetime', false, 'createdAt')
    ]
  },
  EmployeeBenefit: {
    displayName: 'Employee Benefits',
    description: 'Employee benefit enrollments and contributions',
    category: 'hr',
    query: EMPLOYEE_BENEFIT_QUERY,
    entityKey: 'EmployeeBenefit',
    aggregateKey: 'EmployeeBenefitAggregate',
    boolExpType: 'EmployeeBenefitBoolExp',
    orderByType: 'EmployeeBenefitOrderBy',
    fields: [
      f('id', 'ID', 'text', false, 'id'),
      f('benefitType', 'Benefit Type', 'text', true, 'benefitType.value'),
      f('benefitProvider', 'Provider', 'text', true, 'benefitProvider.value'),
      f('benefitStatus', 'Status', 'text', true, 'benefitStatus'),
      f('startDate', 'Start Date', 'date', true, 'startDate'),
      f('endDate', 'End Date', 'date', false, 'endDate'),
      f('monthlyContribution', 'Monthly Contribution', 'number', true, 'employeeMonthlyContribution'),
      f('yearlyContribution', 'Yearly Contribution', 'number', false, 'employeeYearlyContribution'),
      f('currency', 'Currency', 'text', false, 'currency.code'),
      f('employeeName', 'Employee', 'text', true, 'employee.displayName'),
      f('createdAt', 'Created At', 'datetime', false, 'createdAt')
    ]
  },
  JobCandidate: {
    displayName: 'Job Candidates',
    description: 'Recruiting candidates',
    category: 'recruiting',
    query: JOB_CANDIDATE_QUERY,
    entityKey: 'JobCandidate',
    aggregateKey: 'JobCandidateAggregate',
    boolExpType: 'JobCandidateBoolExp',
    orderByType: 'JobCandidateOrderBy',
    fields: [
      f('id', 'ID', 'text', false, 'id'),
      f('code', 'Code', 'text', false, 'code'),
      f('displayName', 'Display Name', 'text', true, 'displayName'),
      f('firstName', 'First Name', 'text', true, 'firstName'),
      f('lastName', 'Last Name', 'text', true, 'lastName'),
      f('birthDate', 'Birth Date', 'date', false, 'birthDate'),
      f('jobCandidateStatus', 'Status', 'text', true, 'jobCandidateStatus'),
      f('gender', 'Gender', 'text', false, 'gender.value'),
      f('nationality', 'Nationality', 'text', false, 'nationality.value'),
      f('createdAt', 'Created At', 'datetime', false, 'createdAt')
    ]
  },
  JobApplication: {
    displayName: 'Job Applications',
    description: 'Recruiting applications and pipeline stages',
    category: 'recruiting',
    query: JOB_APPLICATION_QUERY,
    entityKey: 'JobApplication',
    aggregateKey: 'JobApplicationAggregate',
    boolExpType: 'JobApplicationBoolExp',
    orderByType: 'JobApplicationOrderBy',
    fields: [
      f('id', 'ID', 'text', false, 'id'),
      f('applicationDate', 'Application Date', 'date', true, 'applicationDate'),
      f('recordState', 'Record State', 'text', false, 'recordState'),
      f('pipeline', 'Pipeline', 'text', true, 'jobApplicationPipeline.value'),
      f('stage', 'Stage', 'text', true, 'jobApplicationStage.value'),
      f('candidateName', 'Candidate', 'text', true, 'jobCandidate.displayName'),
      f('postingTitle', 'Job Posting', 'text', true, 'jobPosting.title'),
      f('createdAt', 'Created At', 'datetime', false, 'createdAt')
    ]
  },
  JobPosting: {
    displayName: 'Job Postings',
    description: 'Open job postings and requisitions',
    category: 'recruiting',
    query: JOB_POSTING_QUERY,
    entityKey: 'JobPosting',
    aggregateKey: 'JobPostingAggregate',
    boolExpType: 'JobPostingBoolExp',
    orderByType: 'JobPostingOrderBy',
    fields: [
      f('id', 'ID', 'text', false, 'id'),
      f('title', 'Title', 'text', true, 'title'),
      f('recordState', 'Record State', 'text', true, 'recordState'),
      f('pipeline', 'Pipeline', 'text', false, 'jobApplicationPipeline.value'),
      f('createdAt', 'Created At', 'datetime', false, 'createdAt')
    ]
  }
}
