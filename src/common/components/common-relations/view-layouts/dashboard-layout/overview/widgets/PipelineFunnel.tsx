import React, { useMemo } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  IconAvatar,
} from "@newwork/nw-design-system";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@newwork/nw-design-system";
import { FunnelChart, Funnel, LabelList } from "recharts";
import { FunnelSimpleIcon } from "@phosphor-icons/react";

export interface AggregatedFunnelStage {
  stage: string;
  count: number;
  value: number;
  color?: string;
}

export interface PipelineFunnelProps {
  aggregatedFunnel: AggregatedFunnelStage[];
  title?: string;
  description?: string;
  headerIcon?: React.ReactNode;
  moduleColor?: string;
}

const formatCurrency = (amount: number, currencyCode: string = 'EUR'): string => {
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currencyCode,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  } catch (error) {
    return `${currencyCode} ${amount.toLocaleString()}`;
  }
};

const toKey = (value: string): string =>
  value
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");



// Custom label renderer for funnel elements
const renderCustomLabel = (entry: any) => {
  const { payload, count, originalValue, value: dataValue, x, y, width, height } = entry;
  // Always use originalValue if available, otherwise use the stage value from payload
  const displayValue = originalValue !== undefined ? originalValue : 
                      (payload?.originalValue !== undefined ? payload.originalValue : dataValue);
  
  return (
    <g>
      <text
        x={x + width / 2}
        y={y + height / 2 - 8}
        textAnchor="middle"
        dominantBaseline="middle"
        className="gba:fill-white gba:text-sm gba:font-bold"
        style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.5)' }}
      >
        {formatCurrency(displayValue)}
      </text>
      <text
        x={x + width / 2}
        y={y + height / 2 + 8}
        textAnchor="middle"
        dominantBaseline="middle"
        className="gba:fill-white gba:text-xs gba:opacity-90"
        style={{ textShadow: '1px 1px 2px rgba(0,0,0,0.5)' }}
      >
        {count} opp{count !== 1 ? "s" : ""}
      </text>
    </g>
  );
};

