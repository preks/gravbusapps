import React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@newwork/nw-design-system";
import { IconAvatar } from "@newwork/nw-design-system";
import { FunnelSimpleIcon } from "@phosphor-icons/react";
import { SupportedVariant } from "@/common/constants/ui";

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
  variant?: SupportedVariant;
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

export const PipelineFunnel: React.FC<PipelineFunnelProps> = ({
  aggregatedFunnel,
  title = "All Pipeline - Current Year",
  description = "Opportunity progression by stage",
  headerIcon,
  variant = 'default',
}) => {
  return (
    <Card className="gba:h-full">
      <CardHeader className="gba:flex gba:items-center gba:gap-3">
        {headerIcon ?? (
          <IconAvatar
            icon={FunnelSimpleIcon}
            variant={variant}
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
            {/* Funnel visualization */}
            <div className="gba:relative gba:flex gba:flex-col gba:items-center gba:space-y-2">
              {aggregatedFunnel.map((stage, index) => {
                const maxValue = Math.max(
                  ...aggregatedFunnel.map((s) => s.value),
                );
                const widthPercentage = (stage.value / maxValue) * 100;
                const actualWidth = Math.max(widthPercentage, 20);

                return (
                  <div
                    key={stage.stage}
                    className="gba:relative gba:cursor-pointer gba:transition-all gba:duration-200 hover:gba:scale-105"
                    style={{
                      width: `${actualWidth}%`,
                      minWidth: "120px",
                      height: "50px",
                      backgroundColor: stage.color || `hsl(${index * 60}, 70%, 50%)`,
                      clipPath:
                        index === 0
                          ? "polygon(0 0, 100% 0, 95% 100%, 5% 100%)"
                          : index === aggregatedFunnel.length - 1
                            ? "polygon(5% 0, 95% 0, 90% 100%, 10% 100%)"
                            : "polygon(5% 0, 95% 0, 90% 100%, 10% 100%)",
                      borderRadius: "4px",
                    }}
                  >
                    <div className="gba:absolute gba:inset-0 gba:flex gba:flex-col gba:items-center gba:justify-center gba:text-white gba:text-center gba:px-2">
                      <div className="gba:text-sm gba:font-bold">
                        {formatCurrency(stage.value)}
                      </div>
                      <div className="gba:text-xs gba:opacity-90">
                        {stage.count} opp{stage.count !== 1 ? "s" : ""}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Stage legend */}
            <div className="gba:space-y-2 gba:mt-4">
              {aggregatedFunnel.map((stage, index) => (
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
                    <span className="gba:text-gray-700">{stage.stage}</span>
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
              ))}
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
