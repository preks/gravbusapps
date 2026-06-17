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
  investmentId: 'investmentId'
}

export const InvestmentActivityFormFields = {
  ...ActivityFormFields,
  investmentId: 'investment'
}

/**
 * Investment Activity Descriptors
 * Uses createActivityDescriptors with InvestmentActivityFields mapping
 * Note: InvestmentOpportunity doesn't have a 'description' field, so we override the opportunity descriptor
 * Also adds investment-specific descriptor for IRM
 */
export const INVESTMENT_ACTIVITY_DESCRIPTORS: Descriptor[] = [
  ...createActivityDescriptors(InvestmentActivityFields).map(descriptor => {
    // Override opportunity descriptor to remove description field (IRM doesn't have it)
    if (descriptor.key === 'opportunity') {
      return {
        ...descriptor,
        searchPaths: [`${InvestmentActivityFields.opportunity}.name`] // Only name, no description
      }
    }
    // IRM activities can also reference an Investment, so the composite "Reference" column must
    // search the investment name too (CRM has no investment relation, so the shared descriptor
    // intentionally omits it).
    if (descriptor.key === 'reference') {
      return {
        ...descriptor,
        searchPaths: [...(descriptor.searchPaths ?? []), `${InvestmentActivityFields.investment}.name`]
      }
    }
    return descriptor
  }),
  // Add investment descriptor (IRM-specific)
  {
    key: 'investment',
    searchPaths: [`${InvestmentActivityFields.investment}.name`, `${InvestmentActivityFields.investment}.code`],
    sortPath: `${InvestmentActivityFields.investment}.name`,
    type: 'text'
  },
  // Add investment ID filter
  {
    key: 'investmentIds',
    path: InvestmentActivityFields.investmentId,
    kind: 'inIds'
  }
]

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
