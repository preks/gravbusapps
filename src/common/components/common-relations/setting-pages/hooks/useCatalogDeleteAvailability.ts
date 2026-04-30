import { useCallback } from 'react'
import { useGraphQLClient } from '@/common/network/graphql/useGraphQLClient'
import type { CatalogItem, DeleteAvailability, DeleteAvailabilityResolver } from '../types/catalogTypes'

interface CatalogUsageCheckSpec {
  table: string
  refField: string
  label: string
}

type UsageCheckResponse = Record<string, { aggregate: { count: number } }>

const CATALOG_USAGE_SPECS: Record<string, CatalogUsageCheckSpec[]> = {
  CustomerOpportunityForecast: [
    { table: 'OpportunityAggregate', refField: 'opportunityForecastRef', label: 'opportunities' }
  ],
  SalesOpportunityStatus: [{ table: 'OpportunityAggregate', refField: 'opportunityStatusRef', label: 'opportunities' }],
  SalesLeadRating: [{ table: 'LeadAggregate', refField: 'leadRatingRef', label: 'leads' }],
  SalesLeadStatus: [{ table: 'LeadAggregate', refField: 'leadStatusRef', label: 'leads' }],
  SalesLeadSource: [{ table: 'LeadAggregate', refField: 'leadSourceRef', label: 'leads' }],
  CustomerAccountPriority: [{ table: 'AccountAggregate', refField: 'accountPriorityRef', label: 'accounts' }],
  CustomerAccountType: [
    { table: 'OpportunityAccountAggregate', refField: 'accountTypeRef', label: 'opportunity account links' }
  ],
  SalesActivityType: [{ table: 'SalesActivityAggregate', refField: 'activityTypeRef', label: 'activities' }],
  SalesTaskType: [
    { table: 'SalesTaskAggregate', refField: 'typeRef', label: 'tasks' },
    { table: 'SalesTaskTemplateAggregate', refField: 'typeRef', label: 'task templates' }
  ],
  SalesTaskPriority: [
    { table: 'SalesTaskAggregate', refField: 'priorityRef', label: 'tasks' },
    { table: 'SalesTaskTemplateAggregate', refField: 'priorityRef', label: 'task templates' }
  ],
  CustomerCampaignType: [{ table: 'SalesCampaignAggregate', refField: 'typeRef', label: 'campaigns' }],
  SalesDocumentGroup: [{ table: 'CrmDocumentAggregate', refField: 'documentGroupRef', label: 'documents' }],
  SalesDocumentType: [{ table: 'CrmDocumentAggregate', refField: 'documentTypeRef', label: 'documents' }],
  SalesPipelineStageCondition: [
    {
      table: 'OpportunityStageConditionAggregate',
      refField: 'salesPipelineStageConditionRef',
      label: 'opportunity stage conditions'
    }
  ],
  InvestmentOpportunityStatus: [
    { table: 'InvestmentOpportunityAggregate', refField: 'opportunityStatusRef', label: 'opportunities' }
  ],
  InvestmentOpportunityForecast: [
    { table: 'InvestmentOpportunityAggregate', refField: 'opportunityForecastRef', label: 'opportunities' }
  ],
  InvestmentLeadRating: [{ table: 'InvestmentLeadAggregate', refField: 'leadRatingRef', label: 'leads' }],
  InvestmentLeadStatus: [{ table: 'InvestmentLeadAggregate', refField: 'leadStatusRef', label: 'leads' }],
  InvestmentLeadSource: [{ table: 'InvestmentLeadAggregate', refField: 'leadSourceRef', label: 'leads' }],
  InvestmentAccountPriority: [
    { table: 'InvestmentAccountAggregate', refField: 'accountPriorityRef', label: 'accounts' }
  ],
  InvestmentAccountType: [
    { table: 'InvestmentOpportunityAccountAggregate', refField: 'accountTypeRef', label: 'opportunity account links' },
    {
      table: 'InvestmentInvestmentAccountAggregate',
      refField: 'investmentAccountTypeRef',
      label: 'investment account links'
    }
  ],
  InvestmentActivityType: [{ table: 'InvestmentActivityAggregate', refField: 'activityTypeRef', label: 'activities' }],
  InvestmentTaskType: [
    { table: 'InvestmentTaskAggregate', refField: 'typeRef', label: 'tasks' },
    { table: 'InvestmentTaskTemplateAggregate', refField: 'typeRef', label: 'task templates' }
  ],
  InvestmentTaskPriority: [
    { table: 'InvestmentTaskAggregate', refField: 'priorityRef', label: 'tasks' },
    { table: 'InvestmentTaskTemplateAggregate', refField: 'priorityRef', label: 'task templates' }
  ],
  InvestmentGroup: [
    { table: 'InvestmentAggregate', refField: 'investmentGroupRef', label: 'investments' },
    { table: 'InvestmentLeadAggregate', refField: 'investmentGroupRef', label: 'leads' },
    { table: 'InvestmentOpportunityAggregate', refField: 'investmentGroupRef', label: 'opportunities' },
    { table: 'InvestmentTaskTemplateAggregate', refField: 'investmentGroupRef', label: 'task templates' }
  ],
  InvestmentType: [
    { table: 'InvestmentAggregate', refField: 'investmentTypeRef', label: 'investments' },
    { table: 'InvestmentLeadAggregate', refField: 'investmentTypeRef', label: 'leads' },
    { table: 'InvestmentOpportunityAggregate', refField: 'investmentTypeRef', label: 'opportunities' },
    { table: 'InvestmentTaskTemplateAggregate', refField: 'investmentTypeRef', label: 'task templates' }
  ],
  InvestmentLiquidFundType: [
    {
      table: 'LiquidFundInvestmentAggregate',
      refField: 'investmentLiquidFundTypeRef',
      label: 'liquid fund investments'
    },
    {
      table: 'LiquidFundInvestmentReportAggregate',
      refField: 'investmentLiquidFundTypeRef',
      label: 'liquid fund investment reports'
    }
  ],
  InvestmentStatus: [
    { table: 'InvestmentAggregate', refField: 'investmentStatusRef', label: 'investments' },
    { table: 'InvestmentReportAggregate', refField: 'investmentStatusRef', label: 'investment reports' }
  ],
  InvestmentRole: [
    { table: 'InvestmentRoleAggregate', refField: 'investmentRoleRef', label: 'investment roles' },
    { table: 'InvestmentRoleReportAggregate', refField: 'investmentRoleRef', label: 'investment report roles' }
  ],
  InvestmentStakeType: [
    { table: 'InvestmentAggregate', refField: 'investmentStakeTypeRef', label: 'investments' },
    { table: 'InvestmentReportAggregate', refField: 'investmentStakeTypeRef', label: 'investment reports' }
  ],
  InvestmentDocumentGroup: [{ table: 'InvestmentDocumentAggregate', refField: 'documentGroupRef', label: 'documents' }],
  InvestmentDocumentType: [{ table: 'InvestmentDocumentAggregate', refField: 'documentTypeRef', label: 'documents' }],
  InvestmentOpportunityPipelineStageCondition: [
    {
      table: 'InvestmentOpportunityStageConditionAggregate',
      refField: 'opportunityPipelineStageConditionRef',
      label: 'opportunity stage conditions'
    }
  ]
}

