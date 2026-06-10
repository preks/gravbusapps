/**
 * getCustomerPortfolio — Provider tool definition (Customer360 Home enablement).
 *
 * Returns the book-of-business portfolio the Customer360 Home product renders:
 * every CRM account + contact unified into ranked `CustomerPortfolioRow`s plus
 * aggregate `CustomerPortfolioStats`. Attention scoring mirrors the FE
 * `computeAttention` / `deriveProvisionalSummary` logic EXACTLY so the agent and
 * the UI rank customers identically. Health summaries are provisional (derived
 * from real CRM fields — owner assignment + prospective flag) until the CSAT /
 * finance backend lands; `provisional: true` is surfaced so consumers disclose it.
 *
 * This is a READ tool with no required inputs (optional `limit`). It reads the
 * platform GraphQL (Hasura) directly from the Functions Service sandbox.
 */

import type { InternalToolDefinition } from './internal-tools'

export const GET_CUSTOMER_PORTFOLIO_SCHEMA = {
  type: 'object',
  properties: {
    limit: {
      type: 'number',
      description: 'Max accounts and contacts to load per type (default 100, max 200).'
    }
  },
  required: []
}

/** Output contract — mirrors `CustomerPortfolioRow[]` + `CustomerPortfolioStats`. */
export const GET_CUSTOMER_PORTFOLIO_OUTPUT_SCHEMA = {
  type: 'object',
  description: 'Customer360 portfolio rows + aggregate stats (mirrors useCustomerPortfolio).',
  properties: {
    success: { type: 'boolean' },
    rows: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          type: { type: 'string', enum: ['account', 'contact'] },
          displayName: { type: 'string' },
          secondary: { type: ['string', 'null'] },
          ownerId: { type: ['string', 'null'] },
          status: { type: 'string' },
          summary: {
            type: 'object',
            properties: {
              health: { type: 'number' },
              provisional: { type: 'boolean' }
            }
          },
          attentionScore: { type: 'number' },
          attentionReasons: { type: 'array', items: { type: 'string' } }
        }
      }
    },
    stats: {
      type: 'object',
      properties: {
        totalCustomers: { type: 'number' },
        totalAccounts: { type: 'number' },
        totalContacts: { type: 'number' },
        needsAttention: { type: 'number' },
        unassigned: { type: 'number' },
        avgCsat: { type: ['number', 'null'] },
        provisional: { type: 'boolean' }
      }
    }
  }
}

/**
 * Runtime handler (executes in the Functions Service sandbox). Lists accounts +
 * contacts from the platform GraphQL, derives a provisional health summary and
 * a deterministic attention score per row (identical weights to the FE), and
 * returns ranked rows + portfolio stats. Never logs tokens or customer PII.
 */
