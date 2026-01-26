/**
 * Pre-built Automation Templates
 *
 * Ready-to-use templates for common spreadsheet automation patterns.
 * These templates can be imported and customized for specific use cases.
 */

import type { AutomationTemplate, SpreadsheetAutomation } from '../types/automation'

/**
 * Purchase Order Approval Template
 *
 * Multi-level approval workflow for purchase orders based on amount thresholds.
 */
export const purchaseOrderApprovalTemplate: AutomationTemplate = {
  id: 'template-purchase-order-approval',
  name: 'Purchase Order Approval',
  description:
    'Route purchase orders through approval workflow based on amount. Includes automatic status updates and audit trail.',
  category: 'approval',
  icon: 'clipboard-check',
  automationConfig: {
    name: 'Purchase Order Approval',
    description: 'Automated approval workflow for purchase orders',
    type: 'row_workflow',
    trigger: 'manual',
    isEnabled: true,
    workflowConfig: {
      columnMappings: [
        { columnId: 'amount', columnName: 'Amount', workflowParameter: 'formData.amount', direction: 'toWorkflow' },
        { columnId: 'vendor', columnName: 'Vendor', workflowParameter: 'formData.vendor', direction: 'toWorkflow' },
        {
          columnId: 'description',
          columnName: 'Description',
          workflowParameter: 'formData.description',
          direction: 'toWorkflow'
        }
      ],
      resultMappings: [
        { workflowOutputPath: 'step_0.formData.decision', targetColumnId: 'status', aggregation: 'latest' },
        { workflowOutputPath: 'step_0.formData.comments', targetColumnId: 'approverComments', aggregation: 'latest' }
      ],
      statusColumn: 'workflowStatus',
      dynamicTemplate: {
        type: 'TEMPLATE',
        name: 'Purchase Order Approval',
        version: 1,
        steps: [
          {
            type: 'APPROVAL',
            title: 'Review Purchase Order',
            message: 'Please review and approve or reject this purchase order.',
            form: [
              {
                type: 'TEXT',
                name: 'vendor',
                label: 'Vendor',
                required: false,
                readOnly: true,
                valueExpression: '{{vendor}}'
              },
              {
                type: 'NUMBER',
                name: 'amount',
                label: 'Amount',
                required: false,
                readOnly: true,
                valueExpression: '{{amount}}'
              },
              {
                type: 'TEXTAREA',
                name: 'description',
                label: 'Description',
                required: false,
                readOnly: true,
                valueExpression: '{{description}}'
              },
              {
                type: 'TEXTAREA',
                name: 'comments',
                label: 'Approver Comments',
                required: false,
                placeholder: 'Add any comments about your decision...'
              }
            ],
            assignment: {
              targets: { capabilities: ['purchase_approver'] },
              assignmentMode: 'ASSIGN',
              allowReassignment: true
            },
            dueInMinutes: 4320 // 3 days
          }
        ]
      }
    },
    triggerConfig: {}
  },
  requiredColumns: ['amount', 'vendor', 'description'],
  useCases: ['Purchase requests', 'Vendor payments', 'Budget approvals'],
  isFeatured: true
}

/**
 * Expense Report Approval Template
 */
