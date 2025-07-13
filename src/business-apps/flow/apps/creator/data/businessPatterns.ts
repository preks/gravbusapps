/**
 * Concrete business pattern definitions for the wizard system
 */

import {
  BusinessPattern,
  BusinessPatternCategory,
  ApprovalPattern,
  InformationPattern,
  TaskCoordinationPattern,
  DecisionMakingPattern,
  ReviewFeedbackPattern,
  RequestResponsePattern
} from '../types/businessPatterns';
import { FlowStepType, InputType } from '../types/flowTemplate';

// 🔐 APPROVAL WORKFLOWS
export const APPROVAL_PATTERNS: BusinessPattern[] = [
  {
    id: 'single-approver',
    category: BusinessPatternCategory.APPROVAL,
    subPattern: ApprovalPattern.SINGLE_APPROVER,
    title: 'Single Approver',
    description: 'One person approves (manager, lead, etc.)',
    icon: 'UserCheck',
    color: '#3B82F6',
    useCases: [
      'Manager approval for time off',
      'Budget approval from finance',
      'Document sign-off from legal',
      'Purchase order approval'
    ],
    configuration: {
      requiresApproval: true,
      requiresAssignment: true,
      requiresDeadline: true,
      requiresEscalation: true,
      allowsMultipleSteps: false,
      recommendedFlowStepTypes: [FlowStepType.APPROVAL],
      forbiddenFlowStepTypes: [FlowStepType.INFORMATION],
      recommendedInputs: [InputType.TEXTAREA, InputType.SELECT],
      minSteps: 1,
      maxSteps: 1
    },
    preConfiguredSteps: [
      {
        title: 'Approval Required',
        description: 'Request approval from designated approver',
        type: FlowStepType.APPROVAL,
        inputs: [
          {
            type: InputType.TEXTAREA,
            name: 'comments',
            label: 'Comments',
            required: false,
            placeholder: 'Add any comments about this approval...'
          }
        ]
      }
    ],
    validationRules: [
      {
        field: 'assignment',
        rule: 'required',
        message: 'Approver assignment is required'
      },
      {
        field: 'assignment.targets',
        rule: 'min',
        value: 1,
        message: 'At least one approver must be assigned'
      },
      {
        field: 'assignment.targets',
        rule: 'max',
        value: 1,
        message: 'Only one approver can be assigned for single approver pattern'
      }
    ]
  },
  {
    id: 'approval-chain',
    category: BusinessPatternCategory.APPROVAL,
    subPattern: ApprovalPattern.APPROVAL_CHAIN,
    title: 'Approval Chain',
    description: 'Sequential approvals through hierarchy',
    icon: 'GitBranch',
    color: '#3B82F6',
    useCases: [
      'Multi-level budget approvals',
      'Hierarchical document approvals',
      'Escalating expense approvals',
      'Progressive authorization workflow'
    ],
    configuration: {
      requiresApproval: true,
      requiresAssignment: true,
      requiresDeadline: true,
      requiresEscalation: true,
      allowsMultipleSteps: true,
      recommendedFlowStepTypes: [FlowStepType.APPROVAL],
      forbiddenFlowStepTypes: [FlowStepType.INFORMATION],
      recommendedInputs: [InputType.TEXTAREA, InputType.SELECT],
      minSteps: 2,
      maxSteps: 5
    },
    preConfiguredSteps: [
      {
        title: 'First Level Approval',
        description: 'Initial approval in the chain',
        type: FlowStepType.APPROVAL,
        inputs: [
          {
            type: InputType.TEXTAREA,
            name: 'comments',
            label: 'Comments',
            required: false,
            placeholder: 'Add comments for next approver...'
          }
        ]
      },
      {
        title: 'Final Approval',
        description: 'Final approval in the chain',
        type: FlowStepType.APPROVAL,
        inputs: [
          {
            type: InputType.TEXTAREA,
            name: 'finalComments',
            label: 'Final Comments',
            required: false,
            placeholder: 'Add final approval comments...'
          }
        ]
      }
    ],
    validationRules: [
      {
        field: 'steps',
        rule: 'min',
        value: 2,
        message: 'Approval chain requires at least 2 steps'
      },
      {
        field: 'steps',
        rule: 'custom',
        message: 'All steps must have assignments in approval chain',
        customValidator: (value, template) => {
          return template.steps.every((step: any) => step.assignment && step.assignment.targets.length > 0);
        }
      }
    ]
  }
];

