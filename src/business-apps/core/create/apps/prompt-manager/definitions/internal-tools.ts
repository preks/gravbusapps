/**
 * Internal Tools for Task Experts
 *
 * These tools allow Task Experts to create and update platform entities
 * (Leads, Opportunities, Contacts, Accounts) via the platform APIs.
 *
 * Endpoint: POST https://newwork-dev.newwork.com/processes/customer-relations/{processName}
 *
 * All fields are validated against actual GraphQL schemas and form schemas
 * to prevent hallucinated fields.
 */

import { GET_CUSTOMER_360_TOOL } from './customer-360-tool'
import { GET_CUSTOMER_PORTFOLIO_TOOL } from './customer-portfolio-tool'

// ============================================================================
// LEAD TOOLS
// ============================================================================

export const CREATE_LEAD_SCHEMA = {
  type: 'object',
  properties: {
    firstName: { type: 'string', description: 'First name of the lead (required)' },
    lastName: { type: 'string', description: 'Last name of the lead (required)' },
    ownerEmployeeId: { type: 'string', description: 'UUID of the employee who owns this lead (required)' },
    email: { type: 'string', description: 'Personal email address' },
    phoneNumber: { type: 'string', description: 'Personal phone number' },
    companyName: { type: 'string', description: 'Company/organization name' },
    companyEmail: { type: 'string', description: 'Company email address' },
    companyPhone: { type: 'string', description: 'Company phone number' },
    companyWebsite: { type: 'string', description: 'Company website URL' },
    jobPosition: { type: 'string', description: 'Job title/position at company' },
    leadStatusRef: { type: 'string', description: 'Lead status catalog reference (e.g., SalesLeadStatus:v1:OPEN)' },
    leadSourceRef: { type: 'string', description: 'Lead source catalog reference (e.g., SalesLeadSource:v1:WEBSITE)' },
    leadRatingRef: { type: 'string', description: 'Lead rating catalog reference (e.g., SalesLeadRating:v1:HOT)' },
    industryClassRef: { type: 'string', description: 'Industry classification catalog reference' },
    companySizeRef: { type: 'string', description: 'Company size catalog reference (EmployeeSize:v1:...)' },
    accountAnnualRevenueBandRef: { type: 'string', description: 'Annual revenue band catalog reference' },
    legalFormRef: { type: 'string', description: 'Legal form catalog reference' },
    academicTitleRef: { type: 'string', description: 'Academic title catalog reference' },
    sensitive: { type: 'boolean', description: 'Whether the lead contains sensitive information' },
    addressLine: { type: 'string', description: 'Street address' },
    postalCode: { type: 'string', description: 'Postal/ZIP code' },
    locality: { type: 'string', description: 'City/locality name' },
    regionRef: { type: 'string', description: 'Region/state catalog reference' },
    countryRef: { type: 'string', description: 'Country catalog reference' },
    description: { type: 'string', description: 'Additional notes or description about the lead' }
  },
  required: ['firstName', 'lastName']
}

export const CREATE_LEAD_SOURCE = `async function handler(event, context) {
  const PROCESSES_BASE_URL = 'https://newwork-dev.newwork.com/processes';
  const accessToken = context.config?.accessToken;
  if (!accessToken) return { success: false, error: 'No access token available' };
  if (!event.firstName || !event.lastName) return { success: false, error: 'firstName and lastName are required' };

  const lead = {};
  const fields = ['firstName', 'lastName', 'ownerEmployeeId', 'email', 'phoneNumber', 'companyName', 'companyEmail', 'companyPhone', 'companyWebsite', 'jobPosition', 'leadStatusRef', 'leadSourceRef', 'leadRatingRef', 'industryClassRef', 'companySizeRef', 'accountAnnualRevenueBandRef', 'legalFormRef', 'academicTitleRef', 'sensitive', 'addressLine', 'postalCode', 'locality', 'regionRef', 'countryRef', 'description'];
  for (const f of fields) { if (event[f] !== undefined && event[f] !== null && event[f] !== '') lead[f] = event[f]; }
  if (!lead.leadStatusRef) lead.leadStatusRef = 'SalesLeadStatus:v1:OPEN';

  try {
    const response = await fetch(PROCESSES_BASE_URL + '/customer-relations/createLead', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + accessToken },
      body: JSON.stringify({ changeMode: 'INSERT', lead })
    });
    const data = await response.json().catch(() => response.text());
    return response.ok ? { success: true, message: 'Lead created', processId: data?.id, data } : { success: false, error: response.status + ' ' + response.statusText, details: data };
  } catch (e) { return { success: false, error: e.message || String(e) }; }
}`

