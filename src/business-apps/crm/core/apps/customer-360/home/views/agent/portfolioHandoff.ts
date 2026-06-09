/**
 * Customer360 portfolio → Every Fabric / Every AI handoff.
 *
 * Builds a book-of-business briefing payload: a user-visible prompt asking the
 * Customer 360 Analyst to triage the portfolio, plus a compact, PII-safe
 * context block (aggregate counts + the top attention rows by type/id/score —
 * never names or free text).
 */

import { getDefaultSkillsForPage } from '@/business-apps/platform/apps/every-ai/utils/pageSkills'
import type { CustomerPortfolioRow, CustomerPortfolioStats } from '../../../data/portfolio/types'

export interface PortfolioHandoffPayload {
  prompt: string
  additionInfo: string
  skills: string[]
}

const CUSTOMER_360_ENTITY_NAME = 'customer_360'
const TOP_ATTENTION_LIMIT = 10

function statsLines(stats: CustomerPortfolioStats): string[] {
  const lines = [
    `- Total customers: ${stats.totalCustomers}`,
    `- Accounts: ${stats.totalAccounts}`,
    `- Contacts: ${stats.totalContacts}`,
    `- Needs attention: ${stats.needsAttention}`,
    `- Unassigned: ${stats.unassigned}`
  ]
  if (typeof stats.avgCsat === 'number') lines.push(`- Avg CSAT: ${stats.avgCsat}`)
  if (typeof stats.overdueTotal === 'number') lines.push(`- Overdue total: ${stats.overdueTotal}`)
  return lines
}

export function buildPortfolioHandoff(
  rows: CustomerPortfolioRow[],
  stats: CustomerPortfolioStats
): PortfolioHandoffPayload {
  const skills = getDefaultSkillsForPage({ type: 'overview', entity_name: CUSTOMER_360_ENTITY_NAME })

  const topRows = rows
    .filter(row => row.attentionReasons.length > 0)
    .slice(0, TOP_ATTENTION_LIMIT)
    .map(row => `- ${row.type}:${row.id} (score ${row.attentionScore}; ${row.attentionReasons.join(', ')})`)

  const prompt =
    'Triage my customer portfolio. Rank the customers that most need attention, ' +
    'explain why, and recommend the next best action for each. ' +
    'Use the getCustomer360 tool with the customerType and customerId for any customer you want to inspect in depth.'

  const additionInfo = [
    'Customer 360 portfolio context',
    ...statsLines(stats),
    topRows.length > 0 ? '\nTop attention (type:id, score, reasons):' : '',
    ...topRows
  ]
    .filter(Boolean)
    .join('\n')

  return { prompt, additionInfo, skills }
}
