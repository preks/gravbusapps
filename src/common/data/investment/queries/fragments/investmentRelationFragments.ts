/**
 * Investment Relation Fragments - RE-EXPORT ONLY
 *
 * This file re-exports fragments from the centralized fragment files.
 * ALL fragments are now defined in two central files:
 * - investmentReferenceFragments.ts (REF fragments)
 * - investmentFragments.ts (Main fragments with relations)
 *
 * IMPORT ORDER IS CRITICAL:
 * 1. First: investmentReferenceFragments.ts (REF fragments)
 * 2. Then: investmentFragments.ts (Main fragments)
 */

// ============================================================================
// REF Fragments (from investmentReferenceFragments.ts)
// ============================================================================
export {
  // Core entity REFs
  INVESTMENT_ACCOUNT_REF,
  INVESTMENT_CONTACT_REF,
  INVESTMENT_LEAD_REF,
  INVESTMENT_OPPORTUNITY_REF,
  INVESTMENT_TASK_REF,
  INVESTMENT_ACTIVITY_REF,
  INVESTMENT_DOCUMENT_REF,
  INVESTMENT_NOTE_REF,
  INVESTMENT_REPORT_REF,
  INVESTMENT_REF,

  // Investment specialization REFs
  EQUITY_INVESTMENT_REF,
  REAL_ESTATE_INVESTMENT_REF,
  LIQUID_FUND_INVESTMENT_REF,

  // Backward compatibility re-exports
  INVESTMENT_COMMUNICATION_CHANNEL,
  INVESTMENT_ADDRESS
} from './investmentReferenceFragments'

// ============================================================================
// Main Fragments (from investmentFragments.ts)
// ============================================================================
export {
  // Core entity main fragments
  INVESTMENT_ACCOUNT,
  INVESTMENT_CONTACT,
  INVESTMENT_LEAD,
  INVESTMENT_OPPORTUNITY,
  INVESTMENT_TASK,
  INVESTMENT_ACTIVITY,
  INVESTMENT_DOCUMENT,
  INVESTMENT_NOTE,
  INVESTMENT,

  // Investment specialization main fragments
  EQUITY_INVESTMENT,
  REAL_ESTATE_INVESTMENT,
  LIQUID_FUND_INVESTMENT
} from './investmentFragments'
