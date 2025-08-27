import React, { useState, useCallback, useEffect, useMemo } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Button,
  Badge,
  Spinner,
  Alert,
  Card,
  CardContent,
  Avatar,
  AvatarImage,
  AvatarFallback,
} from "@newwork/nw-design-system";
import {
  Target,
  DollarSign,
  Building2,
  Calendar,
  TrendingUp,
} from "lucide-react";
import { BusinessAppContextProps } from "@/common/BusinessAppContext";
import type { InvestmentOpportunity } from "@/common/data/investment/types";
import { AppActionButton } from "@/components/app-action-button/AppActionButton";
import { FlowContextName } from "@/common/types/FlowRegistryTypes";
import { formatCurrency, formatDate } from "../utils";
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

  // Helper function to calculate win rate based on status
  const getWinRate = (opportunity: InvestmentOpportunity) => {
    if (!opportunity.opportunityStatus?.code) return "-";

    const status = opportunity.opportunityStatus.code.toLowerCase();
    if (status.includes("won") || status.includes("closed_won")) return "100%";
    if (status.includes("high_probability") || status.includes("likely_to_win"))
      return "80%";
    if (status.includes("medium_probability")) return "50%";
    if (status.includes("low_probability")) return "20%";
    if (status.includes("lost") || status.includes("closed_lost")) return "0%";

    return "50%"; // Default
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
                  </div>
                </TableHead>
                <TableHead
                  className="gba:cursor-pointer gba:hover:gba:bg-gray-50"
                  onClick={() => onSort("opportunityStatus")}
                >
                  <div className="gba:flex gba:items-center gba:gap-2">
                    Win Rate
                    {sortField === "opportunityStatus" && (
                      <span>{sortOrder === "ASC" ? "↑" : "↓"}</span>
                    )}
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
                  <TableCell colSpan={9} className="gba:text-center gba:py-8">
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
                      <div className="gba:flex gba:items-center gba:gap-2">
                        <Target className="gba:h-4 gba:w-4 gba:text-gray-400" />
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
                      </div>
                    </TableCell>
                    <TableCell>
                      {opportunity.estimatedAmount ? (
                        <div className="gba:flex gba:items-center gba:gap-2">
                          <DollarSign className="gba:h-4 gba:w-4 gba:text-gray-400" />
                          <span className="gba:text-sm">
                            {formatCurrency(opportunity.estimatedAmount)}
                          </span>
                        </div>
                      ) : (
                        <span className="gba:text-gray-400">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="gba:flex gba:items-center gba:gap-2">
                        <TrendingUp className="gba:h-4 gba:w-4 gba:text-gray-400" />
                        <span className="gba:text-sm">
                          {getWinRate(opportunity)}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {opportunity.opportunityPipeline ? (
                        <Badge
                          variant="secondary"
                          data-testid={`investment-opportunity-pipeline-${opportunity.id}`}
                        >
                          {opportunity.opportunityPipeline.code}
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
                            {opportunity.ownerEmployee.picture && (
                              <AvatarImage
                                src={opportunity.ownerEmployee.picture}
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
