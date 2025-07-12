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
import { StepType, TaskExecutionType, InputBlockType, ContentBlockType } from '../types/flowTemplate';

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
      recommendedStepTypes: [StepType.APPROVAL],
      forbiddenStepTypes: [StepType.INFORMATION],
      recommendedInputBlocks: [InputBlockType.TEXTAREA, InputBlockType.DROPDOWN],
      recommendedContentBlocks: [ContentBlockType.TEXT, ContentBlockType.DOCUMENT],
      minSteps: 1,
      maxSteps: 1
    },
    preConfiguredSteps: [
      {
        title: 'Approval Required',
        description: 'Request approval from designated approver',
        type: StepType.APPROVAL,
        contentBlocks: [
          {
            type: ContentBlockType.TEXT,
            content: 'Please review and approve this request.',
            description: 'Approval request message',
            required: true
          }
        ],
        inputBlocks: [
          {
            type: InputBlockType.TEXTAREA,
            label: 'Comments',
            required: false,
            placeholder: 'Add any comments about this approval...'
          }
        ],
        assignmentRequired: true,
        assignmentType: 'single'
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
      recommendedStepTypes: [StepType.APPROVAL],
      forbiddenStepTypes: [StepType.INFORMATION],
      recommendedInputBlocks: [InputBlockType.TEXTAREA, InputBlockType.DROPDOWN],
      recommendedContentBlocks: [ContentBlockType.TEXT, ContentBlockType.DOCUMENT],
      minSteps: 2,
      maxSteps: 5
    },
    preConfiguredSteps: [
      {
        title: 'First Level Approval',
        description: 'Initial approval in the chain',
        type: StepType.APPROVAL,
        contentBlocks: [
          {
            type: ContentBlockType.TEXT,
            content: 'Please review and provide your approval for this request.',
            description: 'First level approval message',
            required: true
          }
        ],
        inputBlocks: [
          {
            type: InputBlockType.TEXTAREA,
            label: 'Comments',
            required: false,
            placeholder: 'Add comments for next approver...'
          }
        ],
        assignmentRequired: true,
        assignmentType: 'single'
      },
      {
        title: 'Final Approval',
        description: 'Final approval in the chain',
        type: StepType.APPROVAL,
        contentBlocks: [
          {
            type: ContentBlockType.TEXT,
            content: 'Please provide final approval for this request.',
            description: 'Final approval message',
            required: true
          }
        ],
        inputBlocks: [
          {
            type: InputBlockType.TEXTAREA,
            label: 'Final Comments',
            required: false,
            placeholder: 'Add final approval comments...'
          }
        ],
        assignmentRequired: true,
        assignmentType: 'single'
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
      recommendedStepTypes: [StepType.INFORMATION],
      forbiddenStepTypes: [StepType.APPROVAL],
      recommendedInputBlocks: [],
      recommendedContentBlocks: [ContentBlockType.TEXT, ContentBlockType.DOCUMENT, ContentBlockType.LINK],
      minSteps: 1,
      maxSteps: 1
    },
    preConfiguredSteps: [
      {
        title: 'Information Announcement',
        description: 'Share information with recipients',
        type: StepType.INFORMATION,
        contentBlocks: [
          {
            type: ContentBlockType.TEXT,
            content: 'Important information to share with the team.',
            description: 'Announcement content',
            required: true
          }
        ],
        inputBlocks: [],
        assignmentRequired: true,
        assignmentType: 'multiple'
      }
    ],
    validationRules: [
      {
        field: 'assignment',
        rule: 'required',
        message: 'Recipients are required for announcements'
      },
      {
        field: 'steps[0].inputBlocks',
        rule: 'custom',
        message: 'Information steps should not have input blocks',
        customValidator: (value, template) => {
          return template.steps[0].inputBlocks.length === 0;
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
      recommendedStepTypes: [StepType.ACKNOWLEDGE],
      forbiddenStepTypes: [StepType.APPROVAL],
      recommendedInputBlocks: [InputBlockType.CHECKBOX],
      recommendedContentBlocks: [ContentBlockType.TEXT, ContentBlockType.DOCUMENT],
      minSteps: 1,
      maxSteps: 1
    },
    preConfiguredSteps: [
      {
        title: 'Acknowledgment Required',
        description: 'Confirm you have read and understood this information',
        type: StepType.ACKNOWLEDGE,
        contentBlocks: [
          {
            type: ContentBlockType.TEXT,
            content: 'Please read the following information carefully and acknowledge your understanding.',
            description: 'Information to acknowledge',
            required: true
          }
        ],
        inputBlocks: [
          {
            type: InputBlockType.CHECKBOX,
            label: 'I have read and understood this information',
            required: true
          }
        ],
        assignmentRequired: true,
        assignmentType: 'multiple'
      }
    ],
    validationRules: [
      {
        field: 'assignment',
        rule: 'required',
        message: 'Recipients are required for acknowledgment'
      },
      {
        field: 'steps[0].inputBlocks',
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
      recommendedStepTypes: [StepType.TASK],
      forbiddenStepTypes: [StepType.INFORMATION],
      recommendedInputBlocks: [InputBlockType.TEXTAREA, InputBlockType.FILE, InputBlockType.DROPDOWN],
      recommendedContentBlocks: [ContentBlockType.TEXT, ContentBlockType.DOCUMENT],
      minSteps: 1,
      maxSteps: 10
    },
    preConfiguredSteps: [
      {
        title: 'Complete Task',
        description: 'Complete the assigned task',
        type: StepType.TASK,
        contentBlocks: [
          {
            type: ContentBlockType.TEXT,
            content: 'Please complete the following task.',
            description: 'Task instructions',
            required: true
          }
        ],
        inputBlocks: [
          {
            type: InputBlockType.TEXTAREA,
            label: 'Task Results',
            required: true,
            placeholder: 'Describe what you completed...'
          },
          {
            type: InputBlockType.FILE,
            label: 'Attachments',
            required: false
          }
        ],
        assignmentRequired: true,
        assignmentType: 'single'
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
      'Strategic decision input',
      'Expert opinion gathering',
      'Stakeholder consultation',
      'Advisory feedback collection'
    ],
    configuration: {
      requiresApproval: false,
      requiresAssignment: true,
      requiresDeadline: true,
      requiresEscalation: false,
      allowsMultipleSteps: false,
      recommendedStepTypes: [StepType.TASK],
      forbiddenStepTypes: [StepType.APPROVAL, StepType.INFORMATION],
      recommendedInputBlocks: [InputBlockType.TEXTAREA, InputBlockType.RADIO, InputBlockType.DROPDOWN],
      recommendedContentBlocks: [ContentBlockType.TEXT, ContentBlockType.DOCUMENT],
      minSteps: 1,
      maxSteps: 1
    },
    preConfiguredSteps: [
      {
        title: 'Provide Consultation',
        description: 'Share your opinion and recommendations',
        type: StepType.TASK,
        contentBlocks: [
          {
            type: ContentBlockType.TEXT,
            content: 'Please provide your consultation on this matter.',
            description: 'Consultation request details',
            required: true
          }
        ],
        inputBlocks: [
          {
            type: InputBlockType.TEXTAREA,
            label: 'Your Recommendation',
            required: true,
            placeholder: 'Share your thoughts and recommendations...'
          },
          {
            type: InputBlockType.RADIO,
            label: 'Overall Assessment',
            required: true,
            options: [
              { value: 'strongly_recommend', label: 'Strongly Recommend' },
              { value: 'recommend', label: 'Recommend' },
              { value: 'neutral', label: 'Neutral' },
              { value: 'not_recommend', label: 'Do Not Recommend' },
              { value: 'strongly_not_recommend', label: 'Strongly Do Not Recommend' }
            ]
          }
        ],
        assignmentRequired: true,
        assignmentType: 'multiple'
      }
    ],
    validationRules: [
      {
        field: 'assignment',
        rule: 'required',
        message: 'Consultants must be assigned'
      },
      {
        field: 'assignment.targets',
        rule: 'min',
        value: 1,
        message: 'At least one consultant must be assigned'
      }
    ]
  }
];

// 📝 REVIEW & FEEDBACK
export const REVIEW_FEEDBACK_PATTERNS: BusinessPattern[] = [
  {
    id: 'document-review',
    category: BusinessPatternCategory.REVIEW_FEEDBACK,
    subPattern: ReviewFeedbackPattern.DOCUMENT_REVIEW,
    title: 'Document Review',
    description: 'Review and provide feedback',
    icon: 'FileText',
    color: '#EF4444',
    useCases: [
      'Document review and feedback',
      'Content review process',
      'Report validation',
      'Proposal evaluation'
    ],
    configuration: {
      requiresApproval: false,
      requiresAssignment: true,
      requiresDeadline: true,
      requiresEscalation: true,
      allowsMultipleSteps: false,
      recommendedStepTypes: [StepType.TASK],
      forbiddenStepTypes: [StepType.INFORMATION],
      recommendedInputBlocks: [InputBlockType.TEXTAREA, InputBlockType.DROPDOWN, InputBlockType.FILE],
      recommendedContentBlocks: [ContentBlockType.TEXT, ContentBlockType.DOCUMENT],
      minSteps: 1,
      maxSteps: 1
    },
    preConfiguredSteps: [
      {
        title: 'Document Review',
        description: 'Review the document and provide feedback',
        type: StepType.TASK,
        contentBlocks: [
          {
            type: ContentBlockType.TEXT,
            content: 'Please review the attached document and provide your feedback.',
            description: 'Document review instructions',
            required: true
          },
          {
            type: ContentBlockType.DOCUMENT,
            content: '',
            description: 'Document to review',
            required: true
          }
        ],
        inputBlocks: [
          {
            type: InputBlockType.TEXTAREA,
            label: 'Review Comments',
            required: true,
            placeholder: 'Provide detailed feedback on the document...'
          },
          {
            type: InputBlockType.DROPDOWN,
            label: 'Review Status',
            required: true,
            options: [
              { value: 'approved', label: 'Approved' },
              { value: 'approved_with_changes', label: 'Approved with Changes' },
              { value: 'needs_revision', label: 'Needs Revision' },
              { value: 'rejected', label: 'Rejected' }
            ]
          },
          {
            type: InputBlockType.FILE,
            label: 'Revised Document',
            required: false
          }
        ],
        assignmentRequired: true,
        assignmentType: 'multiple'
      }
    ],
    validationRules: [
      {
        field: 'assignment',
        rule: 'required',
        message: 'Reviewers must be assigned'
      },
      {
        field: 'steps[0].contentBlocks',
        rule: 'min',
        value: 1,
        message: 'Document review must have content to review'
      }
    ]
  }
];

// 🙋 REQUEST & RESPONSE
export const REQUEST_RESPONSE_PATTERNS: BusinessPattern[] = [
  {
    id: 'service-request',
    category: BusinessPatternCategory.REQUEST_RESPONSE,
    subPattern: RequestResponsePattern.SERVICE_REQUEST,
    title: 'Service Request',
    description: 'Request help or service',
    icon: 'HandHeart',
    color: '#06B6D4',
    useCases: [
      'IT support requests',
      'Facility maintenance requests',
      'HR service requests',
      'General help requests'
    ],
    configuration: {
      requiresApproval: false,
      requiresAssignment: true,
      requiresDeadline: true,
      requiresEscalation: true,
      allowsMultipleSteps: false,
      recommendedStepTypes: [StepType.TASK],
      forbiddenStepTypes: [StepType.INFORMATION],
      recommendedInputBlocks: [InputBlockType.TEXTAREA, InputBlockType.DROPDOWN, InputBlockType.FILE],
      recommendedContentBlocks: [ContentBlockType.TEXT],
      minSteps: 1,
      maxSteps: 1
    },
    preConfiguredSteps: [
      {
        title: 'Fulfill Service Request',
        description: 'Complete the requested service',
        type: StepType.TASK,
        contentBlocks: [
          {
            type: ContentBlockType.TEXT,
            content: 'Please fulfill the following service request.',
            description: 'Service request details',
            required: true
          }
        ],
        inputBlocks: [
          {
            type: InputBlockType.TEXTAREA,
            label: 'Service Completion Notes',
            required: true,
            placeholder: 'Describe how the service was completed...'
          },
          {
            type: InputBlockType.DROPDOWN,
            label: 'Service Status',
            required: true,
            options: [
              { value: 'completed', label: 'Completed Successfully' },
              { value: 'partially_completed', label: 'Partially Completed' },
              { value: 'unable_to_complete', label: 'Unable to Complete' },
              { value: 'requires_followup', label: 'Requires Follow-up' }
            ]
          }
        ],
        assignmentRequired: true,
        assignmentType: 'any'
      }
    ],
    validationRules: [
      {
        field: 'assignment',
        rule: 'required',
        message: 'Service providers must be assigned'
      },
      {
        field: 'assignment.targets',
        rule: 'min',
        value: 1,
        message: 'At least one service provider must be assigned'
      }
    ]
  }
];

// All patterns combined
export const ALL_BUSINESS_PATTERNS: BusinessPattern[] = [
  ...APPROVAL_PATTERNS,
  ...INFORMATION_PATTERNS,
  ...TASK_COORDINATION_PATTERNS,
  ...DECISION_MAKING_PATTERNS,
  ...REVIEW_FEEDBACK_PATTERNS,
  ...REQUEST_RESPONSE_PATTERNS
];

// Pattern lookup by category
export const PATTERNS_BY_CATEGORY = {
  [BusinessPatternCategory.APPROVAL]: APPROVAL_PATTERNS,
  [BusinessPatternCategory.INFORMATION]: INFORMATION_PATTERNS,
  [BusinessPatternCategory.TASK_COORDINATION]: TASK_COORDINATION_PATTERNS,
  [BusinessPatternCategory.DECISION_MAKING]: DECISION_MAKING_PATTERNS,
  [BusinessPatternCategory.REVIEW_FEEDBACK]: REVIEW_FEEDBACK_PATTERNS,
  [BusinessPatternCategory.REQUEST_RESPONSE]: REQUEST_RESPONSE_PATTERNS
};

// Pattern lookup by ID
export const PATTERN_BY_ID = ALL_BUSINESS_PATTERNS.reduce((acc, pattern) => {
  acc[pattern.id] = pattern;
  return acc;
}, {} as Record<string, BusinessPattern>); 