export const expenseReportApprovalTemplate: AutomationTemplate = {
  id: 'template-expense-report-approval',
  name: 'Expense Report Approval',
  description:
    'Line-item approval for expense reports. Reviewers can approve or reject individual expense items with comments.',
  category: 'finance',
  icon: 'receipt',
  automationConfig: {
    name: 'Expense Report Approval',
    description: 'Review and approve individual expense line items',
    type: 'line_approval',
    trigger: 'manual',
    isEnabled: true,
    workflowConfig: {
      columnMappings: [
        { columnId: 'amount', columnName: 'Amount', workflowParameter: 'formData.amount', direction: 'toWorkflow' },
        { columnId: 'category', columnName: 'Category', workflowParameter: 'formData.category', direction: 'toWorkflow' },
        { columnId: 'date', columnName: 'Date', workflowParameter: 'formData.expenseDate', direction: 'toWorkflow' },
        { columnId: 'receipt', columnName: 'Receipt', workflowParameter: 'formData.receipt', direction: 'toWorkflow' }
      ],
      resultMappings: [
        { workflowOutputPath: 'step_0.formData.decision', targetColumnId: 'approvalStatus', aggregation: 'latest' }
      ],
      statusColumn: 'workflowStatus'
    },
    triggerConfig: {},
    approvalConfig: {
      mode: 'line_item',
      approvalSteps: [
        {
          title: 'Manager Review',
          message: 'Review expense items and approve or reject each one.',
          approvers: {
            targets: { capabilities: ['expense_approver'] },
            assignmentMode: 'ASSIGN'
          },
          canEdit: false,
          canRejectRows: true,
          dueInMinutes: 2880 // 2 days
        }
      ],
      onApprove: 'notify',
      onReject: 'return_to_submitter'
    }
  },
  requiredColumns: ['amount', 'category', 'date'],
  useCases: ['Travel expenses', 'Business expenses', 'Reimbursements'],
  isFeatured: true
}

/**
 * Employee Survey Template
 */
export const employeeSurveyTemplate: AutomationTemplate = {
  id: 'template-employee-survey',
  name: 'Employee Survey',
  description:
    'Collect feedback from employees with optional anonymization. Results are automatically aggregated into the spreadsheet.',
  category: 'hr',
  icon: 'users',
  automationConfig: {
    name: 'Employee Survey',
    description: 'Collect survey responses from employees',
    type: 'bulk_collection',
    trigger: 'manual',
    isEnabled: true,
    workflowConfig: {
      columnMappings: [],
      resultMappings: [
        { workflowOutputPath: 'step_0.formData.rating', targetColumnId: 'rating', aggregation: 'latest' },
        { workflowOutputPath: 'step_0.formData.feedback', targetColumnId: 'feedback', aggregation: 'latest' },
        { workflowOutputPath: 'step_0.formData.suggestions', targetColumnId: 'suggestions', aggregation: 'latest' }
      ]
    },
    triggerConfig: {},
    collectionConfig: {
      rowIdentifier: 'assignee',
      fieldMappings: [
        { workflowOutputPath: 'step_0.formData.rating', targetColumnId: 'rating', aggregation: 'latest' },
        { workflowOutputPath: 'step_0.formData.feedback', targetColumnId: 'feedback', aggregation: 'latest' },
        { workflowOutputPath: 'step_0.formData.suggestions', targetColumnId: 'suggestions', aggregation: 'latest' }
      ],
      deduplication: 'replace',
      anonymize: true,
      dynamicTemplate: {
        type: 'TEMPLATE',
        name: 'Employee Survey',
        version: 1,
        steps: [
          {
            type: 'TASK',
            title: 'Complete Survey',
            message: 'Please take a few minutes to complete this survey. Your feedback is valuable.',
            form: [
              {
                type: 'SELECT',
                name: 'rating',
                label: 'Overall Satisfaction',
                required: true,
                options: [
                  { value: '5', label: '5 - Excellent' },
                  { value: '4', label: '4 - Good' },
                  { value: '3', label: '3 - Average' },
                  { value: '2', label: '2 - Below Average' },
                  { value: '1', label: '1 - Poor' }
                ]
              },
              {
                type: 'TEXTAREA',
                name: 'feedback',
                label: "What's working well?",
                required: false,
                placeholder: 'Share what you appreciate...'
              },
              {
                type: 'TEXTAREA',
                name: 'suggestions',
                label: 'What could be improved?',
                required: false,
                placeholder: 'Share your suggestions...'
              }
            ],
            assignment: {
              targets: null,
              assignmentMode: 'ASSIGN'
            },
            dueInMinutes: 10080 // 1 week
          }
        ]
      }
    }
  },
  useCases: ['Employee engagement', 'Pulse surveys', 'Feedback collection'],
  isFeatured: true
}

/**
 * Performance Review Collection Template
 */
