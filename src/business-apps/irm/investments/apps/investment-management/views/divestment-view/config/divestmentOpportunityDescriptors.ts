import type { Descriptor } from '@/common/network/graphql/queryHelpers'
import { mergeDescriptors } from '@/common/network/graphql/descriptorUtils'
import { INVESTMENT_OPPORTUNITY_DESCRIPTORS } from '@/common/data/investment/types/investmentOpportunityTypes'

/**
 * Enhanced descriptors for divestment opportunity views.
 * Adds optionSelectPaths to enable automatic filter option resolution
 * via useFilterGroups (descriptor-driven pattern).
 */
const FILTER_OPTION_DESCRIPTORS: Descriptor[] = [
  {
    key: 'opportunityPipelineStageIds',
    path: 'opportunityPipelineStageRef',
    kind: 'inIds',
    filterLabel: 'Stage',
    optionSelectPaths: [
      'opportunityPipelineStage.id',
      'opportunityPipelineStage.value',
      'opportunityPipelineStage.code'
    ],
    optionSearchPaths: ['opportunityPipelineStage.value', 'opportunityPipelineStage.code'],
    optionDistinctOn: ['opportunityPipelineStageRef']
  },
  {
    key: 'opportunityStatusIds',
    path: 'opportunityStatusRef',
    kind: 'inIds',
    filterLabel: 'Status',
    optionSelectPaths: ['opportunityStatus.id', 'opportunityStatus.value', 'opportunityStatus.code'],
    optionSearchPaths: ['opportunityStatus.value', 'opportunityStatus.code'],
    optionDistinctOn: ['opportunityStatusRef']
  },
  {
    key: 'opportunityPipelineIds',
    path: 'opportunityPipelineRef',
    kind: 'inIds',
    filterLabel: 'Pipeline',
    optionSelectPaths: ['opportunityPipeline.id', 'opportunityPipeline.value', 'opportunityPipeline.code'],
    optionSearchPaths: ['opportunityPipeline.value', 'opportunityPipeline.code'],
    optionDistinctOn: ['opportunityPipelineRef']
  },
  {
    key: 'ownerEmployeeIds',
    path: 'ownerEmployeeId',
    kind: 'inIds',
    filterLabel: 'Owner',
    optionSelectPaths: ['ownerEmployee.id', 'ownerEmployee.displayName'],
    optionSearchPaths: ['ownerEmployee.displayName', 'ownerEmployee.firstName', 'ownerEmployee.lastName'],
    optionDistinctOn: ['ownerEmployeeId']
  },
  {
    key: 'accountIds',
    path: 'opportunityAccounts.accountId',
    kind: 'inIds',
    filterLabel: 'Account',
    optionSelectPaths: ['opportunityAccounts.account.id', 'opportunityAccounts.account.name'],
    optionSearchPaths: ['opportunityAccounts.account.name']
  }
]

export const DIVESTMENT_BASE_WHERE_PARTS = ['dealType: { _eq: "DIVESTMENT_DEAL" }', 'divestmentId: { _isNull: false }']

export const DIVESTMENT_OPPORTUNITY_DESCRIPTORS: Descriptor[] = mergeDescriptors(
  INVESTMENT_OPPORTUNITY_DESCRIPTORS,
  FILTER_OPTION_DESCRIPTORS
)