export const UPDATE_LEAD_SCHEMA = {
  type: 'object',
  properties: {
    id: { type: 'string', description: 'UUID of the lead to update (required)' },
    version: { type: 'number', description: 'Current version number for optimistic locking (required)' },
    firstName: { type: 'string', description: 'First name of the lead' },
    lastName: { type: 'string', description: 'Last name of the lead' },
    ownerEmployeeId: { type: 'string', description: 'UUID of the employee who owns this lead' },
    email: { type: 'string', description: 'Personal email address' },
    phoneNumber: { type: 'string', description: 'Personal phone number' },
    companyName: { type: 'string', description: 'Company/organization name' },
    companyEmail: { type: 'string', description: 'Company email address' },
    companyPhone: { type: 'string', description: 'Company phone number' },
    companyWebsite: { type: 'string', description: 'Company website URL' },
    jobPosition: { type: 'string', description: 'Job title/position at company' },
    leadStatusRef: { type: 'string', description: 'Lead status catalog reference' },
    leadSourceRef: { type: 'string', description: 'Lead source catalog reference' },
    leadRatingRef: { type: 'string', description: 'Lead rating catalog reference' },
    industryClassRef: { type: 'string', description: 'Industry classification catalog reference' },
    companySizeRef: { type: 'string', description: 'Company size catalog reference' },
    accountAnnualRevenueBandRef: { type: 'string', description: 'Annual revenue band catalog reference' },
    legalFormRef: { type: 'string', description: 'Legal form catalog reference' },
    academicTitleRef: { type: 'string', description: 'Academic title catalog reference' },
    sensitive: { type: 'boolean', description: 'Whether the lead contains sensitive information' },
    addressLine: { type: 'string', description: 'Street address' },
    postalCode: { type: 'string', description: 'Postal/ZIP code' },
    locality: { type: 'string', description: 'City/locality name' },
    regionRef: { type: 'string', description: 'Region/state catalog reference' },
    countryRef: { type: 'string', description: 'Country catalog reference' },
    description: { type: 'string', description: 'Additional notes or description about the lead' }
  },
  required: ['id', 'version']
}

export const UPDATE_LEAD_SOURCE = `async function handler(event, context) {
  const PROCESSES_BASE_URL = 'https://newwork-dev.newwork.com/processes';
  const accessToken = context.config?.accessToken;
  if (!accessToken) return { success: false, error: 'No access token available' };
  if (!event.id || event.version === undefined) return { success: false, error: 'id and version are required' };

  const lead = { id: event.id, version: event.version };
  const fields = ['firstName', 'lastName', 'ownerEmployeeId', 'email', 'phoneNumber', 'companyName', 'companyEmail', 'companyPhone', 'companyWebsite', 'jobPosition', 'leadStatusRef', 'leadSourceRef', 'leadRatingRef', 'industryClassRef', 'companySizeRef', 'accountAnnualRevenueBandRef', 'legalFormRef', 'academicTitleRef', 'sensitive', 'addressLine', 'postalCode', 'locality', 'regionRef', 'countryRef', 'description'];
  for (const f of fields) { if (event[f] !== undefined) lead[f] = event[f]; }

  try {
    const response = await fetch(PROCESSES_BASE_URL + '/customer-relations/createLead', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + accessToken },
      body: JSON.stringify({ changeMode: 'UPDATE', lead })
    });
    const data = await response.json().catch(() => response.text());
    return response.ok ? { success: true, message: 'Lead updated', processId: data?.id, data } : { success: false, error: response.status + ' ' + response.statusText, details: data };
  } catch (e) { return { success: false, error: e.message || String(e) }; }
}`

// ============================================================================
// OPPORTUNITY TOOLS
// ============================================================================

