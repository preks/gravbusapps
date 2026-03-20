/**
 * Maps relation entity protocols to their parent entity protocols.
 * Used when a protocol doesn't have a direct deep link - redirects to the parent entity.
 *
 * Example: account_contact -> contact (navigates to the contact record instead)
 */
export const PROTOCOL_REDIRECTS: Record<string, string> = {
  // CRM relation entities
  account_contact: 'contact',
  lead_contact: 'contact',
  opportunity_contact: 'contact',
  opportunity_account: 'account',
  contact_opportunity: 'opportunity',
  contact_source: 'contact',
  opportunity_stage_condition_status: 'opportunity',

  // IRM relation entities
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

  // Expense relation entities
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

  // Content relation entities
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

  // Organization relation entities
  company_relationship: 'company',
  cost_center_relationship: 'cost_center',
  organizational_unit_capability: 'organizational_unit',
  organizational_unit_relationship: 'organizational_unit',
  matrix_unit_relationship: 'matrix_unit',
  catalog_entry_localized: 'catalog',
  catalog_entry: 'catalog',

  // Product relation entities
  product_category: 'product',
  product_category_assignment: 'product',
  product_classification: 'product',
  product_composition: 'product',
  product_document: 'product',
  product_inventory: 'product',
  product_movement: 'product',
  product_price: 'product',
  inventory_product_stock: 'product',

  // CRM note/document relation entities
  crm_note_feedback: 'crm_note',

  // Workforce relation entities
  nw_workforce_workforce_schedule_template: 'nw_workforce_workforce_schedule',
  nw_workforce_workforce_labor_demand_forecast: 'nw_workforce_workforce_schedule',
  nw_workforce_workforce_staffing_requirement: 'nw_workforce_workforce_schedule',

  // Job relation entities
  job_application_feedback: 'job_application',
  job_candidate_document: 'job_candidate',
  job_interview_participant: 'job_interview',
  job_posting_publication: 'job_posting',

  // Employee relation entities -> employee_record
  employee_feedback_request_reviewer: 'employee_feedback_request',
  employee_activity_log: 'employee_record',
  employee_address: 'employee_record',
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

  // Employee absence relation entities
  employee_absence_balance: 'employee_absence',
  employee_absence_entitlement: 'employee_absence',
  employee_absence_record: 'employee_absence',
  employee_attendance_correction_request: 'employee_attendance'
}