export const performanceReviewTemplate: AutomationTemplate = {
  id: 'template-performance-review',
  name: 'Performance Review Collection',
  description: 'Collect performance reviews from managers for their direct reports. Includes rating scales and comments.',
  category: 'hr',
  icon: 'star',
  automationConfig: {
    name: 'Performance Review Collection',
    description: 'Collect performance reviews for team members',
    type: 'bulk_collection',
    trigger: 'manual',
    isEnabled: true,
    workflowConfig: {
      columnMappings: [],
      resultMappings: [
        { workflowOutputPath: 'step_0.formData.overallRating', targetColumnId: 'overallRating', aggregation: 'latest' },
        { workflowOutputPath: 'step_0.formData.achievements', targetColumnId: 'achievements', aggregation: 'latest' },
        { workflowOutputPath: 'step_0.formData.improvements', targetColumnId: 'areasForImprovement', aggregation: 'latest' },
        { workflowOutputPath: 'step_0.formData.goals', targetColumnId: 'nextPeriodGoals', aggregation: 'latest' }
      ]
    },
    triggerConfig: {},
    collectionConfig: {
      rowIdentifier: 'custom',
      customIdentifierField: 'employeeId',
      fieldMappings: [
        { workflowOutputPath: 'step_0.formData.overallRating', targetColumnId: 'overallRating', aggregation: 'latest' },
        { workflowOutputPath: 'step_0.formData.achievements', targetColumnId: 'achievements', aggregation: 'latest' },
        { workflowOutputPath: 'step_0.formData.improvements', targetColumnId: 'areasForImprovement', aggregation: 'latest' },
        { workflowOutputPath: 'step_0.formData.goals', targetColumnId: 'nextPeriodGoals', aggregation: 'latest' }
      ],
      deduplication: 'replace'
    }
  },
  useCases: ['Annual reviews', 'Quarterly check-ins', 'Goal setting'],
  isFeatured: false
}

/**
 * Budget Approval Template
 */
export const budgetApprovalTemplate: AutomationTemplate = {
  id: 'template-budget-approval',
  name: 'Budget Line Approval',
  description:
    'Submit budget sheets for multi-level approval. Each line item can be individually approved or adjusted.',
  category: 'finance',
  icon: 'dollar-sign',
  automationConfig: {
    name: 'Budget Line Approval',
    description: 'Multi-level approval for budget line items',
    type: 'sheet_approval',
    trigger: 'manual',
    isEnabled: true,
    workflowConfig: {
      columnMappings: [],
      statusColumn: 'approvalStatus'
    },
    triggerConfig: {},
    approvalConfig: {
      mode: 'full_sheet',
      approvalSteps: [
        {
          title: 'Department Manager Review',
          message: 'Review the budget allocations for your department.',
          approvers: {
            targets: { capabilities: ['department_manager'] },
            assignmentMode: 'ASSIGN'
          },
          canEdit: true,
          canRejectRows: false,
          dueInMinutes: 4320
        },
        {
          title: 'Finance Review',
          message: 'Review and approve the department budget.',
          approvers: {
            targets: { capabilities: ['finance_approver'] },
            assignmentMode: 'ASSIGN'
          },
          canEdit: false,
          canRejectRows: false,
          dueInMinutes: 2880
        },
        {
          title: 'Executive Approval',
          message: 'Final approval for budget allocation.',
          approvers: {
            targets: { capabilities: ['executive'] },
            assignmentMode: 'ASSIGN'
          },
          canEdit: false,
          canRejectRows: false,
          dueInMinutes: 1440
        }
      ],
      onApprove: 'notify',
      onReject: 'return_to_submitter'
    }
  },
  useCases: ['Annual budgets', 'Project budgets', 'Department allocations'],
  isFeatured: true
}

/**
 * Invoice Processing Template
 */