export const CREATE_OPPORTUNITY_SCHEMA = {
  type: 'object',
  properties: {
    name: { type: 'string', description: 'Opportunity name (required)' },
    ownerEmployeeId: { type: 'string', description: 'UUID of the employee who owns this opportunity (required)' },
    opportunityPipelineRef: {
      type: 'string',
      description: 'Pipeline catalog reference (SalesPipeline:v1:...) (required)'
    },
    opportunityPipelineStageRef: {
      type: 'string',
      description: 'Pipeline stage catalog reference (SalesPipelineStage:v1:...) (required)'
    },
    accountId: { type: 'string', description: 'UUID of the associated account' },
    estimatedAmount: { type: 'number', description: 'Estimated deal value' },
    currencyRef: { type: 'string', description: 'Currency catalog reference (e.g., Currency:v1:EUR)' },
    closeDate: { type: 'string', description: 'Expected close date (ISO format: YYYY-MM-DD)' },
    opportunityStatusRef: { type: 'string', description: 'Opportunity status catalog reference' },
    opportunityForecastRef: { type: 'string', description: 'Forecast category catalog reference' },
    winningChance: { type: 'string', description: 'Probability of winning (0-100)' },
    description: { type: 'string', description: 'Opportunity description' },
    notesSummary: { type: 'string', description: 'Summary notes' }
  },
  required: ['name', 'opportunityPipelineRef', 'opportunityPipelineStageRef']
}

export const CREATE_OPPORTUNITY_SOURCE = `async function handler(event, context) {
  const PROCESSES_BASE_URL = 'https://newwork-dev.newwork.com/processes';
  const accessToken = context.config?.accessToken;
  if (!accessToken) return { success: false, error: 'No access token available' };
  if (!event.name || !event.opportunityPipelineRef || !event.opportunityPipelineStageRef) return { success: false, error: 'name, opportunityPipelineRef, and opportunityPipelineStageRef are required' };

  const opportunity = {};
  const fields = ['name', 'ownerEmployeeId', 'accountId', 'estimatedAmount', 'currencyRef', 'closeDate', 'opportunityPipelineRef', 'opportunityPipelineStageRef', 'opportunityStatusRef', 'opportunityForecastRef', 'winningChance', 'description', 'notesSummary'];
  for (const f of fields) { if (event[f] !== undefined && event[f] !== null && event[f] !== '') opportunity[f] = event[f]; }

  try {
    const response = await fetch(PROCESSES_BASE_URL + '/customer-relations/saveOpportunity', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + accessToken },
      body: JSON.stringify({ changeMode: 'INSERT', opportunity })
    });
    const data = await response.json().catch(() => response.text());
    return response.ok ? { success: true, message: 'Opportunity created', processId: data?.id, data } : { success: false, error: response.status + ' ' + response.statusText, details: data };
  } catch (e) { return { success: false, error: e.message || String(e) }; }
}`

export const UPDATE_OPPORTUNITY_SCHEMA = {
  type: 'object',
  properties: {
    id: { type: 'string', description: 'UUID of the opportunity to update (required)' },
    version: { type: 'number', description: 'Current version number for optimistic locking (required)' },
    name: { type: 'string', description: 'Opportunity name' },
    ownerEmployeeId: { type: 'string', description: 'UUID of the employee who owns this opportunity' },
    accountId: { type: 'string', description: 'UUID of the associated account' },
    estimatedAmount: { type: 'number', description: 'Estimated deal value' },
    currencyRef: { type: 'string', description: 'Currency catalog reference' },
    closeDate: { type: 'string', description: 'Expected close date (ISO format: YYYY-MM-DD)' },
    opportunityPipelineRef: { type: 'string', description: 'Pipeline catalog reference' },
    opportunityPipelineStageRef: { type: 'string', description: 'Pipeline stage catalog reference' },
    opportunityStatusRef: { type: 'string', description: 'Opportunity status catalog reference' },
    opportunityForecastRef: { type: 'string', description: 'Forecast category catalog reference' },
    winningChance: { type: 'string', description: 'Probability of winning (0-100)' },
    description: { type: 'string', description: 'Opportunity description' },
    notesSummary: { type: 'string', description: 'Summary notes' }
  },
  required: ['id', 'version']
}