// 📢 INFORMATION DISTRIBUTION
export const INFORMATION_PATTERNS: BusinessPattern[] = [
  {
    id: 'announcement',
    category: BusinessPatternCategory.INFORMATION,
    subPattern: InformationPattern.ANNOUNCEMENT,
    title: 'Announcement',
    description: 'Broadcast information (no response needed)',
    icon: 'Megaphone',
    color: '#10B981',
    useCases: [
      'Company-wide announcements',
      'Policy updates',
      'System maintenance notifications',
      'General information sharing'
    ],
    configuration: {
      requiresApproval: false,
      requiresAssignment: true,
      requiresDeadline: false,
      requiresEscalation: false,
      allowsMultipleSteps: false,
      recommendedFlowStepTypes: [FlowStepType.INFORMATION],
      forbiddenFlowStepTypes: [FlowStepType.APPROVAL],
      recommendedInputs: [],
      minSteps: 1,
      maxSteps: 1
    },
    preConfiguredSteps: [
      {
        title: 'Information Announcement',
        description: 'Share information with recipients',
        type: FlowStepType.INFORMATION,
        inputs: []
      }
    ],
    validationRules: [
      {
        field: 'assignment',
        rule: 'required',
        message: 'Recipients are required for announcements'
      },
      {
        field: 'steps[0].inputs',
        rule: 'custom',
        message: 'Information steps should not have input blocks',
        customValidator: (value, template) => {
          return template.steps[0].inputs.length === 0;
        }
      }
    ]
  },
  {
    id: 'acknowledgment-required',
    category: BusinessPatternCategory.INFORMATION,
    subPattern: InformationPattern.ACKNOWLEDGMENT_REQUIRED,
    title: 'Acknowledgment Required',
    description: 'People must confirm they\'ve read it',
    icon: 'CheckSquare',
    color: '#10B981',
    useCases: [
      'Safety training acknowledgment',
      'Policy acceptance confirmation',
      'Compliance training completion',
      'Important notice confirmation'
    ],
    configuration: {
      requiresApproval: false,
      requiresAssignment: true,
      requiresDeadline: true,
      requiresEscalation: true,
      allowsMultipleSteps: false,
      recommendedFlowStepTypes: [FlowStepType.ACKNOWLEDGE],
      forbiddenFlowStepTypes: [FlowStepType.APPROVAL],
      recommendedInputs: [InputType.CHECKBOX],
      minSteps: 1,
      maxSteps: 1
    },
    preConfiguredSteps: [
      {
        title: 'Acknowledgment Required',
        description: 'Confirm you have read and understood this information',
        type: FlowStepType.ACKNOWLEDGE,
        inputs: [
          {
            type: InputType.CHECKBOX,
            name: 'acknowledgment',
            label: 'I have read and understood this information',
            required: true
          }
        ]
      }
    ],
    validationRules: [
      {
        field: 'assignment',
        rule: 'required',
        message: 'Recipients are required for acknowledgment'
      },
      {
        field: 'steps[0].inputs',
        rule: 'min',
        value: 1,
        message: 'Acknowledgment step must have at least one input block'
      }
    ]
  }
];

// 🎯 TASK COORDINATION
export const TASK_COORDINATION_PATTERNS: BusinessPattern[] = [
  {
    id: 'task-assignment',
    category: BusinessPatternCategory.TASK_COORDINATION,
    subPattern: TaskCoordinationPattern.TASK_ASSIGNMENT,
    title: 'Task Assignment',
    description: 'Assign specific tasks to specific people',
    icon: 'Target',
    color: '#F59E0B',
    useCases: [
      'Project task assignments',
      'Action item distribution',
      'Work order assignments',
      'Individual task delegation'
    ],
    configuration: {
      requiresApproval: false,
      requiresAssignment: true,
      requiresDeadline: true,
      requiresEscalation: true,
      allowsMultipleSteps: true,
      recommendedFlowStepTypes: [FlowStepType.TASK],
      forbiddenFlowStepTypes: [FlowStepType.INFORMATION],
      recommendedInputs: [InputType.TEXTAREA, InputType.FILE, InputType.SELECT],
      minSteps: 1,
      maxSteps: 10
    },
    preConfiguredSteps: [
      {
        title: 'Complete Task',
        description: 'Complete the assigned task',
        type: FlowStepType.TASK,
        inputs: [
          {
            type: InputType.TEXTAREA,
            name: 'taskResults',
            label: 'Task Results',
            required: true,
            placeholder: 'Describe what you completed...'
          },
          {
            type: InputType.FILE,
            name: 'attachments',
            label: 'Attachments',
            required: false
          }
        ]
      }
    ],
    validationRules: [
      {
        field: 'assignment',
        rule: 'required',
        message: 'Task assignment is required'
      },
      {
        field: 'steps',
        rule: 'custom',
        message: 'All task steps must have assignments',
        customValidator: (value, template) => {
          return template.steps.every((step: any) => step.assignment && step.assignment.targets.length > 0);
        }
      }
    ]
  }
];

