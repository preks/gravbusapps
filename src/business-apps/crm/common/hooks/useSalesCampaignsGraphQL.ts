import { useState, useEffect, useCallback, useMemo } from "react";
import { useGraphqlClient } from "@/common/network/graphql/useGraphQLClient";

// Define the SalesCampaign interface
export interface SalesCampaign {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
}

export interface SalesCampaignOption {
  id: string;
  value: string;
  label: string;
  name: string;
}

export interface SalesCampaignResponse {
  SalesCampaign: SalesCampaign[];
  SalesCampaignAggregate: {
    aggregate: {
      count: number;
    };
  };
}

// GraphQL query for active sales campaigns
export const GET_ACTIVE_SALES_CAMPAIGNS = (variables: {
  offset?: number;
  limit?: number;
  search?: string;
}): string => {
  if (variables.search) {
    return `
      query GetActiveSalesCampaigns($currentDate: timestamp!, $searchTerm: String, $limit: Int, $offset: Int) {
        SalesCampaign(
          distinctOn: [name]
          limit: $limit
          offset: $offset
          where: {
            _and: [
              { startDate: { _lte: $currentDate } },
              { endDate: { _gte: $currentDate } },
              { isDeleted: { _eq: false } },
              { name: { _ilike: $searchTerm } }
            ]
          }
        ) {
          id
          name
          startDate
          endDate
        }
        SalesCampaignAggregate(
          where: {
            _and: [
              { startDate: { _lte: $currentDate } },
              { endDate: { _gte: $currentDate } },
              { isDeleted: { _eq: false } },
              { name: { _ilike: $searchTerm } }
            ]
          }
        ) {
          aggregate {
            count
          }
        }
      }
    `;
  } else {
    return `
      query GetActiveSalesCampaigns($currentDate: timestamp!, $limit: Int, $offset: Int) {
        SalesCampaign(
          distinctOn: [name]
          limit: $limit
          offset: $offset
          where: {
            _and: [
              { startDate: { _lte: $currentDate } },
              { endDate: { _gte: $currentDate } },
              { isDeleted: { _eq: false } }
            ]
          }
        ) {
          id
          name
          startDate
          endDate
        }
        SalesCampaignAggregate(
          where: {
            _and: [
              { startDate: { _lte: $currentDate } },
              { endDate: { _gte: $currentDate } },
              { isDeleted: { _eq: false } }
            ]
          }
        ) {
          aggregate {
            count
          }
        }
      }
    `;
  }
};

export const useSalesCampaignsGraphQL = (accessToken: string) => {
  const [campaigns, setCampaigns] = useState<SalesCampaign[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [totalCount, setTotalCount] = useState(0);

  const graphqlClient = useGraphqlClient(accessToken);

  // Transform campaigns to options format
  const options: SalesCampaignOption[] = useMemo(
    () =>
      campaigns.map((campaign) => ({
        id: campaign.id,
        value: campaign.id,
        label: campaign.name,
        name: campaign.name,
      })),
    [campaigns]
  );

  const fetchCampaigns = useCallback(
    async (
      searchTerm?: string,
      offset: number = 0,
      append: boolean = false
    ) => {
      if (!accessToken) {
        setError("No access token provided");
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const queryVariables = {
          offset,
          limit: 20,
          ...(searchTerm && { search: searchTerm }),
        };

        const query = GET_ACTIVE_SALES_CAMPAIGNS(queryVariables);

        // Prepare GraphQL variables for the request
        const graphqlVariables: any = {
          currentDate: new Date().toISOString().replace("Z", ""),
          limit: queryVariables.limit,
          offset,
        };

        if (searchTerm) {
          graphqlVariables.searchTerm = `%${searchTerm}%`;
        }

        const result = await graphqlClient.request<SalesCampaignResponse>(
          query,
          graphqlVariables
        );

        if (result?.SalesCampaign) {
          const newCampaigns = result.SalesCampaign || [];
          const totalCount =
            result.SalesCampaignAggregate?.aggregate?.count || 0;

          setCampaigns((prevCampaigns) =>
            append ? [...prevCampaigns, ...newCampaigns] : newCampaigns
          );

          // Calculate hasMore based on current results and total count
          const currentTotal = append
            ? campaigns.length + newCampaigns.length
            : newCampaigns.length;
          setHasMore(currentTotal < totalCount);
          setTotalCount(totalCount);
        } else {
          console.warn("No sales campaigns data in response:", result);
          setCampaigns([]);
          setHasMore(false);
          setTotalCount(0);
        }
      } catch (err) {
        console.error("Error fetching sales campaigns:", err);
        setError(err instanceof Error ? err.message : "Unknown error occurred");
        setCampaigns([]);
        setHasMore(false);
        setTotalCount(0);
      } finally {
        setLoading(false);
      }
    },
    [accessToken, graphqlClient]
  );

  const search = useCallback(
    (searchTerm?: string) => {
      fetchCampaigns(searchTerm, 0, false);
    },
    [fetchCampaigns]
  );

  const loadMore = useCallback(async () => {
    if (hasMore && !loading) {
      await fetchCampaigns(undefined, campaigns.length, true);
    }
  }, [fetchCampaigns, hasMore, loading, campaigns.length]);

  // Load initial data
  useEffect(() => {
    if (accessToken) {
      fetchCampaigns();
    }
  }, [accessToken, fetchCampaigns]);

  return {
    options,
    campaigns,
    loading,
    error,
    hasMore,
    totalCount,
    search,
    loadMore,
    refetch: () => fetchCampaigns(),
  };
};
