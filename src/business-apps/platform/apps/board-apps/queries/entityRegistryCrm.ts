/**
 * Entity registry (CRM, Finance, and Other): Sales, expense, asset,
 * and content entities.
 *
 * HR / Org / Recruiting entities live in ./entityRegistry.ts.
 * Field definitions MUST match exactly what the corresponding query requests.
 */

import type { EntityFieldDef, EntityQueryDef } from './entityQueries'
import {
  ACCOUNT_QUERY,
  CONTACT_QUERY,
  LEAD_QUERY,
  OPPORTUNITY_QUERY,
  SALES_ACTIVITY_QUERY,
  SALES_TASK_QUERY,
  SALES_CAMPAIGN_QUERY,
  EXPENSE_REQUEST_QUERY,
  EXPENSE_PLAN_QUERY,
  ASSET_QUERY,
  CONTENT_ENTRY_QUERY
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

export const ENTITY_REGISTRY_CRM: Record<string, EntityQueryDef> = {
  Account: {
    displayName: 'CRM Accounts',
    description: 'Customer accounts',
    category: 'crm',
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
    category: 'crm',
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
      f('jobTitle', 'Job Title', 'text', true, 'jobTitle'),
      f('owner', 'Owner', 'text', false, 'ownerEmployee.displayName'),
      f('createdAt', 'Created At', 'datetime', false, 'createdAt')
    ]
  },
  Lead: {
    displayName: 'CRM Leads',
    description: 'Sales leads',
    category: 'crm',
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
    category: 'crm',
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
      f('pipeline', 'Pipeline', 'text', false, 'salesPipeline.value'),
      f('stage', 'Stage', 'text', true, 'salesPipelineStage.value'),
      f('company', 'Company', 'text', true, 'company.name'),
      f('owner', 'Owner', 'text', false, 'ownerEmployee.displayName'),
      f('createdAt', 'Created At', 'datetime', false, 'createdAt')
    ]
  },
  SalesActivity: {
    displayName: 'Sales Activities',
    description: 'Calls, meetings, tasks',
    category: 'crm',
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
    category: 'crm',
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
    category: 'crm',
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
    category: 'finance',
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
    category: 'finance',
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
    category: 'other',
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
    category: 'other',
    query: CONTENT_ENTRY_QUERY,
    entityKey: 'ContentEntry',
    aggregateKey: 'ContentEntryAggregate',
    boolExpType: 'ContentEntryBoolExp',
    orderByType: 'ContentEntryOrderBy',
    fields: [
      f('id', 'ID', 'text', false, 'id'),
      f('title', 'Title', 'text', true, 'title'),
      f('preview', 'Preview', 'text', true, 'preview'),
      f('contentGroup', 'Group', 'text', true, 'contentGroup'),
      f('contentType', 'Type', 'text', true, 'contentType.name'),
      f('language', 'Language', 'text', false, 'language.value'),
      f('creator', 'Creator', 'text', true, 'creatorEmployee.displayName'),
      f('createdAt', 'Created At', 'datetime', false, 'createdAt')
    ]
  }
}
