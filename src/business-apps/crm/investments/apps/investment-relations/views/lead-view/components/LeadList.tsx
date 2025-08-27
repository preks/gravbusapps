import React, { useCallback } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Button,
  Badge,
  Card,
  CardContent,
  Avatar,
  AvatarImage,
  AvatarFallback,
} from "@newwork/nw-design-system";
import { User, Building2, Mail, Phone, Calendar, MapPin } from "lucide-react";
import { BusinessAppContextProps } from "@/common/BusinessAppContext";
import type { InvestmentLead } from "@/common/data/investment/types";
import { AppActionButton } from "@/components/app-action-button/AppActionButton";
import { FlowContextName } from "@/common/types/FlowRegistryTypes";
import { formatDate, getLeadStatusVariant } from "../utils";
import { navigateTo } from "@/common/utils/navigationUtils";

export interface LeadListProps extends BusinessAppContextProps {
  leads: InvestmentLead[];
  searchTerm: string;
  onSearchChange: (value: string) => void;
  isLoading?: boolean;
  totalCount: number;
  currentPage: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onSort: (field: string) => void;
  sortField: string;
  sortOrder: "ASC" | "DESC";
  onClearFilters: () => void;
}

export const LeadList: React.FC<LeadListProps> = ({
  leads,
  searchTerm,
  onSearchChange,
  isLoading = false,
  totalCount,
  currentPage,
  pageSize,
  onPageChange,
  onSort,
  sortField,
  sortOrder,
  onClearFilters,
  ...context
}) => {
  const handleRowClick = useCallback((leadId: string) => {
    navigateTo(`/platform/irm/lead-record?leadId=${leadId}`);
  }, []);

  const getSortIcon = (field: string) => {
    if (sortField !== field) return null;
    return sortOrder === "ASC" ? "↑" : "↓";
  };

  // Helper function to get contact display name
  const getContactName = (lead: InvestmentLead) => {
    return `${lead.firstName || ""} ${lead.lastName || ""}`.trim() || "-";
  };

  // Helper function to get owner display name
  const getOwnerName = (lead: InvestmentLead) => {
    if (lead.ownerEmployee?.displayName) {
      return lead.ownerEmployee.displayName;
    }
    if (lead.ownerEmployee?.firstName || lead.ownerEmployee?.lastName) {
      return `${lead.ownerEmployee.firstName || ""} ${
        lead.ownerEmployee.lastName || ""
      }`.trim();
    }
    return "-";
  };

  // Helper function to get contact info
  const getContactInfo = (lead: InvestmentLead) => {
    const contactInfo = [];

    if (lead.email) {
      contactInfo.push(
        <div
          key="email"
          className="gba:flex gba:items-center gba:gap-2 gba:mb-1"
        >
          <Mail className="gba:w-4 gba:h-4 gba:text-gray-500" />
          <span className="gba:text-sm">{lead.email}</span>
        </div>
      );
    }

    if (lead.phoneNumber) {
      contactInfo.push(
        <div
          key="phone"
          className="gba:flex gba:items-center gba:gap-2 gba:mb-1"
        >
          <Phone className="gba:w-4 gba:h-4 gba:text-gray-500" />
          <span className="gba:text-sm">{lead.phoneNumber}</span>
        </div>
      );
    }

    return contactInfo.length > 0 ? (
      contactInfo
    ) : (
      <span className="gba:text-gray-400">No contact info</span>
    );
  };

  const getAddressInfo = (lead: InvestmentLead) => {
    const addressInfo = [];

    if (lead.postalCode || lead.locality) {
      const cityInfo = [lead.postalCode, lead.locality]
        .filter(Boolean)
        .join(", ");
      addressInfo.push(
        <div
          key="city"
          className="gba:flex gba:items-center gba:gap-2 gba:mb-1"
        >
          <MapPin className="gba:w-4 gba:h-4 gba:text-gray-500" />
          <span className="gba:text-sm">{cityInfo}</span>
        </div>
      );
    }

    if (lead.country?.code) {
      addressInfo.push(
        <div key="country" className="gba:flex gba:items-center gba:gap-2">
          <MapPin className="gba:w-4 gba:h-4 gba:text-gray-500" />
          <span className="gba:text-sm">{lead.country.code}</span>
        </div>
      );
    }

    return addressInfo.length > 0 ? (
      addressInfo
    ) : (
      <span className="gba:text-gray-400">No address</span>
    );
  };

  return (
    <div>
      {/* Table */}
      <Card>
        <CardContent className="gba:p-0">
          <div className="gba:w-full gba:overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead
                    className="gba:cursor-pointer gba:hover:gba:bg-gray-50"
                    onClick={() => onSort("firstName")}
                  >
                    <div className="gba:flex gba:items-center gba:gap-2">
                      Lead
                      {getSortIcon("firstName")}
                    </div>
                  </TableHead>
                  <TableHead
                    className="gba:cursor-pointer gba:hover:gba:bg-gray-50"
                    onClick={() => onSort("companyName")}
                  >
                    <div className="gba:flex gba:items-center gba:gap-2">
                      Company
                      {getSortIcon("companyName")}
                    </div>
                  </TableHead>
                  <TableHead
                    className="gba:cursor-pointer gba:hover:gba:bg-gray-50"
                    onClick={() => onSort("email")}
                  >
                    <div className="gba:flex gba:items-center gba:gap-2">
                      Contact Info
                      {getSortIcon("email")}
                    </div>
                  </TableHead>
                  <TableHead
                    className="gba:cursor-pointer gba:hover:gba:bg-gray-50"
                    onClick={() => onSort("city")}
                  >
                    <div className="gba:flex gba:items-center gba:gap-2">
                      Address
                      {getSortIcon("city")}
                    </div>
                  </TableHead>
                  <TableHead
                    className="gba:cursor-pointer gba:hover:gba:bg-gray-50"
                    onClick={() => onSort("leadStatus")}
                  >
                    <div className="gba:flex gba:items-center gba:gap-2">
                      Status
                      {getSortIcon("leadStatus")}
                    </div>
                  </TableHead>
                  <TableHead
                    className="gba:cursor-pointer gba:hover:gba:bg-gray-50"
                    onClick={() => onSort("leadRating")}
                  >
                    <div className="gba:flex gba:items-center gba:gap-2">
                      Rating
                      {getSortIcon("leadRating")}
                    </div>
                  </TableHead>
                  <TableHead
                    className="gba:cursor-pointer gba:hover:gba:bg-gray-50"
                    onClick={() => onSort("leadSource")}
                  >
                    <div className="gba:flex gba:items-center gba:gap-2">
                      Source
                      {getSortIcon("leadSource")}
                    </div>
                  </TableHead>
                  <TableHead
                    className="gba:cursor-pointer gba:hover:gba:bg-gray-50"
                    onClick={() => onSort("ownerEmployee")}
                  >
                    <div className="gba:flex gba:items-center gba:gap-2">
                      Owner
                      {getSortIcon("ownerEmployee")}
                    </div>
                  </TableHead>
                  <TableHead
                    className="gba:cursor-pointer gba:hover:gba:bg-gray-50"
                    onClick={() => onSort("createdAt")}
                  >
                    <div className="gba:flex gba:items-center gba:gap-2">
                      Created
                      {getSortIcon("createdAt")}
                    </div>
                  </TableHead>
                  <TableHead
                    className="gba:text-center"
                    data-testid="investment-lead-sensitive-header"
                  >
                    Sensitive
                  </TableHead>
                  <TableHead className="gba:w-[60px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {leads.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={11}
                      className="gba:text-center gba:py-8"
                    >
                      <div className="gba:text-gray-500">
                        {searchTerm
                          ? "No leads found matching your search criteria."
                          : "No leads available."}
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  leads.map((lead) => (
                    <TableRow
                      key={lead.id}
                      data-testid={`investment-lead-row-${lead.id}`}
                      className="gba:cursor-pointer gba:hover:gba:bg-gray-50 gba:transition-colors"
                      onClick={() => handleRowClick(lead.id)}
                    >
                      <TableCell>
                        <div className="gba:flex gba:items-center gba:gap-2">
                          <User className="gba:h-4 gba:w-4 gba:text-gray-400" />
                          <div>
                            <div className="gba:font-medium">
                              {getContactName(lead)}
                            </div>
                            {lead.academicTitle?.code && (
                              <div className="gba:text-sm gba:text-gray-500">
                                {lead.academicTitle.code}
                              </div>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {lead.companyName ? (
                          <div className="gba:flex gba:items-center gba:gap-2">
                            <Building2 className="gba:h-4 gba:w-4 gba:text-gray-400" />
                            <span className="gba:text-sm">
                              {lead.companyName}
                            </span>
                          </div>
                        ) : (
                          <span className="gba:text-gray-400">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="gba:min-w-[200px]">
                          {getContactInfo(lead)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="gba:min-w-[200px]">
                          {getAddressInfo(lead)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={getLeadStatusVariant(lead.leadStatus?.code)}
                          data-testid={`investment-lead-status-${lead.id}`}
                        >
                          {lead.leadStatus?.code || "Unknown"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          data-testid={`investment-lead-rating-${lead.id}`}
                        >
                          {lead.leadRating?.code || "Unknown"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          data-testid={`investment-lead-source-${lead.id}`}
                        >
                          {lead.leadSource?.code || "Unknown"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {lead.ownerEmployee ? (
                          <div className="gba:flex gba:items-center gba:gap-2">
                            <Avatar size="sm">
                              {lead.ownerEmployee.picture && (
                                <AvatarImage
                                  src={lead.ownerEmployee.picture}
                                  alt={getOwnerName(lead)}
                                />
                              )}
                              <AvatarFallback>
                                {getOwnerName(lead) !== "-"
                                  ? getOwnerName(lead)
                                      .split(" ")
                                      .map((n: string) => n[0])
                                      .join("")
                                      .toUpperCase()
                                  : "O"}
                              </AvatarFallback>
                            </Avatar>
                            <span className="gba:text-sm">
                              {getOwnerName(lead)}
                            </span>
                          </div>
                        ) : (
                          <span className="gba:text-gray-400">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {lead.createdAt ? (
                          <div className="gba:flex gba:items-center gba:gap-2">
                            <Calendar className="gba:h-4 gba:w-4 gba:text-gray-400" />
                            <span className="gba:text-sm">
                              {formatDate(lead.createdAt)}
                            </span>
                          </div>
                        ) : (
                          <span className="gba:text-gray-400">-</span>
                        )}
                      </TableCell>
                      <TableCell
                        className="gba:text-center"
                        data-testid={`investment-lead-sensitive-cell-${lead.id}`}
                      >
                        {lead.sensitive === true ? (
                          <span
                            className="gba:text-green-600 gba:text-lg"
                            data-testid={`investment-lead-sensitive-check-${lead.id}`}
                            title="Sensitive lead"
                          >
                            ✓
                          </span>
                        ) : (
                          <span
                            className="gba:text-gray-500 gba:text-lg"
                            data-testid={`investment-lead-sensitive-x-${lead.id}`}
                            title="Not sensitive"
                          >
                            ✕
                          </span>
                        )}
                      </TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <div className="gba:flex gba:justify-start gba:gap-2">
                          <AppActionButton
                            data-testid={`investment-lead-update-button-${lead.id}`}
                            size="icon"
                            contextsArray={[
                              FlowContextName.updateInvestmentLead,
                            ]}
                            externalContextData={{ leadId: lead.id }}
                            prefixDataTestId={`investment-lead-update`}
                            accessToken={context.accessToken}
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
          </div>
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalCount > pageSize && (
        <div className="gba:flex gba:items-center gba:justify-between gba:mt-4">
          <div className="gba:text-sm gba:text-gray-700">
            Showing {(currentPage - 1) * pageSize + 1} to{" "}
            {Math.min(currentPage * pageSize, totalCount)} of {totalCount} leads
          </div>
          <div className="gba:flex gba:gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage === 1}
              onClick={() => onPageChange(currentPage - 1)}
              data-testid="investment-leads-prev-page-button"
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage * pageSize >= totalCount}
              onClick={() => onPageChange(currentPage + 1)}
              data-testid="investment-leads-next-page-button"
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
