/**
 * Entity registry: maps each entity type to its query definition,
 * field descriptors, and response keys.
 *
 * Field definitions MUST match exactly what the corresponding query
 * in graphql.ts requests. Do not add fields here that aren't in the query.
 */

import type { EntityFieldDef, EntityQueryDef } from './entityQueries'
import {
  EMPLOYEE_QUERY,
  EMPLOYEE_ABSENCE_QUERY,
  ACCOUNT_QUERY,
  CONTACT_QUERY,
  LEAD_QUERY,
  OPPORTUNITY_QUERY,
  SALES_ACTIVITY_QUERY,
  EXPENSE_REQUEST_QUERY,
  EXPENSE_PLAN_QUERY,
  SALES_TASK_QUERY,
  SALES_CAMPAIGN_QUERY,
  ASSET_QUERY,
  CONTENT_ENTRY_QUERY,
  PERFORMANCE_GOAL_QUERY,
  JOB_POSITION_QUERY
} from './graphql'

type F = EntityFieldDef
const f = (
  key: string,
  label: string,
  type: F['type'],
  defaultVisible: boolean,
  path: string,
  extractor?: F['extractor']
): F => ({ key, label, type, defaultVisible, path, ...(extractor ? { extractor } : {}) })

export const ENTITY_REGISTRY: Record<string, EntityQueryDef> = {
  Employee: {
    displayName: 'Employees',
    description: 'HR employee records',
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
      f('nationality', 'Nationality', 'text', false, 'nationality.value')
    ]
  },
  EmployeeAbsence: {
    displayName: 'Employee Absences',
    description: 'Leave and absence records',
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
  Account: {
    displayName: 'CRM Accounts',
    description: 'Customer accounts',
    query: ACCOUNT_QUERY,
    entityKey: 'Account',
    aggregateKey: 'AccountAggregate',
    boolExpType: 'AccountBoolExp',
    orderByType: 'AccountOrderBy',
    fields: [
      f('id', 'ID', 'text', false, 'id'),
      f('code', 'Code', 'text', false, 'code'),
      f('name', 'Name', 'text', true, 'name'),
      f('website', 'Website', 'url', true, 'website'),
      f('prospective', 'Prospective', 'boolean', false, 'prospective'),
      f('foundationDate', 'Foundation Date', 'date', false, 'foundationDate'),
      f('priority', 'Priority', 'text', true, 'accountPriority.value'),
      f('legalForm', 'Legal Form', 'text', false, 'legalForm.value'),
      f('owner', 'Owner', 'text', true, 'ownerEmployee.displayName'),
      f('createdAt', 'Created At', 'datetime', false, 'createdAt')
    ]
  },
  Contact: {
    displayName: 'CRM Contacts',
    description: 'Contact persons',
    query: CONTACT_QUERY,
    entityKey: 'Contact',
    aggregateKey: 'ContactAggregate',
    boolExpType: 'ContactBoolExp',
    orderByType: 'ContactOrderBy',
    fields: [
      f('id', 'ID', 'text', false, 'id'),
      f('code', 'Code', 'text', false, 'code'),
      f('firstName', 'First Name', 'text', true, 'firstName'),
      f('lastName', 'Last Name', 'text', true, 'lastName'),
      f('department', 'Department', 'text', true, 'department'),
      f('jobPosition', 'Job Position', 'text', true, 'jobPosition'),
      f('type', 'Type', 'text', true, 'type'),
      f('owner', 'Owner', 'text', false, 'ownerEmployee.displayName'),
      f('createdAt', 'Created At', 'datetime', false, 'createdAt')
    ]
  },
  Lead: {
    displayName: 'CRM Leads',
    description: 'Sales leads',
    query: LEAD_QUERY,
    entityKey: 'Lead',
    aggregateKey: 'LeadAggregate',
    boolExpType: 'LeadBoolExp',
    orderByType: 'LeadOrderBy',
    fields: [
      f('id', 'ID', 'text', false, 'id'),
      f('code', 'Code', 'text', false, 'code'),
      f('firstName', 'First Name', 'text', true, 'firstName'),
      f('lastName', 'Last Name', 'text', true, 'lastName'),
      f('email', 'Email', 'email', true, 'email'),
      f('companyName', 'Company', 'text', true, 'companyName'),
      f('companyEmail', 'Company Email', 'email', false, 'companyEmail'),
      f('description', 'Description', 'text', false, 'description'),
      f('status', 'Status', 'text', true, 'leadStatus.value'),
      f('rating', 'Rating', 'text', true, 'leadRating.value'),
      f('source', 'Source', 'text', false, 'leadSource.value'),
      f('owner', 'Owner', 'text', false, 'ownerEmployee.displayName'),
      f('createdAt', 'Created At', 'datetime', false, 'createdAt')
    ]
  },
  Opportunity: {
    displayName: 'CRM Opportunities',
    description: 'Sales pipeline',
    query: OPPORTUNITY_QUERY,
    entityKey: 'Opportunity',
    aggregateKey: 'OpportunityAggregate',
    boolExpType: 'OpportunityBoolExp',
    orderByType: 'OpportunityOrderBy',
    fields: [
      f('id', 'ID', 'text', false, 'id'),
      f('code', 'Code', 'text', false, 'code'),
      f('name', 'Name', 'text', true, 'name'),
      f('estimatedAmount', 'Amount', 'number', true, 'estimatedAmount'),
      f('winningChance', 'Win %', 'number', true, 'winningChance'),
      f('closeDate', 'Close Date', 'date', true, 'closeDate'),
      f('currency', 'Currency', 'text', false, 'currency.code'),
      f('status', 'Status', 'text', true, 'opportunityStatus.value'),
      f('pipeline', 'Pipeline', 'text', false, 'opportunityPipeline.value'),
      f('stage', 'Stage', 'text', true, 'opportunityPipelineStage.value'),
      f('company', 'Company', 'text', true, 'company.name'),
      f('owner', 'Owner', 'text', false, 'ownerEmployee.displayName'),
      f('createdAt', 'Created At', 'datetime', false, 'createdAt')
    ]
  },
  SalesActivity: {
    displayName: 'Sales Activities',
    description: 'Calls, meetings, tasks',
    query: SALES_ACTIVITY_QUERY,
    entityKey: 'SalesActivity',
    aggregateKey: 'SalesActivityAggregate',
    boolExpType: 'SalesActivityBoolExp',
    orderByType: 'SalesActivityOrderBy',
    fields: [
      f('id', 'ID', 'text', false, 'id'),
      f('title', 'Title', 'text', true, 'title'),
      f('activityType', 'Type', 'text', true, 'activityType.value'),
      f('occurredAt', 'Occurred At', 'datetime', true, 'occurredAt'),
      f('owner', 'Owner', 'text', true, 'ownerEmployee.fullName'),
      f('accountName', 'Account', 'text', true, 'account.name'),
      f('contactName', 'Contact', 'text', false, 'contact.firstName'),
      f('opportunityName', 'Opportunity', 'text', false, 'opportunity.name'),
      f('description', 'Description', 'text', false, 'description'),
      f('source', 'Source', 'text', false, 'source'),
      f('createdAt', 'Created At', 'datetime', false, 'createdAt')
    ]
  },
  SalesTask: {
    displayName: 'Sales Tasks',
    description: 'CRM tasks and to-dos',
    query: SALES_TASK_QUERY,
    entityKey: 'SalesTask',
    aggregateKey: 'SalesTaskAggregate',
    boolExpType: 'SalesTaskBoolExp',
    orderByType: 'SalesTaskOrderBy',
    fields: [
      f('id', 'ID', 'text', false, 'id'),
      f('code', 'Code', 'text', false, 'code'),
      f('name', 'Name', 'text', true, 'name'),
      f('type', 'Type', 'text', true, 'type.value'),
      f('priority', 'Priority', 'text', true, 'priority.value'),
      f('status', 'Status', 'text', true, 'status.value'),
      f('dueDate', 'Due Date', 'date', true, 'dueDate'),
      f('startDate', 'Start Date', 'date', false, 'startDate'),
      f('endDate', 'End Date', 'date', false, 'endDate'),
      f('creator', 'Creator', 'text', false, 'creatorEmployee.displayName'),
      f('accountName', 'Account', 'text', true, 'account.name'),
      f('opportunityName', 'Opportunity', 'text', false, 'opportunity.name'),
      f('description', 'Description', 'text', false, 'description'),
      f('createdAt', 'Created At', 'datetime', false, 'createdAt')
    ]
  },
  SalesCampaign: {
    displayName: 'Sales Campaigns',
    description: 'Marketing campaigns',
    query: SALES_CAMPAIGN_QUERY,
    entityKey: 'SalesCampaign',
    aggregateKey: 'SalesCampaignAggregate',
    boolExpType: 'SalesCampaignBoolExp',
    orderByType: 'SalesCampaignOrderBy',
    fields: [
      f('id', 'ID', 'text', false, 'id'),
      f('name', 'Name', 'text', true, 'name'),
      f('description', 'Description', 'text', false, 'description'),
      f('typeRef', 'Type', 'text', true, 'typeRef'),
      f('startDate', 'Start Date', 'date', true, 'startDate'),
      f('endDate', 'End Date', 'date', true, 'endDate'),
      f('createdAt', 'Created At', 'datetime', false, 'createdAt')
    ]
  },
  ExpenseRequest: {
    displayName: 'Expense Requests',
    description: 'Finance expense records',
    query: EXPENSE_REQUEST_QUERY,
    entityKey: 'ExpenseRequest',
    aggregateKey: 'ExpenseRequestAggregate',
    boolExpType: 'ExpenseRequestBoolExp',
    orderByType: 'ExpenseRequestOrderBy',
    fields: [
      f('id', 'ID', 'text', false, 'id'),
      f('code', 'Code', 'text', true, 'code'),
      f('title', 'Title', 'text', true, 'title'),
      f('status', 'Status', 'text', true, 'status'),
      f('totalAmount', 'Total Amount', 'number', true, 'totalAmount'),
      f('currency', 'Currency', 'text', true, 'currency.code'),
      f('requestDate', 'Request Date', 'date', true, 'requestDate'),
      f('startDate', 'Start Date', 'date', false, 'startDate'),
      f('endDate', 'End Date', 'date', false, 'endDate'),
      f('requestType', 'Request Type', 'text', true, 'requestType.value'),
      f('employeeName', 'Employee', 'text', true, 'employee.firstName'),
      f('department', 'Department', 'text', false, 'employee.employeePosition.organizationalUnit.name'),
      f('createdAt', 'Created At', 'datetime', false, 'createdAt')
    ]
  },
  ExpensePlan: {
    displayName: 'Expense Plans',
    description: 'Expense plan submissions',
    query: EXPENSE_PLAN_QUERY,
    entityKey: 'ExpensePlan',
    aggregateKey: 'ExpensePlanAggregate',
    boolExpType: 'ExpensePlanBoolExp',
    orderByType: 'ExpensePlanOrderBy',
    fields: [
      f('id', 'ID', 'text', false, 'id'),
      f('code', 'Code', 'text', true, 'code'),
      f('title', 'Title', 'text', true, 'title'),
      f('status', 'Status', 'text', true, 'status'),
      f('totalAmount', 'Total Amount', 'number', true, 'totalAmount'),
      f('currency', 'Currency', 'text', true, 'currency.code'),
      f('startDate', 'Start Date', 'date', false, 'startDate'),
      f('endDate', 'End Date', 'date', false, 'endDate'),
      f('requestType', 'Type', 'text', false, 'requestType.value'),
      f('employeeName', 'Employee', 'text', true, 'employee.firstName'),
      f('department', 'Department', 'text', false, 'employee.employeePosition.organizationalUnit.name'),
      f('createdAt', 'Created At', 'datetime', false, 'createdAt')
    ]
  },
  Asset: {
    displayName: 'Assets',
    description: 'Company assets and equipment',
    query: ASSET_QUERY,
    entityKey: 'Asset',
    aggregateKey: 'AssetAggregate',
    boolExpType: 'AssetBoolExp',
    orderByType: 'AssetOrderBy',
    fields: [
      f('id', 'ID', 'text', false, 'id'),
      f('model', 'Model', 'text', true, 'model'),
      f('serialNumber', 'Serial Number', 'text', true, 'serialNumber'),
      f('category', 'Category', 'text', true, 'assetCategory.value'),
      f('brand', 'Brand', 'text', true, 'assetBrand.value'),
      f('assetStatus', 'Status', 'text', true, 'assetStatus'),
      f('inventoryValue', 'Value', 'number', true, 'inventoryValue'),
      f('currency', 'Currency', 'text', false, 'currency.code'),
      f('acquisitionDate', 'Acquisition Date', 'date', false, 'acquisitionDate'),
      f('location', 'Location', 'text', false, 'siteLocation.name'),
      f('notes', 'Notes', 'text', false, 'notes'),
      f('createdAt', 'Created At', 'datetime', false, 'createdAt')
    ]
  },
  ContentEntry: {
    displayName: 'Content Entries',
    description: 'Knowledge base articles',
    query: CONTENT_ENTRY_QUERY,
    entityKey: 'ContentEntry',
    aggregateKey: 'ContentEntryAggregate',
    boolExpType: 'ContentEntryBoolExp',
    orderByType: 'ContentEntryOrderBy',
    fields: [
      f('id', 'ID', 'text', false, 'id'),
      f('title', 'Title', 'text', true, 'title'),
      f('preview', 'Preview', 'text', true, 'preview'),
      f('contentGroup', 'Group', 'text', true, 'contentGroup.value'),
      f('contentType', 'Type', 'text', true, 'contentType.value'),
      f('language', 'Language', 'text', false, 'language.value'),
      f('creator', 'Creator', 'text', true, 'creatorEmployee.displayName'),
      f('createdAt', 'Created At', 'datetime', false, 'createdAt')
    ]
  },
  EmployeePerformanceGoal: {
    displayName: 'Performance Goals',
    description: 'Employee performance goals',
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
  JobPosition: {
    displayName: 'Job Positions',
    description: 'Organizational job positions',
    query: JOB_POSITION_QUERY,
    entityKey: 'JobPosition',
    aggregateKey: 'JobPositionAggregate',
    boolExpType: 'JobPositionBoolExp',
    orderByType: 'JobPositionOrderBy',
    fields: [
      f('id', 'ID', 'text', false, 'id'),
      f('name', 'Name', 'text', true, 'name'),
      f('profile', 'Profile', 'text', true, 'jobProfile.name'),
      f('function', 'Function', 'text', true, 'jobFunction.name'),
      f('level', 'Level', 'text', true, 'jobLevel.name'),
      f('contractType', 'Contract Type', 'text', false, 'contractType.value'),
      f('employmentType', 'Employment Type', 'text', false, 'employmentType.value')
    ]
  }
}
