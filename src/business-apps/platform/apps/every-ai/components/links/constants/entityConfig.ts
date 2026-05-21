import React from 'react'

// ============================================================================
// Icon Helpers
// ============================================================================

const createEmojiIcon = (emoji: string) => () => React.createElement('span', null, emoji)

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

const DEFAULT_ICON = createEmojiIcon('🔗')

// ============================================================================
// URL Constants
// ============================================================================

const ORG_DATA_URL = '/platform/mdm/operation-data'
const MDM_PIPELINE_URL = '/platform/mdm/pipeline-data'
const FIN_BACKOFFICE_URL = '/platform/fin/expenses/backoffice-expenses'
const FIN_PERSONAL_URL = '/platform/fin/expenses/personal-expenses'
const HR_MANAGER_ABSENCES_URL = '/platform/hr/absences/manager-absences'
const HR_SKILL_MANAGEMENT_URL = '/platform/hr/core/apps/skill-management'
const SERVICE_DESK_URL = '/platform/sales-demo/service-desk'
const FLOW_LAUNCHER_URL = '/platform/apps/flow/apps/launcher'

const orgDataUrl = (tab: string) => `${ORG_DATA_URL}?tab=${tab}&entityId={id}`

// ============================================================================
// Entity Configuration Type
// ============================================================================

export interface EntityChipConfig {
  /** URL template with {id} placeholder for the entity ID */
  urlTemplate: string
  /** Icon component factory */
  icon: () => React.ReactNode
  /** Styling variant for the chip */
  variant?: 'default' | 'ai' | 'success' | 'info'
  /** Whether to show border styling */
  showBorder?: boolean
}

// ============================================================================
// Entity Configuration Map
// ============================================================================

/**
 * Configuration for entities and chips including URL templates, icons, and styling.
 * Maps entity protocol names to their display configuration.
 */