// 🤔 DECISION MAKING
export const DECISION_MAKING_PATTERNS: BusinessPattern[] = [
  {
    id: 'consultation',
    category: BusinessPatternCategory.DECISION_MAKING,
    subPattern: DecisionMakingPattern.CONSULTATION,
    title: 'Consultation',
    description: 'Gather data before deciding',
    icon: 'MessageSquare',
    color: '#8B5CF6',
    useCases: [
      'Expert consultation before decision',
      'Stakeholder feedback collection',
      'Technical review process',
      'Multi-perspective analysis'
    ],
    configuration: {
      requiresApproval: false,
      requiresAssignment: true,
      requiresDeadline: true,
      requiresEscalation: true,
      allowsMultipleSteps: true,
      recommendedFlowStepTypes: [FlowStepType.TASK, FlowStepType.INFORMATION],
      forbiddenFlowStepTypes: [FlowStepType.APPROVAL],
      recommendedInputs: [InputType.TEXTAREA, InputType.FILE, InputType.SELECT],
      minSteps: 2,
      maxSteps: 5
    },
    preConfiguredSteps: [
      {
        title: 'Gather Information',
        description: 'Collect relevant information and feedback',
        type: FlowStepType.TASK,
        inputs: [
          {
            type: InputType.TEXTAREA,
            name: 'feedback',
            label: 'Feedback',
            required: true,
            placeholder: 'Provide your feedback and recommendations...'
          },
          {
            type: InputType.FILE,
            name: 'supportingDocuments',
            label: 'Supporting Documents',
            required: false
          }
        ]
      },
      {
        title: 'Review and Decide',
        description: 'Review collected information and make decision',
        type: FlowStepType.TASK,
        inputs: [
          {
            type: InputType.TEXTAREA,
            name: 'decisionSummary',
            label: 'Decision Summary',
            required: true,
            placeholder: 'Summarize your decision and reasoning...'
          }
        ]
      }
    ],
    validationRules: [
      {
        field: 'steps',
        rule: 'min',
        value: 2,
        message: 'Consultation requires at least 2 steps'
      }
    ]
  }
];

// 📝 REVIEW & FEEDBACK
export const REVIEW_FEEDBACK_PATTERNS: BusinessPattern[] = [
  {
    id: 'peer-review',
    category: BusinessPatternCategory.REVIEW_FEEDBACK,
    subPattern: ReviewFeedbackPattern.PEER_REVIEW,
    title: 'Peer Review',
    description: 'Review work from colleagues',
    icon: 'Users',
    color: '#EC4899',
    useCases: [
      'Code review process',
      'Document peer review',
      'Design feedback collection',
      'Quality assurance review'
    ],
    configuration: {
      requiresApproval: false,
      requiresAssignment: true,
      requiresDeadline: true,
      requiresEscalation: true,
      allowsMultipleSteps: true,
      recommendedFlowStepTypes: [FlowStepType.TASK],
      forbiddenFlowStepTypes: [FlowStepType.APPROVAL],
      recommendedInputs: [InputType.TEXTAREA, InputType.FILE, InputType.CHECKBOX],
      minSteps: 1,
      maxSteps: 3
    },
    preConfiguredSteps: [
      {
        title: 'Review Work',
        description: 'Review the submitted work and provide feedback',
        type: FlowStepType.TASK,
        inputs: [
          {
            type: InputType.TEXTAREA,
            name: 'reviewComments',
            label: 'Review Comments',
            required: true,
            placeholder: 'Provide detailed review comments...'
          },
          {
            type: InputType.CHECKBOX,
            name: 'qualityStandardsMet',
            label: 'Work meets quality standards',
            required: true
          },
          {
            type: InputType.FILE,
            name: 'reviewAttachments',
            label: 'Review Attachments',
            required: false
          }
        ]
      }
    ],
    validationRules: [
      {
        field: 'assignment',
        rule: 'required',
        message: 'Reviewers are required for peer review'
      }
    ]
  }
];