export const PipelineFunnel: React.FC<PipelineFunnelProps> = ({
  aggregatedFunnel,
  title = "All Pipeline - Current Year",
  description = "Opportunity progression by stage",
  headerIcon,
  moduleColor = 'default',
}) => {
  const dataKey = "value";
  const nameKey = "stage";

  const chartData = useMemo(() => {
    if (aggregatedFunnel.length === 0) return [];
    
    // Calculate better proportional sizing for funnel visibility
    const values = aggregatedFunnel.map(stage => stage.value).filter(v => v > 0);
    if (values.length === 0) return [];
    
    const maxValue = Math.max(...values);
    const minValue = Math.min(...values);
    
    // If the ratio is too extreme (>100:1), apply logarithmic scaling
    const shouldNormalize = maxValue > 0 && minValue > 0 && (maxValue / minValue > 100);
    
    // Preserve the original order from aggregatedFunnel (which is ordered by pipeline progression)
    return aggregatedFunnel.map((stage, index) => {
      const key = toKey(stage.stage);
      
      let visualValue = stage.value;
      if (shouldNormalize && stage.value > 0) {
        // Use square root scaling to compress extreme ratios while maintaining order
        const normalizedRatio = Math.sqrt(stage.value / maxValue);
        // Ensure minimum 20% and maximum 100% relative size
        visualValue = Math.max(maxValue * 0.2, maxValue * normalizedRatio);
      }
      
      return {
        [nameKey]: key,
        [dataKey]: visualValue,
        count: stage.count,
        originalValue: stage.value, // Keep original for labels
        originalIndex: index, // Preserve original order
        fill: `var(--color-${key})`,
        // Add payload data for the label renderer
        payload: {
          originalValue: stage.value,
          count: stage.count,
          stage: stage.stage,
        },
      } as Record<string, any>;
    });
  }, [aggregatedFunnel]);

  const chartConfig = useMemo(() => {
    const config: Record<string, { label?: string, color?: string }> = {
      [dataKey]: {},
    };
    aggregatedFunnel.forEach((stage) => {
      const key = toKey(stage.stage);
      config[key] = { label: stage.stage, color: stage.color};
    });
    return config as ChartConfig;
  }, [aggregatedFunnel]);

  return (
    <Card className="gba:h-full">
      <CardHeader className="gba:flex gba:items-center gba:gap-3">
        {headerIcon ?? (
          <IconAvatar
            icon={FunnelSimpleIcon}
            variant={moduleColor as any}
            size="md"
            decorative={true}
          />
        )}
        <div>
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        {aggregatedFunnel && aggregatedFunnel.length > 0 ? (
          <div className="gba:space-y-4">
            {/* Funnel Chart */}
            <div className="gba:relative gba:w-full gba:flex gba:justify-center">
              <ChartContainer config={chartConfig} className="gba:w-[400px] gba:h-[300px]">
                <FunnelChart width={400} height={300}>
                  <Funnel
                    data={chartData}
                    dataKey={dataKey}
                    nameKey={nameKey}
                    cx="50%"
                    cy="50%"
                    isAnimationActive={true}
                  >
                    <LabelList content={renderCustomLabel} />
                  </Funnel>
                  <ChartTooltip
                    content={<ChartTooltipContent hideLabel labelKey={dataKey} nameKey={nameKey} />}
                  />
                </FunnelChart>
              </ChartContainer>
            </div>

            {/* Stage legend */}
            <div className="gba:space-y-2 gba:mt-4">
              {aggregatedFunnel.map((stage, index) => {
                // Check if normalization was applied
                const isNormalized = chartData.length > 0 && chartData.some(item => 
                  item.originalValue !== undefined && item.originalValue !== item[dataKey]
                );
                
                return (
                  <div
                    key={stage.stage}
                    className="gba:flex gba:items-center gba:justify-between gba:text-sm"
                  >
                    <div className="gba:flex gba:items-center gba:gap-2">
                      <div
                        className="gba:w-3 gba:h-3 gba:rounded-sm"
                        style={{
                          backgroundColor:
                            stage.color || `hsl(${index * 60}, 70%, 50%)`,
                        }}
                      />
                      <span className="gba:text-gray-700">
                        {stage.stage}
                        {isNormalized && (
                          <span className="gba:text-xs gba:text-blue-500 gba:ml-1" title="Funnel sizes adjusted for visibility">*</span>
                        )}
                      </span>
                    </div>
                    <div className="gba:text-right">
                      <div className="gba:font-medium gba:text-gray-900">
                        {formatCurrency(stage.value)}
                      </div>
                      <div className="gba:text-xs gba:text-gray-500">
                        {stage.count} opp{stage.count !== 1 ? "s" : ""}
                      </div>
                    </div>
                  </div>
                );
              })}
              {/* Show normalization note if applied */}
              {chartData.length > 0 && chartData.some(item => 
                item.originalValue !== undefined && item.originalValue !== item[dataKey]
              ) && (
                <div className="gba:text-xs gba:text-gray-500 gba:italic gba:mt-2">
                  * Funnel sizes adjusted for visibility. Values show actual amounts.
                </div>
              )}
            </div>

            {/* Total summary */}
            <div className="gba:pt-4 gba:border-t gba:border-gray-200">
              <div className="gba:text-center">
                <div className="gba:text-2xl gba:font-bold gba:text-blue-600">
                  {aggregatedFunnel.reduce(
                    (sum, stage) => sum + stage.count,
                    0,
                  )}
                </div>
                <div className="gba:text-sm gba:text-gray-600 gba:mt-1">
                  Total Opportunities
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="gba:text-center gba:py-8">
            <div className="gba:text-gray-500">No funnel data available</div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default PipelineFunnel;
