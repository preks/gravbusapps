import { logger } from './logger';
import { createTemplate } from '../services/templateService';

// Backend-compatible types (no ES modules)
export type StepType = 'TASK' | 'APPROVAL' | 'INFORMATION' | 'ACKNOWLEDGE';
export type InputType = 'TEXT' | 'TEXTAREA' | 'SELECT' | 'MULTISELECT' | 'NUMBER' | 'DATE' | 'CHECKBOX' | 'FILE';

export interface InputOption {
  value: string;
  label: string;
}

export interface InputBlock {
  type: InputType;
  name: string;
  label: string;
  required?: boolean;
  options?: InputOption[];
}

export interface Link {
  name: string;
  url: string;
}

export interface Assignment {
  type: 'SPECIFIC_USERS' | 'ROLE_BASED' | 'DEPARTMENT' | 'MANAGER' | 'SELF';
  userIds?: string[];
  roleIds?: string[];
  departmentIds?: string[];
}

export interface FlowStep {
  type: StepType;
  name: string;
  description?: string;
  inputs?: InputBlock[];
  links?: Link[];
  assignment?: Assignment;
}

export interface FlowTemplate {
  id?: string;
  type: 'TEMPLATE' | 'INSTANCE' | 'DRAFT';
  name: string;
  description?: string;
  version?: number;
  steps: FlowStep[];
}