// 🔄 REQUEST & RESPONSE
export const REQUEST_RESPONSE_PATTERNS: BusinessPattern[] = [
  {
    id: 'request-response',
    category: BusinessPatternCategory.REQUEST_RESPONSE,
    subPattern: RequestResponsePattern.SERVICE_REQUEST,
    title: 'Request & Response',
    description: 'Make a request and get a response',
    icon: 'MessageCircle',
    color: '#06B6D4',
    useCases: [
      'Information requests',
      'Support ticket handling',
      'Service requests',
      'Question and answer workflows'
    ],
    configuration: {
      requiresApproval: false,
      requiresAssignment: true,
      requiresDeadline: true,
      requiresEscalation: true,
      allowsMultipleSteps: true,
      recommendedFlowStepTypes: [FlowStepType.TASK],
      forbiddenFlowStepTypes: [FlowStepType.APPROVAL],
      recommendedInputs: [InputType.TEXTAREA, InputType.FILE, InputType.SELECT],
      minSteps: 2,
      maxSteps: 4
    },
    preConfiguredSteps: [
      {
        title: 'Submit Request',
        description: 'Submit your request for information or service',
        type: FlowStepType.TASK,
        inputs: [
          {
            type: InputType.TEXTAREA,
            name: 'requestDetails',
            label: 'Request Details',
            required: true,
            placeholder: 'Describe your request in detail...'
          },
          {
            type: InputType.FILE,
            name: 'supportingDocuments',
            label: 'Supporting Documents',
            required: false
          }
        ]
      },
      {
        title: 'Provide Response',
        description: 'Provide response to the request',
        type: FlowStepType.TASK,
        inputs: [
          {
            type: InputType.TEXTAREA,
            name: 'response',
            label: 'Response',
            required: true,
            placeholder: 'Provide your response...'
          },
          {
            type: InputType.FILE,
            name: 'responseAttachments',
            label: 'Response Attachments',
            required: false
          }
        ]
      }
    ],
    validationRules: [
      {
        field: 'steps',
        rule: 'min',
        value: 2,
        message: 'Request-response requires at least 2 steps'
      }
    ]
  }
];

// Combine all patterns
export const ALL_BUSINESS_PATTERNS: BusinessPattern[] = [
  ...APPROVAL_PATTERNS,
  ...INFORMATION_PATTERNS,
  ...TASK_COORDINATION_PATTERNS,
  ...DECISION_MAKING_PATTERNS,
  ...REVIEW_FEEDBACK_PATTERNS,
  ...REQUEST_RESPONSE_PATTERNS
];

// Pattern validation rules
export const PATTERN_VALIDATION_RULES = {
  'single-approver': [
    {
      field: 'steps[0].inputs',
      rule: 'custom' as const,
      message: 'Single approver should have comment input',
      customValidator: (value: any, template: any) => {
        return template.steps[0].inputs.some((block: any) => 
          block.type === InputType.TEXTAREA && block.label.toLowerCase().includes('comment')
        );
      }
    }
  ],
  'approval-chain': [
    {
      field: 'steps',
      rule: 'custom' as const,
      message: 'Approval chain steps should have sequential assignments',
      customValidator: (value: any, template: any) => {
        return template.steps.every((step: any, index: number) => 
          step.assignment && step.assignment.targets.length > 0
        );
      }
    }
  ],
  'announcement': [
    {
      field: 'steps[0].inputs',
      rule: 'custom' as const,
      message: 'Announcement should not have input blocks',
      customValidator: (value: any, template: any) => {
        return template.steps[0].inputs.length === 0;
      }
    }
  ],
  'acknowledgment-required': [
    {
      field: 'steps[0].inputs',
      rule: 'custom' as const,
      message: 'Acknowledgment should have checkbox input',
      customValidator: (value: any, template: any) => {
        return template.steps[0].inputs.some((block: any) => 
          block.type === InputType.CHECKBOX
        );
      }
    }
  ],
  'task-assignment': [
    {
      field: 'steps[0].inputs',
      rule: 'custom' as const,
      message: 'Task assignment should have result input',
      customValidator: (value: any, template: any) => {
        return template.steps[0].inputs.some((block: any) => 
          block.type === InputType.TEXTAREA && block.label.toLowerCase().includes('result')
        );
      }
    }
  ],
  'consultation': [
    {
      field: 'steps',
      rule: 'custom' as const,
      message: 'Consultation should have multiple steps',
      customValidator: (value: any, template: any) => {
        return template.steps.length >= 2;
      }
    }
  ],
  'peer-review': [
    {
      field: 'steps[0].inputs',
      rule: 'custom' as const,
      message: 'Peer review should have quality checkbox',
      customValidator: (value: any, template: any) => {
        return template.steps[0].inputs.some((block: any) => 
          block.type === InputType.CHECKBOX && block.label.toLowerCase().includes('quality')
        );
      }
    }
  ],
  'request-response': [
    {
      field: 'steps',
      rule: 'custom' as const,
      message: 'Request-response should have request and response steps',
      customValidator: (value: any, template: any) => {
        return template.steps.length >= 2;
      }
    }
  ]
}; 