export const UPDATE_OPPORTUNITY_SOURCE = `async function handler(event, context) {
  const PROCESSES_BASE_URL = 'https://newwork-dev.newwork.com/processes';
  const accessToken = context.config?.accessToken;
  if (!accessToken) return { success: false, error: 'No access token available' };
  if (!event.id || event.version === undefined) return { success: false, error: 'id and version are required' };

  const opportunity = { id: event.id, version: event.version };
  const fields = ['name', 'ownerEmployeeId', 'accountId', 'estimatedAmount', 'currencyRef', 'closeDate', 'opportunityPipelineRef', 'opportunityPipelineStageRef', 'opportunityStatusRef', 'opportunityForecastRef', 'winningChance', 'description', 'notesSummary'];
  for (const f of fields) { if (event[f] !== undefined) opportunity[f] = event[f]; }

  try {
    const response = await fetch(PROCESSES_BASE_URL + '/customer-relations/saveOpportunity', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + accessToken },
      body: JSON.stringify({ changeMode: 'UPDATE', opportunity })
    });
    const data = await response.json().catch(() => response.text());
    return response.ok ? { success: true, message: 'Opportunity updated', processId: data?.id, data } : { success: false, error: response.status + ' ' + response.statusText, details: data };
  } catch (e) { return { success: false, error: e.message || String(e) }; }
}`

// ============================================================================
// CONTACT TOOLS
// ============================================================================

export const CREATE_CONTACT_SCHEMA = {
  type: 'object',
  properties: {
    firstName: { type: 'string', description: 'First name of the contact (required)' },
    lastName: { type: 'string', description: 'Last name of the contact (required)' },
    ownerEmployeeId: { type: 'string', description: 'UUID of the employee who owns this contact (required)' },
    salutationRef: { type: 'string', description: 'Salutation catalog reference (e.g., Mr., Ms.)' },
    academicTitleRef: { type: 'string', description: 'Academic title catalog reference' },
    languageRef: { type: 'string', description: 'Preferred language catalog reference' },
    birthDate: { type: 'string', description: 'Birth date (ISO format: YYYY-MM-DD)' },
    jobPosition: { type: 'string', description: 'Job title/position' },
    department: { type: 'string', description: 'Department name' },
    description: { type: 'string', description: 'Contact description' },
    notesSummary: { type: 'string', description: 'Summary notes' }
  },
  required: ['firstName', 'lastName']
}

export const CREATE_CONTACT_SOURCE = `async function handler(event, context) {
  const PROCESSES_BASE_URL = 'https://newwork-dev.newwork.com/processes';
  const accessToken = context.config?.accessToken;
  if (!accessToken) return { success: false, error: 'No access token available' };
  if (!event.firstName || !event.lastName) return { success: false, error: 'firstName and lastName are required' };

  const contact = {};
  const fields = ['firstName', 'lastName', 'ownerEmployeeId', 'salutationRef', 'academicTitleRef', 'languageRef', 'birthDate', 'jobPosition', 'department', 'description', 'notesSummary'];
  for (const f of fields) { if (event[f] !== undefined && event[f] !== null && event[f] !== '') contact[f] = event[f]; }

  try {
    const response = await fetch(PROCESSES_BASE_URL + '/customer-relations/saveContact', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + accessToken },
      body: JSON.stringify({ changeMode: 'INSERT', contact })
    });
    const data = await response.json().catch(() => response.text());
    return response.ok ? { success: true, message: 'Contact created', processId: data?.id, data } : { success: false, error: response.status + ' ' + response.statusText, details: data };
  } catch (e) { return { success: false, error: e.message || String(e) }; }
}`

export const UPDATE_CONTACT_SCHEMA = {
  type: 'object',
  properties: {
    id: { type: 'string', description: 'UUID of the contact to update (required)' },
    version: { type: 'number', description: 'Current version number for optimistic locking (required)' },
    firstName: { type: 'string', description: 'First name of the contact' },
    lastName: { type: 'string', description: 'Last name of the contact' },
    ownerEmployeeId: { type: 'string', description: 'UUID of the employee who owns this contact' },
    salutationRef: { type: 'string', description: 'Salutation catalog reference' },
    academicTitleRef: { type: 'string', description: 'Academic title catalog reference' },
    languageRef: { type: 'string', description: 'Preferred language catalog reference' },
    birthDate: { type: 'string', description: 'Birth date (ISO format: YYYY-MM-DD)' },
    jobPosition: { type: 'string', description: 'Job title/position' },
    department: { type: 'string', description: 'Department name' },
    description: { type: 'string', description: 'Contact description' },
    notesSummary: { type: 'string', description: 'Summary notes' }
  },
  required: ['id', 'version']
}