export const GET_CUSTOMER_PORTFOLIO_SOURCE = `async function handler(event, context) {
  const token = (context.user && context.user.accessToken) || (context.config && context.config.accessToken);
  if (!token) return { success: false, error: 'No access token available' };
  const services = (context.newwork && context.newwork.services) || {};
  const graphqlUrl = services.graphql;
  if (!graphqlUrl) return { success: false, error: 'GraphQL service URL unavailable' };
  const limit = Math.min((event && event.limit) || 100, 200);

  async function gql(query, variables) {
    const res = await fetch(graphqlUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
      body: JSON.stringify({ query: query, variables: variables })
    });
    const json = await res.json().catch(function () { return null; });
    if (!res.ok || !json || json.errors) throw new Error('GraphQL query failed');
    return json.data;
  }

  const clamp = function (v) { return Math.max(0, Math.min(100, Math.round(v))); };
  function deriveSummary(ownerId, prospective) {
    let health = 82;
    if (prospective) health -= 45;
    if (!ownerId) health -= 20;
    return { health: Math.max(0, Math.min(100, health)), provisional: true };
  }
  function computeAttention(summary, ownerId, status) {
    const reasons = [];
    let score = typeof summary.health === 'number' ? 100 - summary.health : 0;
    if (typeof summary.csat === 'number' && summary.csat < 60) { score += 30; reasons.push('low-csat'); }
    if ((summary.openReclamations || 0) > 0) { score += 25; reasons.push('open-reclamation'); }
    if ((summary.overdueAmount || 0) > 0) { score += 20; reasons.push('overdue-invoice'); }
    if ((summary.expiringContracts || 0) > 0) { score += 15; reasons.push('expiring-contract'); }
    if ((summary.openTickets || 0) > 0) { score += 10 * Math.min(summary.openTickets || 0, 3); reasons.push('open-tickets'); }
    if (!ownerId) { score += 15; reasons.push('no-owner'); }
    if (status === 'prospective') { score += 10; reasons.push('prospective'); }
    return { score: clamp(score), reasons: reasons };
  }

  const THRESHOLD = 40;
  const rows = [];
  let accountTotal = 0;
  let contactTotal = 0;

  try {
    const data = await gql('query A($limit: Int!) { Account(where: { isDeleted: { _eq: false } }, limit: $limit, orderBy: [{ name: ASC }]) { id name website prospective ownerEmployeeId } AccountAggregate(where: { isDeleted: { _eq: false } }) { aggregate { count } } }', { limit: limit });
    accountTotal = (data.AccountAggregate && data.AccountAggregate.aggregate && data.AccountAggregate.aggregate.count) || 0;
    (data.Account || []).forEach(function (a) {
      if (!a.id) return;
      const status = a.prospective ? 'prospective' : 'active';
      const summary = deriveSummary(a.ownerEmployeeId, a.prospective);
      const r = computeAttention(summary, a.ownerEmployeeId, status);
      rows.push({ id: a.id, type: 'account', displayName: a.name || 'Unknown account', secondary: a.website || undefined, ownerId: a.ownerEmployeeId, status: status, summary: summary, attentionScore: r.score, attentionReasons: r.reasons });
    });
  } catch (e) {
    return { success: false, error: 'Failed to load accounts: ' + (e.message || String(e)) };
  }

  try {
    const data = await gql('query C($limit: Int!) { Contact(where: { isDeleted: { _eq: false } }, limit: $limit, orderBy: [{ lastName: ASC }]) { id firstName lastName fullName jobPosition ownerEmployeeId } ContactAggregate(where: { isDeleted: { _eq: false } }) { aggregate { count } } }', { limit: limit });
    contactTotal = (data.ContactAggregate && data.ContactAggregate.aggregate && data.ContactAggregate.aggregate.count) || 0;
    (data.Contact || []).forEach(function (c) {
      if (!c.id) return;
      const summary = deriveSummary(c.ownerEmployeeId, false);
      const r = computeAttention(summary, c.ownerEmployeeId, 'active');
      const name = c.fullName || [c.firstName, c.lastName].filter(Boolean).join(' ').trim() || 'Unknown contact';
      rows.push({ id: c.id, type: 'contact', displayName: name, secondary: c.jobPosition || undefined, ownerId: c.ownerEmployeeId, status: 'active', summary: summary, attentionScore: r.score, attentionReasons: r.reasons });
    });
  } catch (e) { /* contacts optional */ }

  rows.sort(function (a, b) { return b.attentionScore - a.attentionScore; });
  const csatValues = rows.map(function (r) { return r.summary.csat; }).filter(function (v) { return typeof v === 'number'; });
  const stats = {
    totalCustomers: accountTotal + contactTotal,
    totalAccounts: accountTotal,
    totalContacts: contactTotal,
    needsAttention: rows.filter(function (r) { return r.attentionScore >= THRESHOLD; }).length,
    unassigned: rows.filter(function (r) { return !r.ownerId; }).length,
    avgCsat: csatValues.length ? Math.round(csatValues.reduce(function (a, b) { return a + b; }, 0) / csatValues.length) : undefined,
    provisional: rows.length === 0 ? true : rows.some(function (r) { return r.summary.provisional; })
  };

  return { success: true, rows: rows, stats: stats };
}`

export const GET_CUSTOMER_PORTFOLIO_TOOL: InternalToolDefinition = {
  id: 'get_customer_portfolio',
  name: 'Get Customer Portfolio',
  description:
    'Returns the Customer360 book-of-business portfolio: every CRM account and contact ranked by a deterministic attention score (with reason codes) plus aggregate stats (total customers, needs-attention, unassigned). Mirrors the Customer 360 Home cockpit and attention worklist.',
  category: 'customer-360',
  operation: 'read',
  schema: GET_CUSTOMER_PORTFOLIO_SCHEMA,
  outputSchema: GET_CUSTOMER_PORTFOLIO_OUTPUT_SCHEMA,
  source: GET_CUSTOMER_PORTFOLIO_SOURCE
}

export default GET_CUSTOMER_PORTFOLIO_TOOL