export const ENTITY_CONFIG: Record<string, EntityChipConfig> = {
  // -------------------------------------------------------------------------
  // Employee entities
  // -------------------------------------------------------------------------
  employee_asset: {
    urlTemplate: '/platform/employee-record?tab=assets&employeeId={id}',
    icon: createEmojiIcon('💻'),
    variant: 'info'
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

  // -------------------------------------------------------------------------
  // CRM entities
  // -------------------------------------------------------------------------
  account: {
    urlTemplate: '/platform/crm/account-record?accountId={id}',
    icon: createEmojiIcon('🏢')
  },
  company: {
    urlTemplate: '/platform/crm/account-record?accountId={id}',
    icon: createEmojiIcon('🏢')
  },
  lead: {
    urlTemplate: '/platform/crm/lead-record?leadId={id}',
    icon: createEmojiIcon('⚡')
  },
  contact: {
    urlTemplate: '/platform/crm/contact-record?contactId={id}',
    icon: createEmojiIcon('👥')
  },
  opportunity: {
    urlTemplate: '/platform/crm/opportunity-record?opportunityId={id}',
    icon: createEmojiIcon('💰')
  },
  business_partner_person: {
    urlTemplate: '/platform/crm/contact-record?contactId={id}',
    icon: createEmojiIcon('👥')
  },
  customer_account: {
    urlTemplate: '/platform/crm/account-record?accountId={id}',
    icon: createEmojiIcon('🏢')
  },
  customer_contact: {
    urlTemplate: '/platform/crm/contact-record?contactId={id}',
    icon: createEmojiIcon('👥')
  },
  customer_rejection_reason: {
    urlTemplate: '/platform/crm/opportunity-record?opportunityId={id}',
    icon: createEmojiIcon('💰')
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

  // -------------------------------------------------------------------------
  // Sales entities
  // -------------------------------------------------------------------------
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

  // -------------------------------------------------------------------------
  // Content entities
  // -------------------------------------------------------------------------
  intranet: {
    urlTemplate: '/platform/content/intranet/content-record?contentId={id}',
    icon: createSvgIcon(
      'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z'
    )
  },
  content_entry: {
    urlTemplate: '/platform/content/intranet/content-record?contentId={id}',
    icon: createSvgIcon(
      'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z'
    )
  },
  content_document: {
    urlTemplate: '/platform/content/intranet/content-record?contentId={id}',
    icon: createSvgIcon(
      'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z'
    )
  },
  article: {
    urlTemplate: '/platform/content/intranet/content-record?contentId={id}',
    icon: createEmojiIcon('📰')
  },

  // -------------------------------------------------------------------------
  // Investment entities
  // -------------------------------------------------------------------------
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
    icon: createEmojiIcon('👥')
  },

  // -------------------------------------------------------------------------
  // Service entities
  // -------------------------------------------------------------------------
  service_ticket: {
    urlTemplate: `${SERVICE_DESK_URL}?taskId={id}`,
    icon: createSvgIcon(
      'M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4v-3a2 2 0 00-2-2H5z'
    )
  },
  service_workflow: {
    urlTemplate: `${FLOW_LAUNCHER_URL}?tab=my-launches&flowId={id}`,
    icon: DEFAULT_ICON
  },
  workflow_template: {
    urlTemplate: `${SERVICE_DESK_URL}?view=workflows&workflowId={id}`,
    icon: DEFAULT_ICON
  },

  // -------------------------------------------------------------------------
  // Expense entities
  // -------------------------------------------------------------------------
  expense_request: {
    urlTemplate: '/platform/fin/expenses/expense-request-record?expenseRequestId={id}',
    icon: createSvgIcon(
      'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z'
    )
  },
  expense_item: {
    urlTemplate: `${FIN_PERSONAL_URL}?tab=expense-items`,
    icon: createSvgIcon(
      'M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z'
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
  my_expenses_report_view: {
    urlTemplate: `${FIN_PERSONAL_URL}?view=reports&reportId={id}`,
    icon: DEFAULT_ICON
  },

  // -------------------------------------------------------------------------
  // Organization entities
  // -------------------------------------------------------------------------
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
    urlTemplate: HR_SKILL_MANAGEMENT_URL,
    icon: DEFAULT_ICON
  },
  capability_group: {
    urlTemplate: HR_SKILL_MANAGEMENT_URL,
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
    urlTemplate: HR_SKILL_MANAGEMENT_URL,
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
    urlTemplate: '/platform/assets?assetId={id}',
    icon: DEFAULT_ICON
  },

  // -------------------------------------------------------------------------
  // Job entities
  // -------------------------------------------------------------------------
  job_application: {
    urlTemplate: '/platform/employee-record?tab=employment&employeeId={id}',
    icon: DEFAULT_ICON
  },
  job_candidate: {
    urlTemplate: '/platform/employee-record?tab=employment&employeeId={id}',
    icon: DEFAULT_ICON
  },
  job_function: {
    urlTemplate: '/platform/employee-record?tab=employment&employeeId={id}',
    icon: DEFAULT_ICON
  },
  job_level: {
    urlTemplate: '/platform/employee-record?tab=employment&employeeId={id}',
    icon: DEFAULT_ICON
  },
  job_position: {
    urlTemplate: '/platform/employee-record?tab=employment&employeeId={id}',
    icon: DEFAULT_ICON
  },
  job_posting: {
    urlTemplate: '/platform/employee-record?tab=employment&employeeId={id}',
    icon: DEFAULT_ICON
  },
  job_posting_position: {
    urlTemplate: '/platform/employee-record?tab=employment&employeeId={id}',
    icon: DEFAULT_ICON
  },
  job_profile: {
    urlTemplate: '/platform/employee-record?tab=employment&employeeId={id}',
    icon: DEFAULT_ICON
  },
  job_request: {
    urlTemplate: '/platform/employee-record?tab=employment&employeeId={id}',
    icon: DEFAULT_ICON
  },
  job_interview: {
    urlTemplate: '/platform/employee-record?tab=employment&employeeId={id}',
    icon: DEFAULT_ICON
  },

  // -------------------------------------------------------------------------
  // Workforce entities
  // -------------------------------------------------------------------------
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

  // -------------------------------------------------------------------------
  // Calendar entities
  // -------------------------------------------------------------------------
  meetings: {
    urlTemplate: '/platform/chat?view=calendar&meetingId={id}',
    icon: createSvgIcon('M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z')
  },

  // -------------------------------------------------------------------------
  // Reminder entities (deep-link into EveryBox inbox at the exact task)
  // -------------------------------------------------------------------------
  reminder: {
    urlTemplate: '/platform/task-manager?view=inbox&taskId={id}',
    icon: createEmojiIcon('⏰')
  },

  // -------------------------------------------------------------------------
  // Notes and documents
  // -------------------------------------------------------------------------
  note: {
    urlTemplate: '/platform/every-office/notes?noteId={id}&view=editor',
    icon: DEFAULT_ICON
  },
  document: {
    urlTemplate: '/platform/every-office/documents?docId={id}&view=editor',
    icon: DEFAULT_ICON
  },

  // -------------------------------------------------------------------------
  // Slides/Presentations
  // -------------------------------------------------------------------------
  slide: {
    urlTemplate: '/platform/every-office/slides?slideId={id}&view=editor',
    icon: DEFAULT_ICON
  },

  // -------------------------------------------------------------------------
  // Spreadsheets
  // -------------------------------------------------------------------------
  spreadsheet: {
    urlTemplate: '/platform/every-office/spreadsheets?appId={id}&view=viewer',
    icon: DEFAULT_ICON
  },

  // -------------------------------------------------------------------------
  // Chat entities
  // -------------------------------------------------------------------------
  chat_conversation: {
    urlTemplate: '/platform/chat?conversationId={id}&view=chat',
    icon: createSvgIcon(
      'M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z'
    ),
    variant: 'info'
  }
}