export const invoiceProcessingTemplate: AutomationTemplate = {
  id: 'template-invoice-processing',
  name: 'Invoice Processing',
  description: 'Process invoices through validation, coding, and approval workflow.',
  category: 'finance',
  icon: 'file-text',
  automationConfig: {
    name: 'Invoice Processing',
    description: 'Validate and process invoices for payment',
    type: 'row_workflow',
    trigger: 'onRowAdd',
    isEnabled: true,
    workflowConfig: {
      columnMappings: [
        { columnId: 'invoiceNumber', columnName: 'Invoice #', workflowParameter: 'formData.invoiceNumber', direction: 'toWorkflow' },
        { columnId: 'vendorName', columnName: 'Vendor', workflowParameter: 'formData.vendorName', direction: 'toWorkflow' },
        { columnId: 'amount', columnName: 'Amount', workflowParameter: 'formData.amount', direction: 'toWorkflow' },
        { columnId: 'dueDate', columnName: 'Due Date', workflowParameter: 'formData.dueDate', direction: 'toWorkflow' }
      ],
      resultMappings: [
        { workflowOutputPath: 'step_0.formData.glCode', targetColumnId: 'glCode', aggregation: 'latest' },
        { workflowOutputPath: 'step_0.formData.costCenter', targetColumnId: 'costCenter', aggregation: 'latest' },
        { workflowOutputPath: 'step_1.formData.decision', targetColumnId: 'approvalStatus', aggregation: 'latest' }
      ],
      statusColumn: 'processingStatus',
      dynamicTemplate: {
        type: 'TEMPLATE',
        name: 'Invoice Processing',
        version: 1,
        steps: [
          {
            type: 'TASK',
            title: 'Code Invoice',
            message: 'Assign GL codes and cost center for this invoice.',
            form: [
              { type: 'TEXT', name: 'invoiceNumber', label: 'Invoice #', readOnly: true, valueExpression: '{{invoiceNumber}}' },
              { type: 'TEXT', name: 'vendorName', label: 'Vendor', readOnly: true, valueExpression: '{{vendorName}}' },
              { type: 'NUMBER', name: 'amount', label: 'Amount', readOnly: true, valueExpression: '{{amount}}' },
              { type: 'TEXT', name: 'glCode', label: 'GL Code', required: true, placeholder: 'Enter GL code' },
              { type: 'TEXT', name: 'costCenter', label: 'Cost Center', required: true, placeholder: 'Enter cost center' }
            ],
            assignment: {
              targets: { capabilities: ['accounts_payable'] },
              assignmentMode: 'CLAIM'
            },
            dueInMinutes: 1440
          },
          {
            type: 'APPROVAL',
            title: 'Approve Payment',
            message: 'Review coded invoice and approve for payment.',
            form: [
              { type: 'TEXTAREA', name: 'comments', label: 'Comments', required: false }
            ],
            assignment: {
              targets: { capabilities: ['payment_approver'] },
              assignmentMode: 'ASSIGN'
            },
            dueInMinutes: 2880
          }
        ]
      }
    },
    triggerConfig: {}
  },
  requiredColumns: ['invoiceNumber', 'vendorName', 'amount', 'dueDate'],
  useCases: ['AP automation', 'Invoice approval', 'Vendor payments'],
  isFeatured: false
}

/**
 * Onboarding Checklist Template
 */
