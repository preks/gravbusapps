import { SalesCampaignQueryVariables } from '../types/SalesCampaignTypes';

export const GET_SALES_CAMPAIGNS = (variables: SalesCampaignQueryVariables): { query: string; variables: any } => {
  const { limit = 20, offset = 0, search, orderBy } = variables;
  
  let whereCondition: any = { isDeleted: { _eq: false } };
  if (search?.trim()) {
    whereCondition = {
      _and: [
        { isDeleted: { _eq: false } },
        {
          _or: [
            { name: { _ilike: `%${search.trim()}%` } },
            { description: { _ilike: `%${search.trim()}%` } }
          ]
        }
      ]
    };
  }

  const query = `
    query GetSalesCampaigns($where: SalesCampaignBoolExp, $orderBy: [SalesCampaignOrderBy!], $limit: Int, $offset: Int) {
      SalesCampaign(
        where: $where
        orderBy: $orderBy
        limit: $limit
        offset: $offset
      ) {
        id
        name
        description
        createdAt
        createdBy
        updatedAt
        updatedBy
        version
        startDate
        endDate
        type {
          id
          value
          code
        }
        typeRef
        isDeleted
        recordState
      }
    }
  `;

  return { 
    query, 
    variables: {
      where: whereCondition,
      orderBy: orderBy || [{ createdAt: 'DESC' }],
      limit: limit,
      offset: offset
    }
  };
};

export const GET_SALES_CAMPAIGNS_WITH_COUNT = (variables: SalesCampaignQueryVariables): { query: string; variables: any } => {
  const { limit = 20, offset = 0, search, orderBy, campaignTypes, startDateAfter, startDateBefore, endDateAfter, endDateBefore, createdAfter, createdBefore } = variables;
  
  let whereCondition: any = { isDeleted: { _eq: false } };
  
  // Build where conditions
  const conditions: any[] = [{ isDeleted: { _eq: false } }];
  
  // Search condition
  if (search?.trim()) {
    conditions.push({
      _or: [
        { name: { _ilike: `%${search.trim()}%` } },
        { description: { _ilike: `%${search.trim()}%` } }
      ]
    });
  }
  
  // Campaign type filter
  if (campaignTypes && campaignTypes.length > 0) {
    conditions.push({
      typeRef: { _in: campaignTypes }
    });
  }
  
  // Date range filters
  if (createdAfter) {
    conditions.push({
      createdAt: { _gte: createdAfter }
    });
  }
  
  if (createdBefore) {
    conditions.push({
      createdAt: { _lte: createdBefore }
    });
  }
  
  // Start date filters
  if (startDateAfter) {
    conditions.push({
      startDate: { _gte: startDateAfter }
    });
  }
  
  if (startDateBefore) {
    conditions.push({
      startDate: { _lte: startDateBefore }
    });
  }
  
  // End date filters
  if (endDateAfter) {
    conditions.push({
      endDate: { _gte: endDateAfter }
    });
  }
  
  if (endDateBefore) {
    conditions.push({
      endDate: { _lte: endDateBefore }
    });
  }
  
  if (conditions.length > 1) {
    whereCondition = { _and: conditions };
  } else {
    whereCondition = conditions[0];
  }

  const query = `
    query GetSalesCampaignsWithCount(
      $where: SalesCampaignBoolExp, 
      $orderBy: [SalesCampaignOrderBy!], 
      $limit: Int, 
      $offset: Int,
      $countWhere: SalesCampaignBoolExp
    ) {
      SalesCampaign(
        where: $where
        orderBy: $orderBy
        limit: $limit
        offset: $offset
      ) {
        id
        name
        description
        createdAt
        createdBy
        updatedAt
        updatedBy
        version
        startDate
        endDate
        type {
          id
          value
          code
        }
        typeRef
        isDeleted
        recordState
      }
      SalesCampaignAggregate(
        where: $countWhere
      ) {
        aggregate {
          count
        }
      }
    }
  `;

  return { 
    query, 
    variables: {
      where: whereCondition,
      orderBy: orderBy || [{ createdAt: 'DESC' }],
      limit: limit,
      offset: offset,
      countWhere: whereCondition
    }
  };
};

export const GET_SALES_CAMPAIGN_STATISTICS = (): string => {
  return `
    query GetSalesCampaignStatistics {
      totalCampaigns: SalesCampaignAggregate(where: { isDeleted: { _eq: false } }) {
        aggregate {
          count
        }
      }
      activeCampaigns: SalesCampaignAggregate(
        where: { 
          _and: [
            { isDeleted: { _eq: false } },
            { startDate: { _lte: "now()" } },
            { endDate: { _gte: "now()" } }
          ]
        }
      ) {
        aggregate {
          count
        }
      }
      completedCampaigns: SalesCampaignAggregate(
        where: { 
          _and: [
            { isDeleted: { _eq: false } },
            { endDate: { _lt: "now()" } }
          ]
        }
      ) {
        aggregate {
          count
        }
      }
      campaignsWithDuration: SalesCampaign(
        where: { 
          _and: [
            { isDeleted: { _eq: false } },
            { startDate: { _isNull: false } },
            { endDate: { _isNull: false } }
          ]
        }
      ) {
        startDate
        endDate
      }
    }
  `;
};

export const GET_UNIQUE_CAMPAIGN_TYPES = (): string => {
  return `
    query GetUniqueCampaignTypes {
      SalesCampaign(
        where: { 
          _and: [
            { isDeleted: { _eq: false } },
            { typeRef: { _isNull: false } }
          ]
        }
        distinct_on: [typeRef]
      ) {
        typeRef
        type {
          id
          value
          code
        }
      }
    }
  `;
}; 