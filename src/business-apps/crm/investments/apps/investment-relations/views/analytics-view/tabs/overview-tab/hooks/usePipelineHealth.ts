import { useState, useEffect } from "react";
import { useGraphQLClient } from "@/common/network/graphql/useGraphQLClient";

export interface PipelineHealthData {
  healthScore: number;
  stageDistribution: { stage: string; count: number; value: number }[];
  pipelineDistribution: {
    pipeline: string;
    pipelineId: string;
    count: number;
    value: number;
  }[];
  avgOpportunityAge: number;
  stalledOpportunities: number;
  totalOpportunities: number;
  avgWinningChance: number;
  selectedPipeline?: string;
  isAllPipelines: boolean;
}

export const usePipelineHealth = (
  accessToken: string,
  selectedPipelineId?: string
) => {
  const [pipelineHealth, setPipelineHealth] =
    useState<PipelineHealthData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const graphqlClient = useGraphQLClient(accessToken);

  useEffect(() => {
    const fetchPipelineHealth = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const currentDate = new Date();
        const thirtyDaysAgo = new Date(
          currentDate.getTime() - 30 * 24 * 60 * 60 * 1000
        ).toISOString();

        // Build where condition for pipeline filtering
        const pipelineFilter = selectedPipelineId
          ? `opportunityPipeline: {id: {_eq: "${selectedPipelineId}"}}`
          : "";

        const baseWhere = `isDeleted: {_eq: false} ${
          pipelineFilter ? ", " + pipelineFilter : ""
        }`;
        // Simplified active opportunities filter - exclude known closed states
        const activeOppsWhere = `${baseWhere}, opportunityStatus: {code: {_nin: ["WON", "LOST"]}}`;

        const query = `
          query GetPipelineHealth {
            # All active opportunities (exclude closed states)
            allOpportunities: InvestmentOpportunity(
              where: {
                ${activeOppsWhere}
              }
            ) {
              id
              estimatedAmount
              createdAt
              closeDate
              opportunityPipelineStage {
                id
                value
              }
              opportunityPipeline {
                id
                value
              }
            }
            
            # Stalled opportunities (no update in 30 days)
            stalledOpportunities: InvestmentOpportunityAggregate(
              where: {
                ${activeOppsWhere}
                updatedAt: {_lt: "${thirtyDaysAgo}"}
              }
            ) {
              aggregate { count }
            }
          }
        `;

        const result = await graphqlClient.request(query);

        if (!result.allOpportunities) {
          throw new Error("No opportunities data received from GraphQL");
        }

        // Process all opportunities for grouping by stage
        // When no specific pipeline is selected, show all opportunities
        // When a specific pipeline is selected, only show opportunities from that pipeline
        let filteredOpportunities = result.allOpportunities;
        // Only filter if a specific pipeline is selected
        if (selectedPipelineId) {
          filteredOpportunities = result.allOpportunities;
          // Filtered to specific pipeline
        } else {
          // Showing all opportunities
        }

        // Processing opportunities data

        // Calculate average opportunity age
        const avgAge =
          filteredOpportunities.length > 0
            ? filteredOpportunities.reduce((sum: number, opp: any) => {
                const age = Math.floor(
                  (currentDate.getTime() - new Date(opp.createdAt).getTime()) /
                    (1000 * 60 * 60 * 24)
                );
                return sum + age;
              }, 0) / filteredOpportunities.length
            : 0;

        // Calculate average winning chance (exclude null values)
        const oppsWithWinChance = filteredOpportunities.filter(
          (opp: any) => opp.winningChance != null
        );
        const avgWinningChance =
          oppsWithWinChance.length > 0
            ? oppsWithWinChance.reduce(
                (sum: number, opp: any) => sum + opp.winningChance,
                0
              ) / oppsWithWinChance.length
            : 0;

        // Group opportunities by stage and calculate distribution
        const stageGroups = new Map<string, { count: number; value: number }>();
        const pipelineGroups = new Map<
          string,
          { count: number; value: number; pipelineId: string }
        >();

        filteredOpportunities.forEach((opp: any) => {
          // Group by pipeline when no specific pipeline is selected
          if (!selectedPipelineId) {
            const pipelineName = opp.opportunityPipeline?.value || "Unknown Pipeline";
            const pipelineId = opp.opportunityPipeline?.id || "unknown";
            const existing = pipelineGroups.get(pipelineName) || {
              count: 0,
              value: 0,
              pipelineId,
            };
            pipelineGroups.set(pipelineName, {
              count: existing.count + 1,
              value: existing.value + (opp.estimatedAmount || 0),
              pipelineId,
            });
          } else {
            // Group by stage when a specific pipeline is selected
            let stageName = "Unknown";
            if (opp.opportunityPipelineStage?.value) {
              stageName = opp.opportunityPipelineStage.value;
            } else if (opp.stage) {
              stageName = opp.stage
                .replace(/_/g, " ")
                .toLowerCase()
                .replace(/\b\w/g, (l: string) => l.toUpperCase());
            }

            const existing = stageGroups.get(stageName) || {
              count: 0,
              value: 0,
            };
            stageGroups.set(stageName, {
              count: existing.count + 1,
              value: existing.value + (opp.estimatedAmount || 0),
            });
          }
        });

        // Convert to arrays and limit to top 5
        const stageDistribution = selectedPipelineId
          ? Array.from(stageGroups.entries())
              .map(([stage, data]) => ({
                stage,
                count: data.count,
                value: data.value,
              }))
              .sort((a, b) => b.count - a.count)
              .slice(0, 5)
          : [];

        const pipelineDistribution = !selectedPipelineId
          ? Array.from(pipelineGroups.entries())
              .map(([pipeline, data]) => ({
                pipeline,
                pipelineId: data.pipelineId,
                count: data.count,
                value: data.value,
              }))
              .sort((a, b) => b.count - a.count)
              .slice(0, 5)
          : [];


        // Calculate health score (0-100)
        const totalOpps = filteredOpportunities.length;
        const stalledCount = result.stalledOpportunities.aggregate.count;
        const stalledRatio = totalOpps > 0 ? stalledCount / totalOpps : 0;
        const ageScore = Math.max(0, 100 - avgAge / 2); // Penalty for old opportunities
        const winChanceScore = avgWinningChance;
        const activityScore = Math.max(0, 100 - stalledRatio * 100);

        const healthScore =
          totalOpps > 0
            ? Math.round((ageScore + winChanceScore + activityScore) / 3)
            : 0;

        const healthData = {
          healthScore,
          stageDistribution,
          pipelineDistribution,
          avgOpportunityAge: Math.round(avgAge),
          stalledOpportunities: stalledCount,
          totalOpportunities: totalOpps,
          avgWinningChance: Math.round(avgWinningChance),
          selectedPipeline: selectedPipelineId,
          isAllPipelines: !selectedPipelineId,
        };

        setPipelineHealth(healthData);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
        setPipelineHealth(null);
      } finally {
        setIsLoading(false);
      }
    };

    if (accessToken) {
      fetchPipelineHealth();
    }
  }, [accessToken, graphqlClient, selectedPipelineId]);

  return { pipelineHealth, isLoading, error };
};
