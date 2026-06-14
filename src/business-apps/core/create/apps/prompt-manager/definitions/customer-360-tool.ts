/**
 * getCustomer360 — Provider tool definition (Customer360 agent enablement).
 *
 * Returns the normalized `Customer360Snapshot` for a customer subject so the
 * Every Fabric / Enterprise Workforce agent sees EXACTLY what the Customer360
 * UI shows. The output schema below mirrors `Customer360Snapshot`
 * (src/business-apps/crm/core/apps/customer-360/data/types.ts) — keep the two
 * in sync; do not diverge the shapes.
 *
 * This is a READ tool: given `customerType=account` + `customerId`,
 * it resolves the aggregated post-sales view (scores, satisfaction, contracts,
 * tickets, cases, reclamations, invoices, balance, transactions, journal).
 */

import type { InternalToolDefinition } from './internal-tools'

export const GET_CUSTOMER_360_SCHEMA = {
  type: 'object',
  properties: {
    customerType: {
      type: 'string',
      enum: ['account'],
      description: 'Customer subject kind (required). Customer-support workflows are account-only.'
    },
    customerId: {
      type: 'string',
      description: 'UUID of the account to load the 360° snapshot for (required).'
    }
  },
  required: ['customerType', 'customerId']
}

/**
 * Output contract — mirrors `Customer360Snapshot`. Every slice is optional so
 * the agent can reason over partial data exactly like the UI renders it.
 */
export const GET_CUSTOMER_360_OUTPUT_SCHEMA = {
  type: 'object',
  description: 'Normalized Customer360 snapshot (mirrors Customer360Snapshot).',
  properties: {
    scores: {
      type: 'object',
      properties: {
        icpScore: { type: 'number' },
        aiScore: { type: 'number' },
        scoreLabel: { type: 'string' }
      }
    },
    satisfaction: {
      type: 'object',
      properties: {
        csat: { type: 'number' },
        nps: { type: 'number' },
        lastSurveyDate: { type: 'string' }
      }
    },
    contracts: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          name: { type: 'string' },
          status: { type: 'string' },
          startDate: { type: 'string' },
          endDate: { type: 'string' },
          documentId: { type: 'string' },
          documentType: { type: 'string' },
          mimeType: { type: ['string', 'null'] },
          fileSize: { type: ['number', 'null'] },
          createdAt: { type: 'string' },
          fileInfo: {
            type: ['object', 'null'],
            properties: {
              path: { type: 'string' },
              fileMetadata: {
                type: 'object',
                properties: { mimeType: { type: 'string' } }
              }
            }
          }
        }
      }
    },
    tickets: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          title: { type: 'string' },
          status: { type: 'string' },
          priority: { type: 'string' },
          createdAt: { type: 'string' }
        }
      }
    },
    cases: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          title: { type: 'string' },
          status: { type: 'string' },
          type: { type: 'string' },
          createdAt: { type: 'string' }
        }
      }
    },
    reclamations: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          title: { type: 'string' },
          status: { type: 'string' },
          createdAt: { type: 'string' }
        }
      }
    },
    invoices: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          number: { type: 'string' },
          status: { type: 'string' },
          amount: { type: 'number' },
          currency: { type: 'string' },
          issuedDate: { type: 'string' },
          dueDate: { type: 'string' }
        }
      }
    },
    balance: {
      type: 'object',
      properties: {
        openAmount: { type: 'number' },
        overdueAmount: { type: 'number' },
        lifetimeValue: { type: 'number' },
        currency: { type: 'string' }
      }
    },
    transactions: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          description: { type: 'string' },
          amount: { type: 'number' },
          currency: { type: 'string' },
          date: { type: 'string' },
          direction: { type: 'string', enum: ['debit', 'credit'] }
        }
      }
    },
    journal: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          type: { type: 'string' },
          title: { type: 'string' },
          summary: { type: 'string' },
          timestamp: { type: 'string' },
          source: { type: 'string' }
        }
      }
    }
  }
}

/**
 * Runtime handler (executes in the Functions Service sandbox).
 *
 * Aggregates the Customer360 snapshot directly from the platform sources the
 * Customer360 UI already reads — no Kogito endpoint required:
 *   - Platform GraphQL (Hasura): account scores, contracts (CrmDocument),
 *     journal (SalesActivity + CrmNote + SalesTask).
 *   - custom-flow-engine REST: customer-support tickets, cases and reclamations
 *     correlated to the subject.
 * Satisfaction, invoices, balance and transactions are returned empty until the
 * deferred backend (CSAT store + Fibu connection) lands, so the agent reasons
 * over partial data exactly like the UI renders it. Every slice is isolated in
 * its own try/catch so one failing source never breaks the whole snapshot.
 * Uses the sandbox-provided platform service URLs + the caller's bearer token.
 * Never logs tokens or customer PII.
 */
