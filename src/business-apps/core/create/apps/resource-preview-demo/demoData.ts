import type { ComponentSpec } from '../../ai-orchestrator/features/orchestrator/types'
import type { FlowStepSpec } from '../../ai-orchestrator/features/orchestrator/types'

const DEMO_FLOW_ID = 'demo-flow-001'
const DEMO_FLOW_BRANCH_ID = 'demo-flow-branch-001'
const DEMO_AGENT_ID = 'demo-agent-001'
const DEMO_FUNCTION_ID = 'demo-function-001'
const DEMO_DATA_MODEL_ID = 'demo-datamodel-001'

export const DEMO_COMPONENTS: ComponentSpec[] = [
  {
    id: 'comp-flow',
    type: 'flow',
    name: 'Approval Flow',
    description: 'Three-step approval workflow for purchase requests.',
    userFriendlyDescription: 'Approval workflow with request, review, and sign-off steps.',
    status: 'completed',
    dependencies: [],
    createdId: DEMO_FLOW_ID,
    flowSpec: {
      name: 'Approval Flow',
      description: 'Three-step approval workflow for purchase requests. Starts with a manual form trigger.',
      flowType: 'TEMPLATE',
      steps: [
        {
          type: 'TASK',
          title: 'Submit Request',
          message: 'Submit your purchase request with amount and justification.',
          assignmentMode: 'CLAIM',
          dueInMinutes: 60,
          nextStep: 1
        },
        {
          type: 'APPROVAL',
          title: 'Manager Review',
          message: 'Manager reviews and approves or rejects.',
          assignmentMode: 'ASSIGN',
          dueInMinutes: 120,
          nextStep: 2
        },
        {
          type: 'TASK',
          title: 'Sign-off',
          message: 'Final sign-off and archival.',
          assignmentMode: 'CLAIM',
          dueInMinutes: 60
        }
      ],
      triggerType: 'manual',
      triggers: [{ id: 'manual', type: 'MANUAL_FORM', name: 'Manual start', config: {} }],
      tags: { domain: 'finance', process: 'approval' }
    }
  },
  {
    id: 'comp-flow-branch',
    type: 'flow',
    name: 'Branching Flow',
    description: 'Demo flow with start triggers and a gateway (conditional branches).',
    userFriendlyDescription: 'Shows Start node, gateway, and parallel branches.',
    status: 'completed',
    dependencies: [],
    createdId: DEMO_FLOW_BRANCH_ID,
    flowSpec: {
      name: 'Branching Flow',
      description:
        'Demo flow with start trigger and a gateway: two branches (Director Approval for high amounts, Complete for low amounts).',
      flowType: 'TEMPLATE',
      steps: [
        {
          type: 'TASK',
          title: 'Submit',
          message: 'Submit the form.',
          assignmentMode: 'CLAIM',
          dueInMinutes: 60,
          nextStep: 1
        },
        {
          type: 'GATEWAY',
          title: 'Branch',
          message: 'Route by request amount.',
          branches: [
            { condition: 'amount > 5000', nextStep: 2 },
            { condition: 'amount <= 5000', nextStep: 3 }
          ],
          defaultNextStep: 3
        } as FlowStepSpec,
        {
          type: 'APPROVAL',
          title: 'Director Approval',
          message: 'Required for high amounts.',
          assignmentMode: 'ASSIGN',
          dueInMinutes: 120
        },
        { type: 'TASK', title: 'Complete', message: 'Request completed.', assignmentMode: 'CLAIM', dueInMinutes: 60 }
      ],
      triggerType: 'manual',
      triggers: [{ id: 'manual', type: 'MANUAL_FORM', name: 'Manual start', config: {} }],
      tags: { domain: 'demo', process: 'branching' }
    }
  },
  {
    id: 'comp-agent',
    type: 'agent',
    name: 'Lead Qualifier',
    description: 'Qualifies sales leads and recommends next steps based on company and industry context.',
    userFriendlyDescription: 'Analyze leads and get actionable qualification insights.',
    status: 'completed',
    dependencies: [],
    createdId: DEMO_AGENT_ID,
    agentSpec: {
      name: 'Lead Qualifier',
      description: 'Qualifies sales leads and recommends next steps based on company and industry context.',
      systemPrompt:
        'You are an expert B2B sales assistant. Given a lead, analyze their fit based on company, industry, and provided notes. Return a qualification score from 1–10, a short summary of key insights, and 2–3 concrete recommended next steps. Be concise and actionable.',
      userPromptTemplate:
        'Lead name: {lead_name}\nCompany: {company}\nIndustry: {industry}\nNotes: {notes}\nAdditional context: {context}',
      tools: [],
      agentType: 'everyai',
      specialty: 'Lead qualification and B2B sales strategy',
      responseStyle: 'conversational',
      citationMode: 'never',
      tags: ['sales', 'crm', 'leads', 'qualification'],
      responseSchema: {
        type: 'object',
        properties: {
          score: { type: 'number', description: 'Qualification score from 1 to 10' },
          insights: { type: 'string', description: 'Key insights about the lead' },
          nextSteps: { type: 'array', items: { type: 'string' }, description: 'Recommended next steps' }
        },
        required: ['score', 'insights', 'nextSteps']
      }
    }
  },
  {
    id: 'comp-function',
    type: 'function',
    name: 'sendNotification',
    description: 'Sends a notification payload to a configured channel.',
    userFriendlyDescription: 'Serverless function to send notifications.',
    status: 'completed',
    dependencies: [],
    createdId: DEMO_FUNCTION_ID,
    functionSpec: {
      name: 'sendNotification',
      description: 'Sends a notification payload to a configured channel.',
      sourceCode: `module.exports.handler = async (event) => {
  const { channel, message } = event;
  return { ok: true, channel, message, sentAt: new Date().toISOString() };
};`,
      inputSchema: {
        type: 'object',
        properties: {
          channel: { type: 'string', description: 'Target channel' },
          message: { type: 'string', description: 'Message text' }
        },
        required: ['channel', 'message']
      },
      outputSchema: { type: 'object', properties: { ok: { type: 'boolean' }, sentAt: { type: 'string' } } },
      agentEnabled: true,
      workflowEnabled: true,
      config: {}
    }
  },
  {
    id: 'comp-datamodel',
    type: 'data_model',
    name: 'Project',
    description: 'Project entity with name, status, and dates.',
    userFriendlyDescription: 'Custom entity for project tracking.',
    status: 'completed',
    dependencies: [],
    createdId: DEMO_DATA_MODEL_ID,
    dataModelSpec: {
      name: 'Project',
      description: 'Project entity with name, status, and dates.',
      modelType: 'entity',
      identifier: 'project',
      namespace: 'default',
      fields: [
        { name: 'name', type: 'text', label: 'Project Name', required: true },
        {
          name: 'status',
          type: 'select',
          label: 'Status',
          required: true,
          options: [
            { value: 'draft', label: 'Draft' },
            { value: 'active', label: 'Active' },
            { value: 'done', label: 'Done' }
          ]
        },
        { name: 'startDate', type: 'date', label: 'Start Date', required: false },
        { name: 'endDate', type: 'date', label: 'End Date', required: false }
      ]
    }
  }
]

export { DEMO_FLOW_ID, DEMO_FLOW_BRANCH_ID, DEMO_AGENT_ID, DEMO_FUNCTION_ID, DEMO_DATA_MODEL_ID }
