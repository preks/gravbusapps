import { useCatalogManagerClient } from '@/common/network/catalogs/useCatalogManagerClient'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'

// Investment Group Catalog
export const INVESTMENT_GROUP_CATALOG = 'InvestmentGroup'
export const INVESTMENT_GROUP_VERSION = 'v1'

// Investment Type Catalog
export const INVESTMENT_TYPE_CATALOG = 'InvestmentType'
export const INVESTMENT_TYPE_VERSION = 'v1'

// Investment Role Catalog
export const INVESTMENT_ROLE_CATALOG = 'InvestmentRole'
export const INVESTMENT_ROLE_VERSION = 'v1'

// Investment Stake Type Catalog
export const INVESTMENT_STAKE_TYPE_CATALOG = 'InvestmentStakeType'
export const INVESTMENT_STAKE_TYPE_VERSION = 'v1'

export const MEASUREMENT_UNIT_CATALOG = 'MeasurementUnit'
export const MEASUREMENT_UNIT_VERSION = 'v1'

export const useInvestmentGroupCatalog = (context: BusinessAppContextProps) => {
  const catalogClient = useCatalogManagerClient(context.accessToken)

  const fetchInvestmentGroups = async (params?: { limit?: number; offset?: number; search?: string }) => {
    const response = await catalogClient.getCatalogEntriesList(
      {
        catalogIdentifier: INVESTMENT_GROUP_CATALOG,
        version: INVESTMENT_GROUP_VERSION
      },
      {
        limit: params?.limit || 100,
        offset: params?.offset || 0,
        returnTotalRecords: true,
        includeChildCatalogEntries: true,
        ...(params?.search && { searchCriteria: params.search })
      }
    )
    return response
  }

  return { fetchInvestmentGroups }
}

export const useInvestmentTypeCatalog = (context: BusinessAppContextProps) => {
  const catalogClient = useCatalogManagerClient(context.accessToken)

  const fetchInvestmentTypes = async (params?: { limit?: number; offset?: number; search?: string }) => {
    const response = await catalogClient.getCatalogEntriesList(
      {
        catalogIdentifier: INVESTMENT_TYPE_CATALOG,
        version: INVESTMENT_TYPE_VERSION
      },
      {
        limit: params?.limit || 100,
        offset: params?.offset || 0,
        returnTotalRecords: true,
        includeChildCatalogEntries: true,
        ...(params?.search && { searchCriteria: params.search })
      }
    )
    return response
  }

  return { fetchInvestmentTypes }
}

export const useInvestmentRoleCatalog = (context: BusinessAppContextProps) => {
  const catalogClient = useCatalogManagerClient(context.accessToken)

  const fetchInvestmentRoles = async (params?: { limit?: number; offset?: number; search?: string }) => {
    const response = await catalogClient.getCatalogEntriesList(
      {
        catalogIdentifier: INVESTMENT_ROLE_CATALOG,
        version: INVESTMENT_ROLE_VERSION
      },
      {
        limit: params?.limit || 100,
        offset: params?.offset || 0,
        returnTotalRecords: true,
        includeChildCatalogEntries: true,
        ...(params?.search && { searchCriteria: params.search })
      }
    )
    return response
  }

  return { fetchInvestmentRoles }
}

export const useInvestmentStakeTypeCatalog = (context: BusinessAppContextProps) => {
  const catalogClient = useCatalogManagerClient(context.accessToken)

  const fetchInvestmentStakeTypes = async (params?: { limit?: number; offset?: number; search?: string }) => {
    const response = await catalogClient.getCatalogEntriesList(
      {
        catalogIdentifier: INVESTMENT_STAKE_TYPE_CATALOG,
        version: INVESTMENT_STAKE_TYPE_VERSION
      },
      {
        limit: params?.limit || 100,
        offset: params?.offset || 0,
        returnTotalRecords: true,
        includeChildCatalogEntries: true,
        ...(params?.search && { searchCriteria: params.search })
      }
    )
    return response
  }

  return { fetchInvestmentStakeTypes }
}