export const onboardingChecklistTemplate: AutomationTemplate = {
  id: 'template-onboarding-checklist',
  name: 'Employee Onboarding Checklist',
  description:
    'Track onboarding tasks for new hires. Each row represents a task that can be assigned and tracked.',
  category: 'hr',
  icon: 'user-plus',
  automationConfig: {
    name: 'Employee Onboarding',
    description: 'Track and manage onboarding tasks',
    type: 'row_workflow',
    trigger: 'manual',
    isEnabled: true,
    workflowConfig: {
      columnMappings: [
        { columnId: 'taskName', columnName: 'Task', workflowParameter: 'formData.taskName', direction: 'toWorkflow' },
        { columnId: 'assignee', columnName: 'Assignee', workflowParameter: 'formData.assignee', direction: 'toWorkflow' },
        { columnId: 'dueDate', columnName: 'Due Date', workflowParameter: 'formData.dueDate', direction: 'toWorkflow' }
      ],
      resultMappings: [
        { workflowOutputPath: 'step_0.formData.completionNotes', targetColumnId: 'notes', aggregation: 'latest' }
      ],
      statusColumn: 'taskStatus',
      dynamicTemplate: {
        type: 'TEMPLATE',
        name: 'Complete Onboarding Task',
        version: 1,
        steps: [
          {
            type: 'TASK',
            title: 'Complete Onboarding Task',
            message: 'Complete this onboarding task for the new employee.',
            form: [
              { type: 'TEXT', name: 'taskName', label: 'Task', readOnly: true, valueExpression: '{{taskName}}' },
              { type: 'TEXTAREA', name: 'completionNotes', label: 'Completion Notes', required: false },
              { type: 'CHECKBOX', name: 'confirmed', label: 'I confirm this task is complete', required: true }
            ],
            assignment: {
              targets: null,
              assignmentMode: 'ASSIGN'
            },
            dueInMinutes: 2880
          }
        ]
      }
    },
    triggerConfig: {}
  },
  requiredColumns: ['taskName', 'assignee', 'dueDate'],
  useCases: ['New hire onboarding', 'Offboarding', 'Role transitions'],
  isFeatured: false
}

/**
 * Content Review Template
 */
export const contentReviewTemplate: AutomationTemplate = {
  id: 'template-content-review',
  name: 'Content Review & Approval',
  description: 'Review and approve content items before publication. Supports editorial workflow.',
  category: 'operations',
  icon: 'file-edit',
  automationConfig: {
    name: 'Content Review',
    description: 'Editorial review and approval workflow',
    type: 'row_workflow',
    trigger: 'onFieldChange',
    isEnabled: true,
    workflowConfig: {
      columnMappings: [
        { columnId: 'title', columnName: 'Title', workflowParameter: 'formData.title', direction: 'toWorkflow' },
        { columnId: 'content', columnName: 'Content', workflowParameter: 'formData.content', direction: 'toWorkflow' },
        { columnId: 'author', columnName: 'Author', workflowParameter: 'formData.author', direction: 'toWorkflow' }
      ],
      resultMappings: [
        { workflowOutputPath: 'step_0.formData.decision', targetColumnId: 'reviewStatus', aggregation: 'latest' },
        { workflowOutputPath: 'step_0.formData.feedback', targetColumnId: 'reviewerFeedback', aggregation: 'latest' }
      ],
      statusColumn: 'workflowStatus'
    },
    triggerConfig: {
      watchColumns: ['status']
    }
  },
  requiredColumns: ['title', 'content', 'author', 'status'],
  useCases: ['Blog posts', 'Marketing content', 'Documentation'],
  isFeatured: false
}

/**
 * All available templates
 */
export const automationTemplates: AutomationTemplate[] = [
  purchaseOrderApprovalTemplate,
  expenseReportApprovalTemplate,
  employeeSurveyTemplate,
  performanceReviewTemplate,
  budgetApprovalTemplate,
  invoiceProcessingTemplate,
  onboardingChecklistTemplate,
  contentReviewTemplate
]

/**
 * Get templates by category
 */
export function getTemplatesByCategory(
  category: AutomationTemplate['category']
): AutomationTemplate[] {
  return automationTemplates.filter(t => t.category === category)
}

/**
 * Get featured templates
 */
export function getFeaturedTemplates(): AutomationTemplate[] {
  return automationTemplates.filter(t => t.isFeatured)
}

/**
 * Get template by ID
 */
export function getTemplateById(id: string): AutomationTemplate | undefined {
  return automationTemplates.find(t => t.id === id)
}

/**
 * Create automation from template
 */
export function createAutomationFromTemplate(
  template: AutomationTemplate,
  overrides?: Partial<Omit<SpreadsheetAutomation, 'id' | 'createdAt' | 'updatedAt' | 'runCount'>>
): Omit<SpreadsheetAutomation, 'id' | 'createdAt' | 'updatedAt' | 'runCount'> {
  return {
    ...template.automationConfig,
    ...overrides,
    name: overrides?.name || template.automationConfig.name
  }
}
