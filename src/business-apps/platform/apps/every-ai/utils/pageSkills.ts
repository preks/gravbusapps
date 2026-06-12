/**
 * Maps page-context entity names to default skill sets that activate the
 * Skill Agent fast path.  This mapping mirrors the canonical
 * PAGE_CONTEXT_SKILL_MAP in the Flowbot backend (src/api/tools/skills.py).
 */
import type { CurrentPageContext } from '../types/models'

const PAGE_CONTEXT_SKILL_MAP: Record<string, string[]> = {
  // CRM entity / overview pages
  opportunity: ['Data', 'CrmFunnel', 'Actions', 'Search'],
  lead: ['Data', 'Search', 'AccountEnrichment', 'Actions'],
  contact: ['Data', 'Search', 'Actions'],
  company: ['Data', 'Search', 'AccountEnrichment', 'Actions'],
  account: ['Data', 'Search', 'Actions'],
  // CRM Customer 360 — full post-sales view: data, scoring/funnel, service desk, documents
  customer_360: ['Data', 'CrmFunnel', 'Services', 'Documents', 'Search', 'Actions'],
  // IRM pages
  investment: ['Data', 'Investments', 'Search', 'Actions'],
  investment_opportunity: ['Data', 'Investments', 'Search', 'Actions'],
  investment_lead: ['Data', 'Search', 'Actions'],
  investment_account: ['Data', 'Search', 'Actions'],
  investment_contact: ['Data', 'Search', 'Actions'],
  investment_company: ['Data', 'Search', 'Actions'],
  // HR / Employee
  employee: ['HR', 'Data', 'Employee', 'Search'],
  // Content / Documents
  content_entry: ['Documents', 'Search', 'External'],
  content_editor: ['Documents', 'Files'],
  document: ['Documents', 'Files', 'Search'],
  document_creator: ['Documents', 'Files'],
  note: ['Documents', 'Files'],
  slide: ['Slides', 'Documents'],
  spreadsheet: ['Spreadsheets', 'Data'],
  // Workflows
  service_workflow: ['Flows', 'WorkflowManagement', 'Services'],
  workflow_template: ['Flows', 'WorkflowManagement'],
  flow: ['Flows', 'WorkflowManagement'],
  // Service desk
  service_ticket: ['Services', 'Data', 'Search'],
  cflow_task: ['Services', 'Data'],
  // Assets
  asset: ['Assets', 'Data', 'Search'],
  // CRM documents
  crm_document: ['Documents', 'Data', 'Search']
}

/**
 * Resolve default skills for the given page context.
 * Returns an empty array when the current page has no mapped skills.
 */
export function getDefaultSkillsForPage(context: CurrentPageContext): string[] {
  if (context.type === 'entity' || context.type === 'overview') {
    return PAGE_CONTEXT_SKILL_MAP[context.entity_name] ?? []
  }
  return []
}