export const registerSampleFlows = async (): Promise<void> => {
  try {
    logger.info('Registering sample flows...');
    
    const sampleFlows: FlowTemplate[] = [
      {
        type: 'TEMPLATE',
        name: 'Employee Onboarding Process',
        description: 'Complete onboarding workflow for new employees',
        version: 1,
        steps: [
          {
            type: 'TASK',
            name: 'Welcome & Initial Setup',
            description: 'Welcome new employee and collect initial information',
            inputs: [
              {
                type: 'TEXT',
                name: 'employeeName',
                label: 'Employee Full Name',
                required: true
              },
              {
                type: 'TEXT',
                name: 'department',
                label: 'Department',
                required: true
              },
              {
                type: 'DATE',
                name: 'startDate',
                label: 'Start Date',
                required: true
              }
            ],
            links: [
              {
                name: 'Employee Handbook',
                url: 'https://company.com/handbook'
              },
              {
                name: 'Onboarding Checklist',
                url: 'https://company.com/onboarding-checklist'
              }
            ],
            assignment: {
              type: 'ROLE_BASED',
              roleIds: ['hr-manager']
            }
          },
          {
            type: 'TASK',
            name: 'Equipment & Workspace Setup',
            description: 'Assign equipment and prepare workspace',
            inputs: [
              {
                type: 'SELECT',
                name: 'laptopType',
                label: 'Laptop Type',
                required: true,
                options: [
                  { value: 'macbook-pro', label: 'MacBook Pro' },
                  { value: 'macbook-air', label: 'MacBook Air' },
                  { value: 'windows-laptop', label: 'Windows Laptop' }
                ]
              },
              {
                type: 'MULTISELECT',
                name: 'accessories',
                label: 'Additional Accessories',
                required: false,
                options: [
                  { value: 'external-monitor', label: 'External Monitor' },
                  { value: 'keyboard', label: 'External Keyboard' },
                  { value: 'mouse', label: 'Mouse' },
                  { value: 'headset', label: 'Headset' }
                ]
              },
              {
                type: 'TEXT',
                name: 'workspaceLocation',
                label: 'Workspace Location',
                required: true
              }
            ],
            assignment: {
              type: 'DEPARTMENT',
              departmentIds: ['it-support']
            }
          },
          {
            type: 'APPROVAL',
            name: 'IT Systems Access Approval',
            description: 'Approve access to company IT systems',
            inputs: [
              {
                type: 'MULTISELECT',
                name: 'systemAccess',
                label: 'Required System Access',
                required: true,
                options: [
                  { value: 'email', label: 'Email System' },
                  { value: 'crm', label: 'CRM System' },
                  { value: 'hr-system', label: 'HR System' },
                  { value: 'project-management', label: 'Project Management' }
                ]
              },
              {
                type: 'TEXTAREA',
                name: 'approvalNotes',
                label: 'Approval Notes',
                required: false
              }
            ],
            assignment: {
              type: 'ROLE_BASED',
              roleIds: ['it-security-manager']
            }
          },
          {
            type: 'INFORMATION',
            name: 'Training Schedule',
            description: 'Provide training schedule and next steps',
            links: [
              {
                name: 'Training Calendar',
                url: 'https://company.com/training-calendar'
              },
              {
                name: 'First Week Guide',
                url: 'https://company.com/first-week-guide'
              }
            ],
            assignment: {
              type: 'ROLE_BASED',
              roleIds: ['training-coordinator']
            }
          }
        ]
      },
      {
        type: 'TEMPLATE',
        name: 'Document Review & Approval',
        description: 'Review and approve important documents',
        version: 1,
        steps: [
          {
            type: 'TASK',
            name: 'Document Submission',
            description: 'Submit document for review',
            inputs: [
              {
                type: 'TEXT',
                name: 'documentTitle',
                label: 'Document Title',
                required: true
              },
              {
                type: 'TEXTAREA',
                name: 'documentSummary',
                label: 'Document Summary',
                required: true
              },
              {
                type: 'FILE',
                name: 'documentFile',
                label: 'Document File',
                required: true
              }
            ],
            assignment: {
              type: 'SELF'
            }
          },
          {
            type: 'APPROVAL',
            name: 'Manager Review',
            description: 'Manager reviews and approves the document',
            inputs: [
              {
                type: 'SELECT',
                name: 'reviewStatus',
                label: 'Review Status',
                required: true,
                options: [
                  { value: 'approved', label: 'Approved' },
                  { value: 'needs-revision', label: 'Needs Revision' },
                  { value: 'rejected', label: 'Rejected' }
                ]
              },
              {
                type: 'TEXTAREA',
                name: 'reviewComments',
                label: 'Review Comments',
                required: false
              }
            ],
            assignment: {
              type: 'MANAGER'
            }
          },
          {
            type: 'ACKNOWLEDGE',
            name: 'Final Notification',
            description: 'Notify submitter of review outcome',
            assignment: {
              type: 'SELF'
            }
          }
        ]
      },
      {
        type: 'TEMPLATE',
        name: 'Expense Report Approval',
        description: 'Submit and approve expense reports',
        version: 1,
        steps: [
          {
            type: 'TASK',
            name: 'Expense Submission',
            description: 'Submit expense report with receipts',
            inputs: [
              {
                type: 'TEXT',
                name: 'expenseTitle',
                label: 'Expense Title',
                required: true
              },
              {
                type: 'NUMBER',
                name: 'totalAmount',
                label: 'Total Amount',
                required: true
              },
              {
                type: 'DATE',
                name: 'expenseDate',
                label: 'Expense Date',
                required: true
              },
              {
                type: 'FILE',
                name: 'receipts',
                label: 'Receipts',
                required: true
              }
            ],
            assignment: {
              type: 'SELF'
            }
          },
          {
            type: 'APPROVAL',
            name: 'Manager Approval',
            description: 'Manager approves expense report',
            inputs: [
              {
                type: 'SELECT',
                name: 'approvalStatus',
                label: 'Approval Status',
                required: true,
                options: [
                  { value: 'approved', label: 'Approved' },
                  { value: 'needs-clarification', label: 'Needs Clarification' },
                  { value: 'rejected', label: 'Rejected' }
                ]
              },
              {
                type: 'TEXTAREA',
                name: 'approvalComments',
                label: 'Approval Comments',
                required: false
              }
            ],
            assignment: {
              type: 'MANAGER'
            }
          },
          {
            type: 'INFORMATION',
            name: 'Processing Notification',
            description: 'Notify about expense processing status',
            assignment: {
              type: 'ROLE_BASED',
              roleIds: ['finance-team']
            }
          }
        ]
      },
      {
        type: 'TEMPLATE',
        name: 'Project Kickoff Process',
        description: 'Initialize new project with stakeholder alignment',
        version: 1,
        steps: [
          {
            type: 'TASK',
            name: 'Project Planning',
            description: 'Define project scope and requirements',
            inputs: [
              {
                type: 'TEXT',
                name: 'projectName',
                label: 'Project Name',
                required: true
              },
              {
                type: 'TEXTAREA',
                name: 'projectDescription',
                label: 'Project Description',
                required: true
              },
              {
                type: 'DATE',
                name: 'targetStartDate',
                label: 'Target Start Date',
                required: true
              },
              {
                type: 'DATE',
                name: 'targetEndDate',
                label: 'Target End Date',
                required: true
              }
            ],
            assignment: {
              type: 'ROLE_BASED',
              roleIds: ['project-manager']
            }
          },
          {
            type: 'APPROVAL',
            name: 'Stakeholder Approval',
            description: 'Get stakeholder approval for project scope',
            inputs: [
              {
                type: 'SELECT',
                name: 'scopeApproval',
                label: 'Scope Approval',
                required: true,
                options: [
                  { value: 'approved', label: 'Approved' },
                  { value: 'needs-revision', label: 'Needs Revision' },
                  { value: 'rejected', label: 'Rejected' }
                ]
              },
              {
                type: 'TEXTAREA',
                name: 'stakeholderFeedback',
                label: 'Stakeholder Feedback',
                required: false
              }
            ],
            assignment: {
              type: 'ROLE_BASED',
              roleIds: ['stakeholder']
            }
          },
          {
            type: 'TASK',
            name: 'Resource Allocation',
            description: 'Allocate team members and resources',
            inputs: [
              {
                type: 'MULTISELECT',
                name: 'teamMembers',
                label: 'Team Members',
                required: true,
                options: [
                  { value: 'developer-1', label: 'Developer 1' },
                  { value: 'developer-2', label: 'Developer 2' },
                  { value: 'designer', label: 'Designer' },
                  { value: 'qa-engineer', label: 'QA Engineer' }
                ]
              },
              {
                type: 'NUMBER',
                name: 'budgetAllocation',
                label: 'Budget Allocation',
                required: true
              }
            ],
            assignment: {
              type: 'ROLE_BASED',
              roleIds: ['resource-manager']
            }
          },
          {
            type: 'INFORMATION',
            name: 'Kickoff Meeting',
            description: 'Schedule and conduct project kickoff meeting',
            links: [
              {
                name: 'Project Charter',
                url: 'https://company.com/project-charter'
              },
              {
                name: 'Team Guidelines',
                url: 'https://company.com/team-guidelines'
              }
            ],
            assignment: {
              type: 'ROLE_BASED',
              roleIds: ['project-manager']
            }
          }
        ]
      }
    ];

    let successCount = 0;
    let errorCount = 0;

    // Register each sample flow
    for (const flow of sampleFlows) {
      try {
        const createdTemplate = await createTemplate(flow);
        logger.info(`Successfully registered sample flow: ${flow.name} (ID: ${createdTemplate.id})`);
        successCount++;
      } catch (error) {
        logger.error(`Failed to register sample flow ${flow.name}:`, error);
        errorCount++;
      }
    }

    logger.info(`Sample flow registration completed. ${successCount} flows registered successfully, ${errorCount} failed.`);
  } catch (error) {
    logger.error('Error during sample flow registration:', error);
  }
};

/**
 * Get a sample flow by ID
 */
export const getSampleFlowById = (id: string): FlowTemplate | undefined => {
  // This would need to be implemented to return flows from the template service
  return undefined;
};

/**
 * Get sample flow summaries for display
 */
export const getSampleFlowSummaries = () => {
  return [
    {
      id: 'Employee Onboarding Process',
      title: 'Employee Onboarding Process',
      description: 'Complete onboarding workflow for new employees',
      stepCount: 4,
      flowType: 'TEMPLATE'
    },
    {
      id: 'Document Review & Approval',
      title: 'Document Review & Approval',
      description: 'Review and approve important documents',
      stepCount: 3,
      flowType: 'TEMPLATE'
    },
    {
      id: 'Expense Report Approval',
      title: 'Expense Report Approval',
      description: 'Submit and approve expense reports',
      stepCount: 3,
      flowType: 'TEMPLATE'
    },
    {
      id: 'Project Kickoff Process',
      title: 'Project Kickoff Process',
      description: 'Initialize new project with proper approvals',
      stepCount: 4,
      flowType: 'TEMPLATE'
    }
  ];
}; 