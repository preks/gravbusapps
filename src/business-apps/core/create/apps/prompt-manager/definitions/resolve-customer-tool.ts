/**
 * resolveCustomerByEmail — Provider tool definition (Customer360 inbound triage).
 *
 * Identity resolution for inbound communication: given a sender email address,
 * find the matching CRM contact (exact email), the matching account (exact
 * email on the account), and any accounts sharing the sender's email DOMAIN
 * (website or an account email on that domain). This is what lets the agent
 * recognize "who wrote in" and then call get_customer_360 with the resolved
 * customerType + customerId.
 *
 * READ tool. Reads the platform GraphQL (Hasura) directly from the Functions
 * Service sandbox. Never logs tokens or PII.
 */

import type { InternalToolDefinition } from './internal-tools'

export const RESOLVE_CUSTOMER_SCHEMA = {
  type: 'object',
  properties: {
    email: {
      type: 'string',
      description: 'The sender email address to resolve to a CRM contact/account (required).'
    }
  },
  required: ['email']
}

export const RESOLVE_CUSTOMER_OUTPUT_SCHEMA = {
  type: 'object',
  description: 'Customer identity resolution result for an inbound email address.',
  properties: {
    success: { type: 'boolean' },
    email: { type: 'string' },
    domain: { type: ['string', 'null'] },
    /** The single best match, if confident (exact email beats domain). */
    bestMatch: {
      type: ['object', 'null'],
      properties: {
        type: { type: 'string', enum: ['account', 'contact'] },
        id: { type: 'string' },
        displayName: { type: 'string' },
        matchType: { type: 'string', enum: ['email', 'domain'] }
      }
    },
    matches: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          type: { type: 'string', enum: ['account', 'contact'] },
          id: { type: 'string' },
          displayName: { type: 'string' },
          matchType: { type: 'string', enum: ['email', 'domain'] }
        }
      }
    }
  }
}

/**
 * Runtime handler (Functions Service sandbox). Resolves a sender email to CRM
 * contacts/accounts by exact email and by shared domain. Returns ranked matches
 * plus a `bestMatch` (exact email preferred) so the agent can immediately call
 * get_customer_360 with the resolved subject.
 */
export const RESOLVE_CUSTOMER_SOURCE = `async function handler(event, context) {
  const token = (context.user && context.user.accessToken) || (context.config && context.config.accessToken);
  if (!token) return { success: false, error: 'No access token available' };
  const services = (context.newwork && context.newwork.services) || {};
  const graphqlUrl = services.graphql;
  if (!graphqlUrl) return { success: false, error: 'GraphQL service URL unavailable' };

  const rawEmail = (event && event.email ? String(event.email) : '').trim().toLowerCase();
  if (!rawEmail) return { success: false, error: 'email is required' };
  const atIndex = rawEmail.lastIndexOf('@');
  const domain = atIndex >= 0 ? rawEmail.slice(atIndex + 1) : '';

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

  function contactName(c) {
    return c.fullName || [c.firstName, c.lastName].filter(Boolean).join(' ').trim() || 'Unknown contact';
  }

  const matches = [];
  const seen = {};
  function add(type, id, displayName, matchType) {
    if (!id) return;
    const key = type + ':' + id;
    if (seen[key]) return;
    seen[key] = true;
    matches.push({ type: type, id: id, displayName: displayName, matchType: matchType });
  }

  // Exact email match on contacts + accounts (case-insensitive via _ilike).
  try {
    const data = await gql(
      'query R($email: String!) {' +
      ' Contact(where: { isDeleted: { _eq: false }, communicationChannels: { value: { _ilike: $email } } }, limit: 10) { id firstName lastName fullName }' +
      ' Account(where: { isDeleted: { _eq: false }, communicationChannels: { value: { _ilike: $email } } }, limit: 10) { id name }' +
      ' }',
      { email: rawEmail }
    );
    (data.Contact || []).forEach(function (c) { add('contact', c.id, contactName(c), 'email'); });
    (data.Account || []).forEach(function (a) { add('account', a.id, a.name || 'Unknown account', 'email'); });
  } catch (e) {
    return { success: false, error: 'Email lookup failed: ' + (e.message || String(e)) };
  }

  // Domain match on accounts (website or an account email on the same domain).
  if (domain) {
    try {
      const data = await gql(
        'query D($domainLike: String!, $emailLike: String!) {' +
        ' Account(where: { isDeleted: { _eq: false }, _or: [ { website: { _ilike: $domainLike } }, { communicationChannels: { value: { _ilike: $emailLike } } } ] }, limit: 20) { id name }' +
        ' }',
        { domainLike: '%' + domain + '%', emailLike: '%@' + domain }
      );
      (data.Account || []).forEach(function (a) { add('account', a.id, a.name || 'Unknown account', 'domain'); });
    } catch (e) { /* domain match optional */ }
  }

  // bestMatch: prefer an exact email match (contact first), else first domain match.
  let bestMatch = null;
  for (let i = 0; i < matches.length; i++) {
    if (matches[i].matchType === 'email') { bestMatch = matches[i]; if (matches[i].type === 'contact') break; }
  }
  if (!bestMatch && matches.length > 0) bestMatch = matches[0];

  return { success: true, email: rawEmail, domain: domain || null, bestMatch: bestMatch, matches: matches };
}`

export const RESOLVE_CUSTOMER_TOOL: InternalToolDefinition = {
  id: 'resolve_customer_by_email',
  name: 'Resolve Customer by Email',
  description:
    'Resolves an inbound sender email address to CRM customers: finds the contact/account with that exact email, plus accounts sharing the email domain. Returns ranked matches and a bestMatch (type + id) so you can immediately call get_customer_360 to load the full 360° snapshot for the recognized customer.',
  category: 'customer-360',
  operation: 'read',
  schema: RESOLVE_CUSTOMER_SCHEMA,
  outputSchema: RESOLVE_CUSTOMER_OUTPUT_SCHEMA,
  relatedToolIds: ['get_customer_360'],
  source: RESOLVE_CUSTOMER_SOURCE
}

export default RESOLVE_CUSTOMER_TOOL