export const GET_CUSTOMER_360_SOURCE = `async function handler(event, context) {
  const token = (context.user && context.user.accessToken) || (context.config && context.config.accessToken);
  if (!token) return { success: false, error: 'No access token available' };
  const type = event && event.customerType;
  const id = event && event.customerId;
  if (!type || !id) return { success: false, error: 'customerType and customerId are required' };
  if (type !== 'account') return { success: false, error: 'customerType must be account' };

  const services = (context.newwork && context.newwork.services) || {};
  const graphqlUrl = services.graphql;
  const flowBase = services.cflow || services.flowEngine;

  async function gql(query, variables) {
    if (!graphqlUrl) return null;
    const res = await fetch(graphqlUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
      body: JSON.stringify({ query: query, variables: variables })
    });
    const json = await res.json().catch(() => null);
    if (!res.ok || !json || json.errors) return null;
    return json.data;
  }

  const snapshot = {
    scores: undefined, satisfaction: undefined, contracts: [], tickets: [], cases: [],
    reclamations: [], invoices: [], balance: undefined, transactions: [], journal: []
  };

  // Scores — averaged from the account's related opportunity AI scores.
  try {
    const data = await gql('query S($id: uuid!) { Account(where: { id: { _eq: $id } }) { id opportunities { aiOpportunityScore aiOpportunityGrade } } }', { id: id });
    const acc = data && data.Account && data.Account[0];
    const opps = (acc && acc.opportunities) || [];
    const scores = opps.map(function (o) { return o.aiOpportunityScore; }).filter(function (s) { return typeof s === 'number' && !isNaN(s); });
    if (scores.length) {
      const ai = scores.reduce(function (a, b) { return a + b; }, 0) / scores.length;
      const graded = opps.find(function (o) { return o.aiOpportunityGrade; });
      snapshot.scores = { aiScore: ai, scoreLabel: (graded && graded.aiOpportunityGrade) || undefined };
    }
  } catch (e) { /* scores optional */ }

  // Contracts — CrmDocument rows classified as CONTRACT via document type.
  try {
    const data = await gql('query D($id: uuid!) { CrmDocument(where: { account: { id: { _eq: $id } }, isDeleted: { _eq: false } }, orderBy: [{ createdAt: DESC }]) { id name mimeType fileSize createdAt fileInfo documentType { code value } } }', { id: id });
    const docs = (data && data.CrmDocument) || [];
    snapshot.contracts = docs.filter(function (d) {
      const t = ((d.documentType && (d.documentType.code || d.documentType.value)) || '').toLowerCase();
      return t.indexOf('contract') !== -1;
    }).map(function (d) {
      return {
        id: d.id, name: d.name, documentId: d.id,
        documentType: (d.documentType && (d.documentType.value || d.documentType.code)) || undefined,
        mimeType: d.mimeType, fileSize: d.fileSize, createdAt: d.createdAt, fileInfo: d.fileInfo || null
      };
    });
  } catch (e) { /* contracts optional */ }

  // Journal — unified activities + notes + tasks, newest first.
  try {
    const data = await gql(
      'query J($id: uuid!) {' +
      ' SalesActivity(where: { account: { id: { _eq: $id } } }, orderBy: [{ createdAt: DESC_NULLS_LAST }], limit: 50) { id title description occurredAt completedAt createdAt activityType { value } }' +
      ' CrmNote(where: { account: { id: { _eq: $id } } }, orderBy: [{ createdAt: DESC_NULLS_LAST }], limit: 50) { id noteTitle noteText createdAt }' +
      ' SalesTask(where: { account: { id: { _eq: $id } } }, orderBy: [{ createdAt: DESC_NULLS_LAST }], limit: 50) { id name description createdAt dueDate }' +
      ' }', { id: id });
    const entries = [];
    if (data) {
      (data.SalesActivity || []).forEach(function (a) { entries.push({ id: 'activity-' + a.id, type: 'activity', title: a.title || (a.activityType && a.activityType.value) || 'Activity', summary: a.description, timestamp: a.occurredAt || a.completedAt || a.createdAt, source: 'activity' }); });
      (data.CrmNote || []).forEach(function (n) { entries.push({ id: 'note-' + n.id, type: 'note', title: n.noteTitle || 'Note', summary: n.noteText, timestamp: n.createdAt, source: 'note' }); });
      (data.SalesTask || []).forEach(function (tk) { entries.push({ id: 'task-' + tk.id, type: 'task', title: tk.name || 'Task', summary: tk.description, timestamp: tk.createdAt || tk.dueDate, source: 'task' }); });
    }
    entries.sort(function (a, b) { return String(b.timestamp || '').localeCompare(String(a.timestamp || '')); });
    snapshot.journal = entries.slice(0, 100);
  } catch (e) { /* journal optional */ }

  // Customer Support workflows — Services-owned flow instances correlated to the subject.
  try {
    if (flowBase) {
      const flowRoot = flowBase.replace(/\\/$/, '');
      const listByLifecycle = async function (lifecycleType) {
        const q = new URLSearchParams({
          correlationEntity: 'account',
          correlationEntityId: id,
          limit: '100',
          offset: '0',
          'tag.app': 'AppCatalog:1:SVC',
          'tag.serviceCategory': 'ServicePortalCategory:1:CUSTOMER_SUPPORT',
          'tag.sourceApp': 'AppCatalog:1:CRM',
          'tag.solution': 'customer360',
          'tag.lifecycleType': lifecycleType
        });
        const res = await fetch(flowRoot + '/api/flows/list?' + q.toString(), { headers: { 'Authorization': 'Bearer ' + token } });
        if (!res.ok) return [];
        const json = await res.json().catch(function () { return null; });
        const flows = (json && ((json.data && json.data.flows) || json.flows)) || [];
        return flows.map(function (f) {
          return { id: f.flowId || f.workflowId || f.id || '', title: f.flowName || f.name || f.title || f.templateName, status: f.status, priority: f.priority, createdAt: f.startTime || f.createdAt };
        }).filter(function (f) { return f.id; });
      };
      const ticketFlows = await listByLifecycle('service-ticket');
      const caseFlows = await listByLifecycle('service-case');
      const reclamationFlows = await listByLifecycle('reclamation');
      snapshot.tickets = ticketFlows.map(function (f) { return { id: f.id, title: f.title || 'Customer Support Ticket', status: f.status, priority: f.priority, createdAt: f.createdAt }; });
      snapshot.cases = caseFlows.map(function (f) { return { id: f.id, title: f.title || 'Customer Support Case', status: f.status, type: 'service-case', createdAt: f.createdAt }; });
      snapshot.reclamations = reclamationFlows.map(function (f) { return { id: f.id, title: f.title || 'Customer Reclamation', status: f.status, createdAt: f.createdAt }; });
    }
  } catch (e) { /* customer support workflows optional */ }

  // satisfaction / invoices / balance / transactions: awaiting backend (CSAT store + Fibu connection).
  return { success: true, customerType: type, customerId: id, snapshot: snapshot };
}`

