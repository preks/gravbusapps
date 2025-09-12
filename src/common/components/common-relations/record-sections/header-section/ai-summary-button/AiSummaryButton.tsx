import React, { useState } from "react";
import { 
  Button, 
  Popover, 
  PopoverContent, 
  PopoverTrigger,
  Spinner,
  Icon,
  Card,
  CardHeader,
  CardTitle,
  CardContent
} from "@newwork/nw-design-system";
import { 
  ChartBarIcon, 
  LightbulbIcon, 
  ArrowClockwiseIcon 
} from "@phosphor-icons/react";
import { Bot } from "lucide-react";
import { AiSummaryButtonProps } from "./AiSummaryTypes";

/**
 * Shared AI Summary Button component that provides consistent AI summary functionality
 * across all CRM entities (investments, leads, accounts, contacts, opportunities).
 *
 * This component eliminates code duplication by providing a reusable interface
 * for any entity that implements the AiSummaryHook pattern.
 */
export const AiSummaryButton: React.FC<AiSummaryButtonProps> = ({
  config,
  summaryHook,
  dataTestId = "ai-summary-button",
  buttonText = "AI Summary",
  className = "",
}) => {
  const [aiSummaryVisible, setAiSummaryVisible] = useState(false);
  const { generateSummary, state: aiSummaryState } = summaryHook;

  // Handle AI Summary button click - auto-generate and show tooltip
  const handleAiSummaryClick = () => {
    setAiSummaryVisible(true);
    if (!aiSummaryState || !["loading", "error", "success"].includes(aiSummaryState.type)) {
      generateSummary();
    }
  };

  // Create popover content for AI Summary
  const renderAiSummaryPopover = () => {
    if (aiSummaryState?.type === "loading") {
      return (
        <div className="gba:w-96 gba:p-5">
          <div className="gba:text-center">
            <Spinner className="gba:w-8 gba:h-8 gba:mx-auto" />
            <div className="gba:mt-4 gba:text-sm gba:text-gray-800 gba:font-medium">
              {config.loadingMessage || "Generating AI Summary..."}
            </div>
            <div className="gba:mt-1.5 gba:text-xs gba:text-gray-500">
              {config.loadingSubtitle || `Analyzing ${config.entityType} data and activities`}
            </div>
          </div>
        </div>
      );
    }

    if (aiSummaryState?.type === "error") {
      return (
        <div className="gba:w-80 gba:p-5">
          <div className="gba:text-center">
            <div className="gba:text-sm gba:text-red-600 gba:mb-3">
              Unable to generate AI summary
            </div>
            <Button variant="ai" size="sm" onClick={() => generateSummary()} className="gba:text-xs">
              Try Again
            </Button>
          </div>
        </div>
      );
    }

    if (aiSummaryState?.type === "success" && aiSummaryState.content) {
      return (
        <div className="gba:w-[600px] gba:p-5">
          {/* Executive Summary */}
          <Card className="gba:mb-4 gba:!gap-1">
            <CardHeader>
              <CardTitle className="gba:flex gba:items-center gba:gap-1.5">
                <Icon icon={ChartBarIcon} size="sm" />
                Executive Summary
              </CardTitle>
            </CardHeader>
            <CardContent>
                {aiSummaryState.content.summary}
            </CardContent>
          </Card>

          {/* Key Insights */}
          {aiSummaryState.content.keyInsights && aiSummaryState.content.keyInsights.length > 0 && (
            <Card className="gba:mb-4 gba:!gap-1">
              <CardHeader>
                <CardTitle className="gba:flex gba:items-center gba:gap-1.5">
                  <Icon icon={LightbulbIcon} size="sm" />
                  Key Insights & Next Steps
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="gba:list-disc gba:ml-6">
                  {aiSummaryState.content.keyInsights.map((insight, index) => (
                    <li key={index} className="gba:mb-1">
                      {insight}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {/* Actions */}
          <div className="gba:text-center">
            <Button
              variant="ai"
              size="sm"
              onClick={() => generateSummary()}
              className="gba:flex gba:items-center"
            >
              <Icon icon={ArrowClockwiseIcon} size="sm" />
              Regenerate
            </Button>
          </div>
        </div>
      );
    }

    return (
      <div className="gba:w-80 gba:p-5 gba:text-center">
        <div className="gba:text-sm gba:text-gray-800 gba:mb-2 gba:flex gba:items-center gba:justify-center gba:gap-1.5">
          <Bot size={16} className="gba:text-gray-700" />
          AI {config.entityType.charAt(0).toUpperCase() + config.entityType.slice(1)} Summary
        </div>
        <div className="gba:text-xs gba:text-gray-500 gba:leading-tight">
          {config.emptyStateMessage ||
            `Click to generate intelligent insights about this ${config.entityType}'s performance and next steps`}
        </div>
      </div>
    );
  };

  return (
    <Popover open={aiSummaryVisible} onOpenChange={setAiSummaryVisible}>
      <PopoverTrigger asChild>
        <Button
          onClick={handleAiSummaryClick}
          variant="ai"
          disabled={aiSummaryState?.type === "loading"}
          data-testid={dataTestId}
          className={className}
        >
          <Bot size={16} />
          {aiSummaryState?.type === "loading" ? "Generating..." : buttonText}
        </Button>
      </PopoverTrigger>
      <PopoverContent 
        side="bottom" 
        align="end"
        className="gba:w-auto gba:max-w-none gba:min-w-0 gba:p-0 gba:rounded-lg gba:overflow-visible gba:shadow-xl gba:border-0"
        style={{
          background: 'linear-gradient(to bottom left, var(--nw-color-white), var(--nw-color-blue-200))'
        }}
        sideOffset={8}
        avoidCollisions={true}
        collisionPadding={20}
      >
        {renderAiSummaryPopover()}
      </PopoverContent>
    </Popover>
  );
};
