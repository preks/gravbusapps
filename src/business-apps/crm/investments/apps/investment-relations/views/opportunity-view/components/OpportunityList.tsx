import React, { useCallback } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Button,
  Spinner,
  Card,
  CardContent,
  Avatar,
  AvatarImage,
  AvatarFallback,
  Badge,
} from "@newwork/nw-design-system";
import {
  Building2,
  Calendar,
} from "lucide-react";
import { BusinessAppContextProps } from "@/common/BusinessAppContext";
import type { InvestmentOpportunity } from "@/common/data/investment/types";
import { AppActionButton } from "@/components/app-action-button/AppActionButton";
import { FlowContextName } from "@/common/types/FlowRegistryTypes";
import { formatDate } from "../utils";
import { navigateTo } from "@/common/utils/navigationUtils";

export interface OpportunityListProps extends BusinessAppContextProps {
  opportunities: InvestmentOpportunity[];
  isLoading?: boolean;
  totalCount: number;
  currentPage: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onSort: (field: string) => void;
  sortField: string;
  sortOrder: "ASC" | "DESC";
}

export const OpportunityList: React.FC<OpportunityListProps> = ({
  opportunities,
  isLoading = false,
  totalCount,
  currentPage,
  pageSize,
  onPageChange,
  onSort,
  sortField,
  sortOrder,
  ...context
}) => {
  const { accessToken } = context;

  // Handle row click to navigate to opportunity record
  const handleRowClick = useCallback((opportunityId: string) => {
    navigateTo(
      `/platform/irm/opportunity-record?opportunityId=${opportunityId}`
    );
  }, []);

  // Helper function to get owner display name
  const getOwnerName = (opportunity: InvestmentOpportunity) => {
    if (opportunity.ownerEmployee?.displayName) {
      return opportunity.ownerEmployee.displayName;
    }
    if (
      opportunity.ownerEmployee?.firstName ||
      opportunity.ownerEmployee?.lastName
    ) {
      return `${opportunity.ownerEmployee.firstName || ""} ${
        opportunity.ownerEmployee.lastName || ""
      }`.trim();
    }
    return "-";
  };

  // Helper function to get stage color based on alternativeCode
  const getStageColor = (alternativeCode?: string): "default" | "secondary" | "destructive" | "outline" | "success" | "warning" | "info" => {
    if (!alternativeCode) return "outline";
    
    switch (alternativeCode.toUpperCase()) {
      case "DISCOVERY":
        return "info"; // Blue color for early stage
      case "QUALIFICATION":
        return "warning"; // Orange color for qualifying stage
      case "NEGOTIATION":
        return "secondary"; // Purple color for active negotiation
      case "CLOSED_WON":
        return "success"; // Green color for success
      case "CLOSED_LOST":
        return "destructive"; // Red color for failed
      default:
        return "outline"; // Default gray
    }
  };

  // Helper function to get status color based on alternativeCode
  const getStatusColor = (alternativeCode?: string): "default" | "secondary" | "destructive" | "outline" | "success" | "warning" | "info" => {
    if (!alternativeCode) return "outline";
    
    switch (alternativeCode.toUpperCase()) {
      case "ACTIVE":
      case "IN_PROGRESS":
      case "OPEN":
        return "info"; // Blue color for active opportunities
      case "WON":
      case "CLOSED_WON":
      case "SUCCESS":
        return "success"; // Green color for successful opportunities
      case "LOST":
      case "CLOSED_LOST":
      case "FAILED":
        return "destructive"; // Red color for failed opportunities
      case "ON_HOLD":
      case "PAUSED":
        return "warning"; // Orange color for paused opportunities
      case "QUALIFIED":
        return "secondary"; // Purple color for qualified opportunities
      default:
        return "outline"; // Default gray
    }
  };



  // Removed unused full currency formatter; using number + fixed-width currency suffix approach

  // Extract currency symbol and numeric part separately for alignment
  const getCurrencySymbol = (currencyCode?: string): string => {
    try {
      const code = currencyCode || "EUR";
      const parts = new Intl.NumberFormat(undefined, {
        style: "currency",
        currency: code,
        currencyDisplay: "narrowSymbol",
      }).formatToParts(0);
      return parts.find((p) => p.type === "currency")?.value || code;
    } catch {
      return "€";
    }
  };

  const formatCurrencyNumberOnly = (
    amount: number,
    currencyCode?: string
  ): string => {
    try {
      const code = currencyCode || "EUR";
      const parts = new Intl.NumberFormat(undefined, {
        style: "currency",
        currency: code,
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
      }).formatToParts(amount);
      return parts
        .filter((p) => p.type !== "currency")
        .map((p) => p.value)
        .join("");
    } catch {
      return new Intl.NumberFormat(undefined, {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
      }).format(amount);
    }
  };

  // Loading state
  if (isLoading && opportunities.length === 0) {
    return (
      <div className="gba:flex gba:items-center gba:justify-center gba:h-64">
        <Spinner size="lg" />
      </div>
    );
  }

  // Error state
  // Error state handled by parent view

  return (
    <div data-testid="investment-opportunities-list">
      {/* Table */}
      <Card>
        <CardContent className="gba:p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead
                  className="gba:cursor-pointer gba:hover:gba:bg-gray-50"
                  onClick={() => onSort("name")}
                >
                  <div className="gba:flex gba:items-center gba:gap-2">
                    Opportunity
                    {sortField === "name" && (
                      <span>{sortOrder === "ASC" ? "↑" : "↓"}</span>
                    )}
                  </div>
                </TableHead>
                <TableHead
                  className="gba:cursor-pointer gba:hover:gba:bg-gray-50"
                  onClick={() => onSort("estimatedAmount")}
                >
                  <div className="gba:flex gba:items-center gba:gap-2">
                    Amount
                    {sortField === "estimatedAmount" && (
                      <span>{sortOrder === "ASC" ? "↑" : "↓"}</span>
                    )}
                    <span className="gba:inline-block gba:w-[5ch]" aria-hidden="true"></span>
                  </div>
                </TableHead>

                <TableHead
                  className="gba:cursor-pointer gba:hover:gba:bg-gray-50"
                  onClick={() => onSort("opportunityPipeline")}
                >
                  <div className="gba:flex gba:items-center gba:gap-2">
                    Pipeline
                    {sortField === "opportunityPipeline" && (
                      <span>{sortOrder === "ASC" ? "↑" : "↓"}</span>
                    )}
                  </div>
                </TableHead>
                <TableHead
                  className="gba:cursor-pointer gba:hover:gba:bg-gray-50"
                  onClick={() => onSort("opportunityPipelineStage")}
                >
                  <div className="gba:flex gba:items-center gba:gap-2">
                    Stage
                    {sortField === "opportunityPipelineStage" && (
                      <span>{sortOrder === "ASC" ? "↑" : "↓"}</span>
                    )}
                  </div>
                </TableHead>
                <TableHead
                  className="gba:cursor-pointer gba:hover:gba:bg-gray-50"
                  onClick={() => onSort("opportunityStatus")}
                >
                  <div className="gba:flex gba:items-center gba:gap-2">
                    Status
                    {sortField === "opportunityStatus" && (
                      <span>{sortOrder === "ASC" ? "↑" : "↓"}</span>
                    )}
                  </div>
                </TableHead>
                <TableHead
                  className="gba:cursor-pointer gba:hover:gba:bg-gray-50"
                  onClick={() => onSort("closeDate")}
                >
                  <div className="gba:flex gba:items-center gba:gap-2">
                    Close Date
                    {sortField === "closeDate" && (
                      <span>{sortOrder === "ASC" ? "↑" : "↓"}</span>
                    )}
                  </div>
                </TableHead>
                <TableHead
                  className="gba:cursor-pointer gba:hover:gba:bg-gray-50"
                  onClick={() => onSort("accountId")}
                >
                  <div className="gba:flex gba:items-center gba:gap-2">
                    Account
                    {sortField === "accountId" && (
                      <span>{sortOrder === "ASC" ? "↑" : "↓"}</span>
                    )}
                  </div>
                </TableHead>
                <TableHead
                  className="gba:cursor-pointer gba:hover:gba:bg-gray-50"
                  onClick={() => onSort("ownerEmployeeId")}
                >
                  <div className="gba:flex gba:items-center gba:gap-2">
                    Owner
                    {sortField === "ownerEmployeeId" && (
                      <span>{sortOrder === "ASC" ? "↑" : "↓"}</span>
                    )}
                  </div>
                </TableHead>
                <TableHead
                  className="gba:cursor-pointer gba:hover:gba:bg-gray-50"
                  onClick={() => onSort("createdAt")}
                >
                  <div className="gba:flex gba:items-center gba:gap-2">
                    Created
                    {sortField === "createdAt" && (
                      <span>{sortOrder === "ASC" ? "↑" : "↓"}</span>
                    )}
                  </div>
                </TableHead>
                <TableHead className="gba:w-[60px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {opportunities.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} className="gba:text-center gba:py-8">
                    <div className="gba:text-gray-500">
                      No opportunities available.
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                opportunities.map((opportunity) => (
                  <TableRow
                    key={opportunity.id}
                    data-testid={`investment-opportunity-row-${opportunity.id}`}
                    className="gba:cursor-pointer gba:hover:gba:bg-gray-50 gba:transition-colors"
                    onClick={() => handleRowClick(opportunity.id)}
                  >
                    <TableCell>
                      <div>
                        <div className="gba:font-medium">
                          {opportunity.name}
                        </div>
                        {opportunity.code && (
                          <div className="gba:text-sm gba:text-gray-500">
                            Code: {opportunity.code}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="gba:text-right">
                      {opportunity.estimatedAmount ? (
                        <div className="gba:w-full gba:flex gba:justify-end gba:items-baseline">
                          <span className="gba:text-sm gba:[font-variant-numeric:tabular-nums]">
                            {formatCurrencyNumberOnly(
                              opportunity.estimatedAmount,
                              opportunity.currency?.code
                            )}
                          </span>
                          <span className="gba:text-xs gba:text-gray-400 gba:inline-block gba:text-right gba:shrink-0 gba:w-[5ch]">
                            {getCurrencySymbol(opportunity.currency?.code)}
                          </span>
                        </div>
                      ) : (
                        <span className="gba:text-gray-400">-</span>
                      )}
                    </TableCell>

                    <TableCell>
                      {opportunity.opportunityPipeline ? (
                        <span className="gba:text-sm" data-testid={`investment-opportunity-pipeline-${opportunity.id}`}>
                          {opportunity.opportunityPipelineLabel ||
                            opportunity.opportunityPipeline?.value ||
                            opportunity.opportunityPipeline?.code ||
                            "-"}
                        </span>
                      ) : (
                        <span className="gba:text-gray-400">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {opportunity.opportunityPipelineStage ? (
                        <Badge 
                          variant={getStageColor(opportunity.opportunityPipelineStage?.alternativeCode)}
                          data-testid={`investment-opportunity-stage-${opportunity.id}`}
                        >
                          {opportunity.opportunityPipelineStageLabel ||
                            opportunity.opportunityPipelineStage?.value ||
                            opportunity.opportunityPipelineStage?.code ||
                            "-"}
                        </Badge>
                      ) : (
                        <span className="gba:text-gray-400">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {opportunity.opportunityStatus ? (
                        <Badge 
                          variant={getStatusColor(opportunity.opportunityStatus?.alternativeCode)}
                          data-testid={`investment-opportunity-status-${opportunity.id}`}
                        >
                          {opportunity.opportunityStatusLabel ||
                            opportunity.opportunityStatus?.value ||
                            opportunity.opportunityStatus?.code ||
                            "-"}
                        </Badge>
                      ) : (
                        <span className="gba:text-gray-400">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {opportunity.closeDate ? (
                        <div className="gba:flex gba:items-center gba:gap-2">
                          <Calendar className="gba:h-4 gba:w-4 gba:text-gray-400" />
                          <span className="gba:text-sm">
                            {formatDate(opportunity.closeDate)}
                          </span>
                        </div>
                      ) : (
                        <span className="gba:text-gray-400">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {opportunity.account ? (
                        <div className="gba:flex gba:items-center gba:gap-2">
                          <Building2 className="gba:h-4 gba:w-4 gba:text-gray-400" />
                          <span className="gba:text-sm">
                            {opportunity.account.name}
                          </span>
                        </div>
                      ) : (
                        <span className="gba:text-gray-400">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {opportunity.ownerEmployee ? (
                        <div className="gba:flex gba:items-center gba:gap-2">
                          <Avatar size="sm">
                            {opportunity.ownerEmployee.pictureThumbnail && (
                              <AvatarImage
                                src={`data:image/gif;base64,${opportunity.ownerEmployee.pictureThumbnail}`}
                                alt={getOwnerName(opportunity)}
                              />
                            )}
                            <AvatarFallback>
                              {getOwnerName(opportunity) !== "-"
                                ? getOwnerName(opportunity)
                                    .split(" ")
                                    .map((n: string) => n[0])
                                    .join("")
                                    .toUpperCase()
                                : "O"}
                            </AvatarFallback>
                          </Avatar>
                          <span className="gba:text-sm">
                            {getOwnerName(opportunity)}
                          </span>
                        </div>
                      ) : (
                        <span className="gba:text-gray-400">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {opportunity.createdAt ? (
                        <div className="gba:flex gba:items-center gba:gap-2">
                          <Calendar className="gba:h-4 gba:w-4 gba:text-gray-400" />
                          <span className="gba:text-sm">
                            {formatDate(opportunity.createdAt)}
                          </span>
                        </div>
                      ) : (
                        <span className="gba:text-gray-400">-</span>
                      )}
                    </TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <div className="gba:flex gba:justify-start gba:gap-2">
                        <AppActionButton
                          data-testid={`opportunity-entity-button-${opportunity.id}`}
                          size="icon"
                          contextsArray={[
                            FlowContextName.updateInvestmentOpportunity,
                          ]}
                          externalContextData={{
                            opportunityId: opportunity.id,
                          }}
                          prefixDataTestId={`opportunity-entity-update`}
                          accessToken={accessToken}
                          emptyStateBehavior="enable"
                          deferMainContextRequestsUntilClick={true}
                          onClick={(e) => e.stopPropagation()}
                        />
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalCount > pageSize && (
        <div className="gba:flex gba:items-center gba:justify-between gba:mt-4">
          <div className="gba:text-sm gba:text-gray-700">
            Showing {(currentPage - 1) * pageSize + 1} to{" "}
            {Math.min(currentPage * pageSize, totalCount)} of {totalCount}{" "}
            opportunities
          </div>
          <div className="gba:flex gba:gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage === 1}
              onClick={() => onPageChange(currentPage - 1)}
              data-testid="investment-opportunities-prev-page-button"
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage * pageSize >= totalCount}
              onClick={() => onPageChange(currentPage + 1)}
              data-testid="investment-opportunities-next-page-button"
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