const normalizeCatalogIdentifier = (catalogIdentifier: string) => catalogIdentifier.split(':')[0]

export const getCatalogUsageCheckSpecs = (catalogIdentifier: string): CatalogUsageCheckSpec[] =>
  CATALOG_USAGE_SPECS[normalizeCatalogIdentifier(catalogIdentifier)] ?? []

const buildUsageCheckQuery = (specs: CatalogUsageCheckSpec[]) => `
  query CheckCatalogEntryUsage($entryId: String!) {
    ${specs
      .map(
        (spec, index) => `
          usage${index}: ${spec.table}(
            where: {
              isDeleted: { _eq: false }
              ${spec.refField}: { _eq: $entryId }
            }
          ) {
            aggregate {
              count
            }
          }
        `
      )
      .join('\n')}
  }
`

const getVerificationBlockedAvailability = (itemType: string): DeleteAvailability => ({
  status: 'blocked',
  reason: `Unable to verify whether this ${itemType.toLowerCase()} can be deleted.`
})

export const useCatalogDeleteAvailability = (
  accessToken: string | undefined,
  itemType: string,
  specs: CatalogUsageCheckSpec[]
): DeleteAvailabilityResolver<CatalogItem> => {
  const graphqlClient = useGraphQLClient(accessToken)

  return useCallback(
    async (item: CatalogItem): Promise<DeleteAvailability> => {
      if (specs.length === 0) {
        return { status: 'allowed' }
      }

      if (!accessToken) {
        return getVerificationBlockedAvailability(itemType)
      }

      try {
        const result = await graphqlClient.request<UsageCheckResponse>(buildUsageCheckQuery(specs), {
          entryId: item.id
        })
        const usages = specs
          .map((spec, index) => ({
            label: spec.label,
            count: result[`usage${index}`]?.aggregate?.count ?? 0
          }))
          .filter(usage => usage.count > 0)

        if (usages.length === 0) {
          return { status: 'allowed' }
        }

        return {
          status: 'blocked',
          reason: `${itemType} "${item.value}" is currently in use and cannot be deleted.`,
          usages
        }
      } catch (error) {
        console.error('Failed to check catalog entry delete availability:', error)
        return getVerificationBlockedAvailability(itemType)
      }
    },
    [accessToken, graphqlClient, itemType, specs]
  )
}
