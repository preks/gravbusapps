import React from 'react'
import EmployeeLinkChip from './EmployeeLinkChip'
import SandboxFileLinkChip from './SandboxFileLinkChip'
import { BaseEntityLinkChip } from './BaseEntityLinkChip'
import IrmDocumentLinkChip from './IrmDocumentLinkChip'

export const SUPPORTED_PROTOCOLS = [
  'employee',
  'account',
  'account_contact',
  'lead',
  'opportunity',
  'contact',
  'company',
  'intranet',
  'content_entry',
  'content_document',
  'content_entry_category',
  'content_entry_reaction',
  'content_entry_tag',
  'article',
  'article_attachment',
  'article_comment',
  'article_feedback',
  'article_like',
  'article_rate',
  'article_response',
  'article_tag',
  'investment_opportunity',
  'investment_account',
  'investment',
  'investment_lead',
  'investment_contact',
  'investment_account_contact',
  'investment_activity',
  'investment_address',
  'investment_communication_channel',
  'sales_activity',
  'sales_campaign',
  'sales_communication_channel',
  'sales_tag',
  'sales_task',
  'sales_task_template',
  'service_ticket',
  'expense_request',
  'expense_plan',
  'expense_plan_comment',
  'expense_plan_item',
  'expense_request_comment',
  'expense_request_trip',
  'expense_request_trip_time',
  'expense_item',
  'expense_item_destination',
  'expense_item_file',
  'expense_position',
  'expense_allowance',
  'expense_rule',
  'expense_rule_allowance_code',
  'expense_rule_allowance_period',
  'expense_rule_allowance_setup',
  'expense_rule_assignment',
  'expense_rule_deduction',
  'expense_rule_flag',
  'expense_rule_general_expense',
  'expense_rule_mileage',
  'expense_rule_other_calc',
  'expense_rule_other_info',
  'expense_transaction',
  'advance_payment',
  'advance_payment_comment',
  'allowance_region_rule',
  'allowance_region_rule_detail',
  'mileage_rule',
  'mileage_rule_detail',
  'rounding_rule',
  'rounding_rule_version',
  'rounding_rule_version_detail',
  'increment_type',
  'increment_type_version',
  'increment_type_version_detail',
  'day_type',
  'day_type_version',
  'day_type_version_detail',
  'break_type',
  'break_type_version',
  'break_type_version_detail',
  'travel_breakdown',
  'travel_breakdown_allowance',
  'travel_budget',
  'time_group',
  'time_type',
  'shift_type',
  'employee_absence',
  'employee_absence_balance',
  'employee_absence_entitlement',
  'employee_absence_record',
  'employee_position',
  'employee_salary',
  'employee_benefit',
  'employee_bonus',
  'employee_certificate',
  'employee_capability',
  'employee_hobby',
  'employee_note',
  'employee_feedback',
  'employee_payslip',
  'employee_time_log',
  'employee_document',
  'employee_attendance',
  'employee_attendance_correction_request',
  'employee_feedback_request',
  'employee_feedback_review',
  'employee_feedback_request_reviewer',
  'employee_activity_log',
  'employee_address',
  'employee_asset',
  'employee_availability',
  'employee_bank_account',
  'employee_change',
  'employee_communication',
  'employee_company',
  'employee_cost_center',
  'employee_education',
  'employee_job_history',
  'employee_matrix_unit',
  'employee_organizational_unit',
  'employee_other_employment',
  'employee_performance_goal',
  'employee_project_working_hours',
  'employee_relationship',
  'employee_site_location',
  'employee_skill',
  'employee_tax_detail',
  'employee_time_result',
  'employee_work_permit',
  'employee_working_condition',
  'employee_working_hours',
  'sandbox',
  'investment_document',
  'investment_report',
  'investment_report_document',
  'investment_investment_account',
  'investment_note',
  'investment_opportunity_account',
  'investment_opportunity_contact',
  'investment_opportunity_stage_condition',
  'investment_rejection_reason',
  'investment_role',
  'investment_role_report',
  'investment_shareholder',
  'investment_task',
  'investment_task_assignee',
  'investment_task_comment',
  'investment_task_template',
  'investment_transaction',
  'equity_investment',
  'equity_investment_report',
  'equity_investment_round',
  'liquid_fund_investment',
  'liquid_fund_investment_report',
  'real_estate_investment',
  'real_estate_investment_report',
  'real_estate_investment_rental_unit',
  'real_estate_investment_rental_unit_report',
  'catalog',
  'catalog_entry',
  'catalog_entry_localized',
  'comment_like',
  'feedback_like',
  'tag',
  'product',
  'product_category',
  'product_category_assignment',
  'product_classification',
  'product_composition',
  'product_document',
  'product_inventory',
  'product_movement',
  'product_price',
  'inventory_product_stock',
  'asset',
  'capability',
  'capability_group',
  'cost_center',
  'cost_center_relationship',
  'organizational_unit',
  'organizational_unit_capability',
  'organizational_unit_relationship',
  'matrix_unit',
  'matrix_unit_relationship',
  'site_location',
  'skill',
  'structure',
  'project',
  'business_partner_person',
  'company_relationship',
  'crm_address',
  'crm_document',
  'crm_note',
  'crm_note_feedback',
  'customer_account',
  'customer_contact',
  'customer_rejection_reason',
  'contact_opportunity',
  'contact_source',
  'lead_contact',
  'opportunity_account',
  'opportunity_contact',
  'opportunity_stage_condition_status',
  'job_application',
  'job_application_feedback',
  'job_candidate',
  'job_candidate_document',
  'job_function',
  'job_interview',
  'job_interview_participant',
  'job_level',
  'job_offer',
  'job_position',
  'job_posting',
  'job_posting_position',
  'job_posting_publication',
  'job_profile',
  'job_request',
  'nw_workforce_workforce_industry_config',
  'nw_workforce_workforce_labor_demand_forecast',
  'nw_workforce_workforce_open_shift_claim',
  'nw_workforce_workforce_schedule',
  'nw_workforce_workforce_schedule_template',
  'nw_workforce_workforce_scheduled_shift',
  'nw_workforce_workforce_shift_swap_request',
  'nw_workforce_workforce_staffing_requirement',
  'my_expenses_report_view',
  'selgros_expense_sheet',
  'service_workflow',
  'workflow_template',
  'meetings'
]

