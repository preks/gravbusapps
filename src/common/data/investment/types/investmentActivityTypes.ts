import {
  type Activity,
  ActivityFields,
  ActivityFormFields,
  createActivityDescriptors
} from '@/common/data/relations/types/activityTypes'
import type { Investment } from './investmentTypes'
import type { Descriptor } from '@/common/network/graphql/queryHelpers'
import type { InvestmentAccount } from './investmentAccountTypes'
import type { InvestmentContact } from './investmentContactTypes'
import type { InvestmentDocument } from './investmentDocumentTypes'
import type { InvestmentLead } from './investmentLeadTypes'
import type { InvestmentOpportunity } from './investmentOpportunityTypes'
import { buildPayload } from '@/common/data/common/utils/payloadBuilder'

export interface InvestmentActivity extends Activity {
  account?: InvestmentAccount
  contact?: InvestmentContact
  documents?: InvestmentDocument[]
  investment?: Investment
  investmentId?: string
  opportunity?: InvestmentOpportunity
  lead?: InvestmentLead

  /**
   * @deprecated TODO: Use documents instead
   */
  investmentDocument?: InvestmentDocument[]
}

/**
 * Investment Activity Query Field Mapping
 * IRM uses same field names as Common, so we use ActivityFields directly
 */
export const InvestmentActivityFields = {
  ...ActivityFields,
  investment: 'investment',
  invesmtentId: 'investmentId'
}

export const InvestmentActivityFormFields = {
  ...ActivityFormFields,
  investmentId: 'investment'
}

/**
 * Investment Activity Descriptors
 * Uses createActivityDescriptors with InvestmentActivityFields mapping
 */
export const INVESTMENT_ACTIVITY_DESCRIPTORS: Descriptor[] = [...createActivityDescriptors(InvestmentActivityFields)]

/**
 * Build Investment Activity Payload
 * Uses buildPayload utility with InvestmentActivityFormFields mapping
 */
export const buildInvestmentActivityPayload = (activity: Partial<InvestmentActivity> & Record<string, any>) => {
  // Build base payload using buildPayload utility
  const payload = buildPayload(activity, InvestmentActivityFormFields)

  return {
    investmentActivity: payload
  }
}