export const UPDATE_CONTACT_SOURCE = `async function handler(event, context) {
  const PROCESSES_BASE_URL = 'https://newwork-dev.newwork.com/processes';
  const accessToken = context.config?.accessToken;
  if (!accessToken) return { success: false, error: 'No access token available' };
  if (!event.id || event.version === undefined) return { success: false, error: 'id and version are required' };

  const contact = { id: event.id, version: event.version };
  const fields = ['firstName', 'lastName', 'ownerEmployeeId', 'salutationRef', 'academicTitleRef', 'languageRef', 'birthDate', 'jobPosition', 'department', 'description', 'notesSummary'];
  for (const f of fields) { if (event[f] !== undefined) contact[f] = event[f]; }

  try {
    const response = await fetch(PROCESSES_BASE_URL + '/customer-relations/saveContact', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + accessToken },
      body: JSON.stringify({ changeMode: 'UPDATE', contact })
    });
    const data = await response.json().catch(() => response.text());
    return response.ok ? { success: true, message: 'Contact updated', processId: data?.id, data } : { success: false, error: response.status + ' ' + response.statusText, details: data };
  } catch (e) { return { success: false, error: e.message || String(e) }; }
}`

// ============================================================================
// ACCOUNT TOOLS
// ============================================================================

export const CREATE_ACCOUNT_SCHEMA = {
  type: 'object',
  properties: {
    name: { type: 'string', description: 'Account/company name (required)' },
    ownerEmployeeId: { type: 'string', description: 'UUID of the employee who owns this account (required)' },
    legalFormRef: { type: 'string', description: 'Legal form catalog reference (e.g., GmbH, AG)' },
    industryClassRef: { type: 'string', description: 'Industry classification catalog reference' },
    accountPriorityRef: { type: 'string', description: 'Account priority catalog reference' },
    website: { type: 'string', description: 'Company website URL' },
    description: { type: 'string', description: 'Account description' },
    companySizeRef: { type: 'string', description: 'Company size catalog reference' },
    accountAnnualRevenueBandRef: { type: 'string', description: 'Annual revenue band catalog reference' },
    foundationDate: { type: 'string', description: 'Company foundation date (ISO format: YYYY-MM-DD)' },
    notesSummary: { type: 'string', description: 'Summary notes' }
  },
  required: ['name']
}

export const CREATE_ACCOUNT_SOURCE = `async function handler(event, context) {
  const PROCESSES_BASE_URL = 'https://newwork-dev.newwork.com/processes';
  const accessToken = context.config?.accessToken;
  if (!accessToken) return { success: false, error: 'No access token available' };
  if (!event.name) return { success: false, error: 'name is required' };

  const account = {};
  const fields = ['name', 'ownerEmployeeId', 'legalFormRef', 'industryClassRef', 'accountPriorityRef', 'website', 'description', 'companySizeRef', 'accountAnnualRevenueBandRef', 'foundationDate', 'notesSummary'];
  for (const f of fields) { if (event[f] !== undefined && event[f] !== null && event[f] !== '') account[f] = event[f]; }

  try {
    const response = await fetch(PROCESSES_BASE_URL + '/customer-relations/saveAccount', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + accessToken },
      body: JSON.stringify({ changeMode: 'INSERT', account })
    });
    const data = await response.json().catch(() => response.text());
    return response.ok ? { success: true, message: 'Account created', processId: data?.id, data } : { success: false, error: response.status + ' ' + response.statusText, details: data };
  } catch (e) { return { success: false, error: e.message || String(e) }; }
}`

export const UPDATE_ACCOUNT_SCHEMA = {
  type: 'object',
  properties: {
    id: { type: 'string', description: 'UUID of the account to update (required)' },
    version: { type: 'number', description: 'Current version number for optimistic locking (required)' },
    name: { type: 'string', description: 'Account/company name' },
    ownerEmployeeId: { type: 'string', description: 'UUID of the employee who owns this account' },
    legalFormRef: { type: 'string', description: 'Legal form catalog reference' },
    industryClassRef: { type: 'string', description: 'Industry classification catalog reference' },
    accountPriorityRef: { type: 'string', description: 'Account priority catalog reference' },
    website: { type: 'string', description: 'Company website URL' },
    description: { type: 'string', description: 'Account description' },
    companySizeRef: { type: 'string', description: 'Company size catalog reference' },
    accountAnnualRevenueBandRef: { type: 'string', description: 'Annual revenue band catalog reference' },
    foundationDate: { type: 'string', description: 'Company foundation date (ISO format: YYYY-MM-DD)' },
    notesSummary: { type: 'string', description: 'Summary notes' }
  },
  required: ['id', 'version']
}