/**
 * CRM / flow / document provider tools the Customer360 agent should be able to
 * reach alongside `getCustomer360`. Existing CRM tool ids come from
 * `INTERNAL_TOOLS`; flow + document ids name the platform provider tools the
 * agent runtime exposes for ticket/case orchestration and contract handling.
 */
export const CUSTOMER_360_REACHABLE_TOOL_IDS = [
  'get_customer_360',
  'get_customer_portfolio',
  'create_account',
  'update_account',
  'create_contact',
  'update_contact',
  'create_lead',
  'create_opportunity',
  'newwork_trigger_flow',
  'newwork_list_flows',
  'document_search',
  'document_fetch'
]

export const GET_CUSTOMER_360_TOOL: InternalToolDefinition = {
  id: 'get_customer_360',
  name: 'Get Customer 360',
  description:
    'Returns the normalized Customer360 snapshot (scores, satisfaction, contracts, tickets, cases, reclamations, invoices, balance, transactions, journal) for an account. Mirrors exactly what the Customer 360 UI shows.',
  category: 'customer-360',
  operation: 'read',
  schema: GET_CUSTOMER_360_SCHEMA,
  outputSchema: GET_CUSTOMER_360_OUTPUT_SCHEMA,
  relatedToolIds: CUSTOMER_360_REACHABLE_TOOL_IDS,
  source: GET_CUSTOMER_360_SOURCE
}

export default GET_CUSTOMER_360_TOOL