export function markdownUrlTransform(url: string): string {
  // If the URL is one of the supported protocols, leave it as is
  if (SUPPORTED_PROTOCOLS.some(p => url.startsWith(`${p}://`))) {
    return url
  }

  // For http/https, return as is
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url
  }

  // Default return
  return url
}

/**
 * Parse a custom protocol URL into [protocol, id, fragment].
 * Supports: `protocol://uuid` and `protocol://uuid#fragmentbase64encodedjson`
 */
function splitLink(rawUrl: string): [string, string, string | null] | null {
  if (!rawUrl) return null
  const match = rawUrl.match(/^([a-zA-Z0-9_]+):\/\/([^#]+)(#.*)?$/i)
  if (!match) return null
  const protocol = match[1].toLowerCase()
  const id = (match[2] || '').trim()
  const fragment = match[3] || null // e.g., "#eyJhY2NvdW50SWQiOiIuLi4ifQ=="
  return [protocol, id, fragment]
}

type LinkMetadata = {
  alternateId?: string
}

const decodeFragmentMetadata = (fragment: string | null): LinkMetadata | null => {
  if (!fragment) return null
  const encoded = fragment.startsWith('#') ? fragment.slice(1) : fragment
  if (!encoded) return null

  const normalized = encoded.replace(/-/g, '+').replace(/_/g, '/')
  const padded = normalized.padEnd(normalized.length + ((4 - (normalized.length % 4)) % 4), '=')

  try {
    const json = atob(padded)
    const parsed = JSON.parse(json)
    if (!parsed || typeof parsed !== 'object') return null
    return {
      alternateId: typeof parsed.alternateId === 'string' ? parsed.alternateId : undefined
    }
  } catch {
    return null
  }
}

// Helper function to create icon components
const createIcon = (type: 'emoji' | 'svg', content: string | React.ReactElement) => {
  if (type === 'emoji') {
    return React.createElement('span', null, content)
  }
  return content
}

// Helper function to create SVG icons
const createSvgIcon = (pathD: string) => () =>
  React.createElement(
    'svg',
    { className: 'gba:h-4 gba:w-4', fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24' },
    React.createElement('path', {
      strokeLinecap: 'round',
      strokeLinejoin: 'round',
      strokeWidth: 2,
      d: pathD
    })
  )

const DEFAULT_ICON = () => createIcon('emoji', '🔗')

const ORG_DATA_URL = '/platform/mdm/operation-data'
const MDM_PIPELINE_URL = '/platform/mdm/pipeline-data'
const FIN_BACKOFFICE_URL = '/platform/fin/expenses/backoffice-expenses'
const FIN_PERSONAL_URL = '/platform/fin/expenses/personal-expenses'
const HR_MANAGER_ABSENCES_URL = '/platform/hr/absences/manager-absences'
const SERVICE_DESK_URL = '/platform/sales-demo/service-desk'

const orgDataUrl = (tab: string) => `${ORG_DATA_URL}?tab=${tab}&entityId={id}`

// Configuration for static entity chips (no data fetching needed)
const ENTITY_CHIP_CONFIG: Record<
  string,
  {
    urlTemplate: string
    icon: () => React.ReactNode
    variant?: 'default' | 'ai' | 'success' | 'info'
    showBorder?: boolean
  }
> = {
  account: {
    urlTemplate: '/platform/crm/account-record?accountId={id}',
    icon: () => createIcon('emoji', '🏢')
  },
  company: {
    urlTemplate: '/platform/crm/account-record?accountId={id}',
    icon: () => createIcon('emoji', '🏢')
  },
  lead: {
    urlTemplate: '/platform/crm/lead-record?leadId={id}',
    icon: () => createIcon('emoji', '⚡')
  },
  contact: {
    urlTemplate: '/platform/crm/contact-record?contactId={id}',
    icon: () => createIcon('emoji', '👥')
  },
  opportunity: {
    urlTemplate: '/platform/crm/opportunity-record?opportunityId={id}',
    icon: () => createIcon('emoji', '💰')
  },
  intranet: {
    urlTemplate: '/platform/content/intranet/content-record?contentId={id}',
    icon: () =>
      React.createElement(
        'svg',
        { className: 'gba:h-4 gba:w-4', fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24' },
        React.createElement('path', {
          strokeLinecap: 'round',
          strokeLinejoin: 'round',
          strokeWidth: 2,
          d: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z'
        })
      )
  },
  content_entry: {
    urlTemplate: '/platform/content/intranet/content-record?contentId={id}',
    icon: () =>
      React.createElement(
        'svg',
        { className: 'gba:h-4 gba:w-4', fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24' },
        React.createElement('path', {
          strokeLinecap: 'round',
          strokeLinejoin: 'round',
          strokeWidth: 2,
          d: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z'
        })
      )
  },
  content_document: {
    urlTemplate: '/platform/content/intranet/content-record?contentId={id}',
    icon: () =>
      React.createElement(
        'svg',
        { className: 'gba:h-4 gba:w-4', fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24' },
        React.createElement('path', {
          strokeLinecap: 'round',
          strokeLinejoin: 'round',
          strokeWidth: 2,
          d: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z'
        })
      )
  },
  article: {
    urlTemplate: '/platform/content/intranet/content-record?contentId={id}',
    icon: () => createIcon('emoji', '📰')
  },
  investment_account: {
    urlTemplate: '/platform/irm/account-record?accountId={id}',
    icon: createSvgIcon(
      'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4'
    )
  },
  investment: {
    urlTemplate: '/platform/irm/investment-record?investmentId={id}',
    icon: createSvgIcon(
      'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z'
    )
  },
  investment_opportunity: {
    urlTemplate: '/platform/irm/opportunity-record?opportunityId={id}',
    icon: createSvgIcon(
      'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z'
    )
  },
  investment_report: {
    urlTemplate: '/platform/irm/investment-record?investmentId={id}&tab=reports',
    icon: createSvgIcon(
      'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z'
    )
  },
  investment_role: {
    urlTemplate: '/platform/irm/investment-record?investmentId={id}&tab=roles',
    icon: DEFAULT_ICON
  },
  investment_lead: {
    urlTemplate: '/platform/irm/lead-record?leadId={id}',
    icon: createSvgIcon('M13 10V3L4 14h7v7l9-11h-7z')
  },
  investment_contact: {
    urlTemplate: '/platform/irm/contact-record?contactId={id}',
    icon: () => createIcon('emoji', '👥')
  },
  sales_activity: {
    urlTemplate: '/platform/crm/customer-relations?view=activities&activityId={id}',
    icon: createSvgIcon('M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z')
  },
  sales_campaign: {
    urlTemplate: '/platform/crm/campaign-record?campaignId={id}',
    icon: createSvgIcon(
      'M9 20l-5.447-2.724A1 1 0 013 16.382V5a1 1 0 011.447-.894L9 6.382l5.553-2.276A1 1 0 0116 5v11.382a1 1 0 01-.553.894L9 20z'
    )
  },
  sales_communication_channel: {
    urlTemplate: '/platform/crm/customer-settings?view=communication&channelId={id}',
    icon: createSvgIcon(
      'M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498A1 1 0 0121 15.72V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z'
    )
  },
  sales_tag: {
    urlTemplate: '/platform/crm/customer-settings?view=tags&tagId={id}',
    icon: createSvgIcon(
      'M7 7h.01M3 11l4 4a1 1 0 001.414 0l9.192-9.192a1 1 0 00.293-.707V3h-2.1a1 1 0 00-.707.293L6 12.5l-3-3L3 11z'
    )
  },
  sales_task: {
    urlTemplate: '/platform/crm/customer-relations?view=tasks&taskId={id}',
    icon: createSvgIcon('M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2V9m-5-4H9z')
  },
  sales_task_template: {
    urlTemplate: '/platform/crm/customer-relations?view=taskTemplates&taskTemplateId={id}',
    icon: createSvgIcon('M4 6h16M4 10h16M4 14h10M4 18h10')
  },
  service_ticket: {
    urlTemplate: '/platform/sales-demo/service-launcher?view=myRequests&requestId={id}',
    icon: createSvgIcon(
      'M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4v-3a2 2 0 00-2-2H5z'
    )
  },
  expense_request: {
    urlTemplate: '/platform/fin/expenses/expense-request-record?expenseRequestId={id}',
    icon: createSvgIcon(
      'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z'
    )
  },
  expense_plan: {
    urlTemplate: '/platform/fin/expenses/expense-plan-record?expensePlanId={id}',
    icon: createSvgIcon(
      'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z'
    )
  },
  advance_payment: {
    urlTemplate: `${FIN_BACKOFFICE_URL}?tab=advance-payments&entityId={id}`,
    icon: DEFAULT_ICON
  },
  allowance_region_rule: {
    urlTemplate: `${FIN_BACKOFFICE_URL}?tab=allowance-rules&entityId={id}`,
    icon: DEFAULT_ICON
  },
  break_type: {
    urlTemplate: `${FIN_BACKOFFICE_URL}?tab=break-types&entityId={id}`,
    icon: DEFAULT_ICON
  },
  day_type: {
    urlTemplate: `${FIN_BACKOFFICE_URL}?tab=day-types&entityId={id}`,
    icon: DEFAULT_ICON
  },
  increment_type: {
    urlTemplate: `${FIN_BACKOFFICE_URL}?tab=increment-types&entityId={id}`,
    icon: DEFAULT_ICON
  },
  mileage_rule: {
    urlTemplate: `${FIN_BACKOFFICE_URL}?tab=mileage-rules&entityId={id}`,
    icon: DEFAULT_ICON
  },
  rounding_rule: {
    urlTemplate: `${FIN_BACKOFFICE_URL}?tab=rounding-rules&entityId={id}`,
    icon: DEFAULT_ICON
  },
  time_type: {
    urlTemplate: `${FIN_BACKOFFICE_URL}?tab=time-types&entityId={id}`,
    icon: DEFAULT_ICON
  },
  travel_breakdown: {
    urlTemplate: `${FIN_BACKOFFICE_URL}?tab=travel-breakdowns&entityId={id}`,
    icon: DEFAULT_ICON
  },
  expense_rule: {
    urlTemplate: `${FIN_BACKOFFICE_URL}?tab=expense-rules&entityId={id}`,
    icon: DEFAULT_ICON
  },
  employee_absence: {
    urlTemplate: '/platform/hr/absences/personal-absences',
    icon: createSvgIcon('M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z')
  },
  employee_position: {
    urlTemplate: '/platform/employee-record?tab=employment&employeeId={id}',
    icon: createSvgIcon(
      'M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z'
    )
  },
  employee_salary: {
    urlTemplate: '/platform/employee-record?tab=compensation&employeeId={id}',
    icon: createSvgIcon(
      'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z'
    )
  },
  employee_benefit: {
    urlTemplate: '/platform/employee-record?tab=compensation&subView=benefits&employeeId={id}',
    icon: createSvgIcon(
      'M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7'
    )
  },
  employee_bonus: {
    urlTemplate: '/platform/employee-record?tab=compensation&subView=bonuses&employeeId={id}',
    icon: createSvgIcon(
      'M12 8v13m0-13V6a2 2 0 112 2h-2zm0 0V5.5A2.5 2.5 0 109.5 8H12zm-7 4h14M5 12a2 2 0 110-4h14a2 2 0 110 4M5 12v7a2 2 0 002 2h10a2 2 0 002-2v-7'
    )
  },
  employee_certificate: {
    urlTemplate: '/platform/employee-record?tab=skills&subView=certificates&employeeId={id}',
    icon: createSvgIcon(
      'M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z'
    )
  },
  employee_capability: {
    urlTemplate: '/platform/employee-record?tab=skills&employeeId={id}',
    icon: createSvgIcon(
      'M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z'
    )
  },
  employee_hobby: {
    urlTemplate: '/platform/employee-record?tab=skills&subView=hobbies&employeeId={id}',
    icon: createSvgIcon('M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z')
  },
  employee_note: {
    urlTemplate: '/platform/employee-record?tab=hrAdmin&subView=hrNotes&employeeId={id}',
    icon: createSvgIcon(
      'M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z'
    )
  },
  employee_feedback: {
    urlTemplate: '/platform/employee-record?tab=feedback&employeeId={id}',
    icon: createSvgIcon('M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z')
  },
  employee_payslip: {
    urlTemplate: '/platform/employee-record?tab=compensation&subView=payslips&employeeId={id}',
    icon: createSvgIcon(
      'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z'
    )
  },
  employee_time_log: {
    urlTemplate: '/platform/employee-record?tab=timeTracking&employeeId={id}',
    icon: createSvgIcon('M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z')
  },
  employee_document: {
    urlTemplate: '/platform/employee-record?tab=documents&employeeId={id}',
    icon: createSvgIcon(
      'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z'
    )
  },
  employee_attendance: {
    urlTemplate: '/platform/employee-record?tab=timeTracking&employeeId={id}',
    icon: createSvgIcon('M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z')
  },
  employee_feedback_request: {
    urlTemplate: '/platform/employee-record?tab=feedback&employeeId={id}',
    icon: createSvgIcon(
      'M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z'
    )
  },
  employee_feedback_review: {
    urlTemplate: '/platform/employee-record?tab=feedback&employeeId={id}',
    icon: createSvgIcon(
      'M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z'
    )
  },
  employee_record: {
    urlTemplate: '/platform/employee-record?tab=employment&employeeId={id}',
    icon: createSvgIcon(
      'M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z'
    )
  },
  crm_note: {
    urlTemplate: '/platform/crm/customer-relations?view=notes&noteId={id}',
    icon: DEFAULT_ICON
  },
  crm_document: {
    urlTemplate: '/platform/crm/customer-relations?view=documents&documentId={id}',
    icon: DEFAULT_ICON
  },
  crm_address: {
    urlTemplate: '/platform/crm/customer-relations?view=addresses&addressId={id}',
    icon: DEFAULT_ICON
  },
  catalog: {
    urlTemplate: `${MDM_PIPELINE_URL}?entityId={id}`,
    icon: DEFAULT_ICON
  },
  catalog_entry: {
    urlTemplate: `${MDM_PIPELINE_URL}?entityId={id}`,
    icon: DEFAULT_ICON
  },
  catalog_entry_localized: {
    urlTemplate: `${MDM_PIPELINE_URL}?entityId={id}`,
    icon: DEFAULT_ICON
  },
  cost_center: {
    urlTemplate: orgDataUrl('cost-centers'),
    icon: DEFAULT_ICON
  },
  capability: {
    urlTemplate: orgDataUrl('capabilities'),
    icon: DEFAULT_ICON
  },
  capability_group: {
    urlTemplate: orgDataUrl('capabilities'),
    icon: DEFAULT_ICON
  },
  organizational_unit: {
    urlTemplate: orgDataUrl('departments'),
    icon: DEFAULT_ICON
  },
  matrix_unit: {
    urlTemplate: orgDataUrl('teams'),
    icon: DEFAULT_ICON
  },
  site_location: {
    urlTemplate: orgDataUrl('site-locations'),
    icon: DEFAULT_ICON
  },
  structure: {
    urlTemplate: orgDataUrl('departments'),
    icon: DEFAULT_ICON
  },
  skill: {
    urlTemplate: orgDataUrl('capabilities'),
    icon: DEFAULT_ICON
  },
  product: {
    urlTemplate: `${MDM_PIPELINE_URL}?entityId={id}`,
    icon: DEFAULT_ICON
  },
  project: {
    urlTemplate: `${MDM_PIPELINE_URL}?entityId={id}`,
    icon: DEFAULT_ICON
  },
  asset: {
    urlTemplate: `${ORG_DATA_URL}?tab=site-locations&entityId={id}`,
    icon: DEFAULT_ICON
  },
  business_partner_person: {
    urlTemplate: '/platform/crm/contact-record?contactId={id}',
    icon: () => createIcon('emoji', '👥')
  },
  customer_account: {
    urlTemplate: '/platform/crm/account-record?accountId={id}',
    icon: () => createIcon('emoji', '🏢')
  },
  customer_contact: {
    urlTemplate: '/platform/crm/contact-record?contactId={id}',
    icon: () => createIcon('emoji', '👥')
  },
  customer_rejection_reason: {
    urlTemplate: '/platform/crm/opportunity-record?opportunityId={id}',
    icon: () => createIcon('emoji', '💰')
  },
  job_application: {
    urlTemplate: '/platform/employee-record?tab=employment&entityId={id}',
    icon: DEFAULT_ICON
  },
  job_candidate: {
    urlTemplate: '/platform/employee-record?tab=employment&entityId={id}',
    icon: DEFAULT_ICON
  },
  job_function: {
    urlTemplate: '/platform/employee-record?tab=employment&entityId={id}',
    icon: DEFAULT_ICON
  },
  job_level: {
    urlTemplate: '/platform/employee-record?tab=employment&entityId={id}',
    icon: DEFAULT_ICON
  },
  job_position: {
    urlTemplate: '/platform/employee-record?tab=employment&entityId={id}',
    icon: DEFAULT_ICON
  },
  job_posting: {
    urlTemplate: '/platform/employee-record?tab=employment&entityId={id}',
    icon: DEFAULT_ICON
  },
  job_posting_position: {
    urlTemplate: '/platform/employee-record?tab=employment&entityId={id}',
    icon: DEFAULT_ICON
  },
  job_profile: {
    urlTemplate: '/platform/employee-record?tab=employment&entityId={id}',
    icon: DEFAULT_ICON
  },
  job_request: {
    urlTemplate: '/platform/employee-record?tab=employment&entityId={id}',
    icon: DEFAULT_ICON
  },
  nw_workforce_workforce_industry_config: {
    urlTemplate: `${HR_MANAGER_ABSENCES_URL}?entityId={id}`,
    icon: DEFAULT_ICON
  },
  nw_workforce_workforce_open_shift_claim: {
    urlTemplate: `${HR_MANAGER_ABSENCES_URL}?entityId={id}`,
    icon: DEFAULT_ICON
  },
  nw_workforce_workforce_schedule: {
    urlTemplate: `${HR_MANAGER_ABSENCES_URL}?entityId={id}`,
    icon: DEFAULT_ICON
  },
  nw_workforce_workforce_scheduled_shift: {
    urlTemplate: `${HR_MANAGER_ABSENCES_URL}?entityId={id}`,
    icon: DEFAULT_ICON
  },
  nw_workforce_workforce_shift_swap_request: {
    urlTemplate: `${HR_MANAGER_ABSENCES_URL}?entityId={id}`,
    icon: DEFAULT_ICON
  },
  my_expenses_report_view: {
    urlTemplate: `${FIN_PERSONAL_URL}?view=reports&reportId={id}`,
    icon: DEFAULT_ICON
  },
  service_workflow: {
    urlTemplate: `${SERVICE_DESK_URL}?view=workflows&workflowId={id}`,
    icon: DEFAULT_ICON
  },
  workflow_template: {
    urlTemplate: `${SERVICE_DESK_URL}?view=workflows&workflowId={id}`,
    icon: DEFAULT_ICON
  },
  job_interview: {
    urlTemplate: '/platform/employee-record?tab=employment&entityId={id}',
    icon: DEFAULT_ICON
  },
  meetings: {
    urlTemplate: '/platform/chat?view=calendar&meetingId={id}',
    icon: createSvgIcon('M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z')
  }
}

const REDIRECT_PROTOCOLS: Record<string, string> = {
  account_contact: 'contact',
  lead_contact: 'contact',
  opportunity_contact: 'contact',
  opportunity_account: 'account',
  contact_opportunity: 'opportunity',
  contact_source: 'contact',
  opportunity_stage_condition_status: 'opportunity',
  investment_account_contact: 'investment_contact',
  investment_opportunity_account: 'investment_opportunity',
  investment_opportunity_contact: 'investment_contact',
  investment_opportunity_stage_condition: 'investment_opportunity',
  investment_rejection_reason: 'investment_opportunity',
  investment_activity: 'investment',
  investment_address: 'investment',
  investment_communication_channel: 'investment',
  investment_note: 'investment',
  investment_investment_account: 'investment_account',
  investment_report_document: 'investment_report',
  investment_role_report: 'investment_role',
  investment_task_assignee: 'investment',
  investment_task_comment: 'investment',
  investment_task_template: 'investment',
  investment_task: 'investment',
  investment_transaction: 'investment',
  equity_investment: 'investment',
  equity_investment_report: 'investment',
  equity_investment_round: 'investment',
  liquid_fund_investment: 'investment',
  liquid_fund_investment_report: 'investment',
  real_estate_investment: 'investment',
  real_estate_investment_report: 'investment',
  real_estate_investment_rental_unit: 'investment',
  real_estate_investment_rental_unit_report: 'investment',
  advance_payment_comment: 'advance_payment',
  expense_plan_comment: 'expense_plan',
  expense_plan_item: 'expense_plan',
  expense_request_comment: 'expense_request',
  expense_request_trip: 'expense_request',
  expense_request_trip_time: 'expense_request',
  expense_item_destination: 'expense_request',
  expense_item_file: 'expense_request',
  expense_item: 'expense_request',
  expense_position: 'expense_request',
  expense_allowance: 'expense_request',
  expense_rule_allowance_code: 'expense_rule',
  expense_rule_allowance_period: 'expense_rule',
  expense_rule_allowance_setup: 'expense_rule',
  expense_rule_assignment: 'expense_rule',
  expense_rule_deduction: 'expense_rule',
  expense_rule_flag: 'expense_rule',
  expense_rule_general_expense: 'expense_rule',
  expense_rule_mileage: 'expense_rule',
  expense_rule_other_calc: 'expense_rule',
  expense_rule_other_info: 'expense_rule',
  expense_transaction: 'expense_request',
  travel_breakdown_allowance: 'travel_breakdown',
  selgros_expense_sheet: 'expense_plan',
  comment_like: 'content_entry',
  feedback_like: 'employee_feedback',
  tag: 'content_entry',
  article_attachment: 'article',
  article_comment: 'article',
  article_feedback: 'article',
  article_like: 'article',
  article_rate: 'article',
  article_response: 'article',
  article_tag: 'article',
  content_entry_category: 'content_entry',
  content_entry_tag: 'content_entry',
  content_entry_reaction: 'content_entry',
  company_relationship: 'company',
  cost_center_relationship: 'cost_center',
  organizational_unit_capability: 'organizational_unit',
  organizational_unit_relationship: 'organizational_unit',
  matrix_unit_relationship: 'matrix_unit',
  catalog_entry_localized: 'catalog',
  catalog_entry: 'catalog',
  product_category: 'product',
  product_category_assignment: 'product',
  product_classification: 'product',
  product_composition: 'product',
  product_document: 'product',
  product_inventory: 'product',
  product_movement: 'product',
  product_price: 'product',
  inventory_product_stock: 'product',
  crm_note_feedback: 'crm_note',
  nw_workforce_workforce_schedule_template: 'nw_workforce_workforce_schedule',
  nw_workforce_workforce_labor_demand_forecast: 'nw_workforce_workforce_schedule',
  nw_workforce_workforce_staffing_requirement: 'nw_workforce_workforce_schedule',
  job_application_feedback: 'job_application',
  job_candidate_document: 'job_candidate',
  job_interview_participant: 'job_interview',
  job_posting_publication: 'job_posting',
  employee_feedback_request_reviewer: 'employee_feedback_request',
  employee_activity_log: 'employee_record',
  employee_address: 'employee_record',
  employee_asset: 'employee_record',
  employee_availability: 'employee_record',
  employee_bank_account: 'employee_record',
  employee_change: 'employee_record',
  employee_communication: 'employee_record',
  employee_company: 'employee_record',
  employee_cost_center: 'employee_record',
  employee_education: 'employee_record',
  employee_job_history: 'employee_record',
  employee_matrix_unit: 'employee_record',
  employee_organizational_unit: 'employee_record',
  employee_other_employment: 'employee_record',
  employee_performance_goal: 'employee_record',
  employee_project_working_hours: 'employee_record',
  employee_relationship: 'employee_record',
  employee_site_location: 'employee_record',
  employee_skill: 'employee_record',
  employee_tax_detail: 'employee_record',
  employee_time_result: 'employee_record',
  employee_work_permit: 'employee_record',
  employee_working_condition: 'employee_record',
  employee_working_hours: 'employee_record',
  employee_absence_balance: 'employee_absence',
  employee_absence_entitlement: 'employee_absence',
  employee_absence_record: 'employee_absence',
  employee_attendance_correction_request: 'employee_attendance'
}

/**
 * Build a platform URL for an entity using the same base mapping as the chips.
 * Returns undefined if the entity is unknown.
 */
export function getEntityUrl(entity: string, id: string): string | undefined {
  const config = ENTITY_CHIP_CONFIG[entity]
  if (!config) return undefined
  return config.urlTemplate.replace('{id}', id)
}

interface EntityLinkProps {
  href?: string
  accessToken: string
  children: React.ReactNode
}

const EntityLink: React.FC<EntityLinkProps> = ({ href, accessToken, children }) => {
  const parsed = splitLink(href || '')
  const [protocol, entityId, fragment] = parsed || [null, null, null]
  const metadata = decodeFragmentMetadata(fragment)

  let effectiveProtocol = protocol
  // If the backend provided an alternateId, prefer it as the effective id.
  // This is neededfor REDIRECT_PROTOCOLS (relation entities),
  const effectiveId = metadata?.alternateId || entityId

  // If the protocol is in the REDIRECT_PROTOCOLS, use the redirect protocol and id
  if (protocol && protocol in REDIRECT_PROTOCOLS) {
    effectiveProtocol = REDIRECT_PROTOCOLS[protocol]
  }

  // Employee protocol: needs data fetching, use special component
  if (effectiveProtocol === 'employee' && effectiveId) {
    return (
      <EmployeeLinkChip employeeId={effectiveId} token={accessToken}>
        {children}
      </EmployeeLinkChip>
    )
  }

  // Sandbox file protocol: special download button
  if (effectiveProtocol === 'sandbox' && effectiveId) {
    return (
      <SandboxFileLinkChip filePath={effectiveId} token={accessToken}>
        {children}
      </SandboxFileLinkChip>
    )
  }

  // IRM investment document: resolve to actual file download URL and show it to the user
  if (effectiveProtocol === 'investment_document' && effectiveId) {
    return (
      <IrmDocumentLinkChip documentId={effectiveId} token={accessToken} fallbackHref={href}>
        {children}
      </IrmDocumentLinkChip>
    )
  }

  // All other protocols: use configuration-based approach
  if (effectiveProtocol && effectiveId) {
    const config = ENTITY_CHIP_CONFIG[effectiveProtocol]
    if (config) {
      const chipUrl = config.urlTemplate.replace('{id}', effectiveId)
      return (
        <BaseEntityLinkChip url={chipUrl} icon={config.icon()} variant={config.variant} showBorder={config.showBorder}>
          {children}
        </BaseEntityLinkChip>
      )
    }
  }

  // Regular links
  if (href && (href.startsWith('http://') || href.startsWith('https://'))) {
    return (
      <a
        href={href}
        className="gba:text-primary gba:underline hover:gba:opacity-80"
        target="_blank"
        rel="noopener noreferrer"
      >
        {children}
      </a>
    )
  }

  return <span>{children}</span>
}

export default EntityLink