export const UPDATE_ACCOUNT_SOURCE = `async function handler(event, context) {
  const PROCESSES_BASE_URL = 'https://newwork-dev.newwork.com/processes';
  const accessToken = context.config?.accessToken;
  if (!accessToken) return { success: false, error: 'No access token available' };
  if (!event.id || event.version === undefined) return { success: false, error: 'id and version are required' };

  const account = { id: event.id, version: event.version };
  const fields = ['name', 'ownerEmployeeId', 'legalFormRef', 'industryClassRef', 'accountPriorityRef', 'website', 'description', 'companySizeRef', 'accountAnnualRevenueBandRef', 'foundationDate', 'notesSummary'];
  for (const f of fields) { if (event[f] !== undefined) account[f] = event[f]; }

  try {
    const response = await fetch(PROCESSES_BASE_URL + '/customer-relations/saveAccount', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + accessToken },
      body: JSON.stringify({ changeMode: 'UPDATE', account })
    });
    const data = await response.json().catch(() => response.text());
    return response.ok ? { success: true, message: 'Account updated', processId: data?.id, data } : { success: false, error: response.status + ' ' + response.statusText, details: data };
  } catch (e) { return { success: false, error: e.message || String(e) }; }
}`

// ============================================================================
// TOOL REGISTRY
// ============================================================================

export interface InternalToolDefinition {
  id: string
  name: string
  description: string
  category: string
  operation: 'create' | 'update' | 'read'
  schema: Record<string, unknown>
  /** Optional JSON-schema describing the tool's return shape (e.g. getCustomer360). */
  outputSchema?: Record<string, unknown>
  /** Optional ids of other provider tools this tool expects to be reachable. */
  relatedToolIds?: string[]
  source: string
}

export const INTERNAL_TOOLS: InternalToolDefinition[] = [
  // Customer 360 aggregation (read) — exposes the normalized snapshot to the agent
  GET_CUSTOMER_360_TOOL,
  // Customer 360 portfolio (read) — ranked book-of-business for the Home product
  GET_CUSTOMER_PORTFOLIO_TOOL,
  // Lead tools
  {
    id: 'create_lead',
    name: 'Create Lead',
    description: 'Creates a new lead with contact and company information',
    category: 'lead',
    operation: 'create',
    schema: CREATE_LEAD_SCHEMA,
    source: CREATE_LEAD_SOURCE
  },
  {
    id: 'update_lead',
    name: 'Update Lead',
    description: 'Updates an existing lead. Requires id and version.',
    category: 'lead',
    operation: 'update',
    schema: UPDATE_LEAD_SCHEMA,
    source: UPDATE_LEAD_SOURCE
  },
  // Opportunity tools
  {
    id: 'create_opportunity',
    name: 'Create Opportunity',
    description: 'Creates a new sales opportunity with pipeline and value information',
    category: 'opportunity',
    operation: 'create',
    schema: CREATE_OPPORTUNITY_SCHEMA,
    source: CREATE_OPPORTUNITY_SOURCE
  },
  {
    id: 'update_opportunity',
    name: 'Update Opportunity',
    description: 'Updates an existing opportunity. Requires id and version.',
    category: 'opportunity',
    operation: 'update',
    schema: UPDATE_OPPORTUNITY_SCHEMA,
    source: UPDATE_OPPORTUNITY_SOURCE
  },
  // Contact tools
  {
    id: 'create_contact',
    name: 'Create Contact',
    description: 'Creates a new contact',
    category: 'contact',
    operation: 'create',
    schema: CREATE_CONTACT_SCHEMA,
    source: CREATE_CONTACT_SOURCE
  },
  {
    id: 'update_contact',
    name: 'Update Contact',
    description: 'Updates an existing contact. Requires id and version.',
    category: 'contact',
    operation: 'update',
    schema: UPDATE_CONTACT_SCHEMA,
    source: UPDATE_CONTACT_SOURCE
  },
  // Account tools
  {
    id: 'create_account',
    name: 'Create Account',
    description: 'Creates a new account/company',
    category: 'account',
    operation: 'create',
    schema: CREATE_ACCOUNT_SCHEMA,
    source: CREATE_ACCOUNT_SOURCE
  },
  {
    id: 'update_account',
    name: 'Update Account',
    description: 'Updates an existing account. Requires id and version.',
    category: 'account',
    operation: 'update',
    schema: UPDATE_ACCOUNT_SCHEMA,
    source: UPDATE_ACCOUNT_SOURCE
  }
]

export default INTERNAL_TOOLS
