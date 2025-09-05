import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Badge,
  Spinner,
  Alert,
  Button
} from "@newwork/nw-design-system";
import { BusinessAppContextProps } from "@/common/BusinessAppContext";
import { useGetInvestments } from "@/common/data/investment/hooks/useInvestments";
import type { Investment } from "@/common/data/investment/types";
import type { InvestmentQueryVariables } from "@/common/data/investment/queries/investmentQueries";
import { DataContainer } from "@/components/layout/dataContainer/DataContainer";
import { AppAction } from "@/components/app-action/AppAction";
import { AppActionButton } from "@/components/app-action-button/AppActionButton";
import { FlowContextName } from "@/common/types/FlowRegistryTypes";
import { Building2, Calendar } from "lucide-react";
import { formatCurrency, formatDate } from "@/common/data/investment";

// Helper function to format group names for display
const formatGroupName = (groupName: string): string => {
  // Handle specific cases for better display
  if (groupName === 'RealEstate') {
    return 'Real Estate';
  }
  if (groupName === 'LiquidFund' || groupName === 'LiquidFunds') {
    return 'Liquid Fund';
  }
  if (groupName === 'PrivateEquity') {
    return 'Private Equity';
  }
  
  // For other cases, add spaces before capital letters (camelCase to Title Case)
  return groupName.replace(/([A-Z])/g, ' $1').trim();
};

export interface PrivateEquityInvestmentsListProps extends BusinessAppContextProps {}

const PrivateEquityInvestmentsList: React.FC<PrivateEquityInvestmentsListProps> = (context) => {
  const { accessToken } = context;

  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(20);
  const [sortField] = useState("createdAt");
  const [sortOrder] = useState<"ASC" | "DESC">("DESC");
  const [selectedFilters, setSelectedFilters] = useState<string[]>([]);

  const { fetchInvestments } = useGetInvestments(context);

  const [investments, setInvestments] = useState<Investment[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const queryVariables: InvestmentQueryVariables = useMemo(() => {
    const v: InvestmentQueryVariables = {
      limit: pageSize,
      offset: (currentPage - 1) * pageSize,
      search: searchTerm.trim() || undefined,
      orderBy: [{ field: sortField, direction: sortOrder }],
      ...selectedFilters
    };
    // Filter by investment types that belong to Equity group (based on catalog parentEntryId)
    v.investmentTypeIds = [
      "InvestmentType:v1:PHARMA",
      "InvestmentType:v1:LIFE_SCEINCE", 
      "InvestmentType:v1:DISRUPTIVE_TECHNOLOGY",
      "InvestmentType:v1:CO_INVESTMENTS"
    ];
    return v;
  }, [currentPage, pageSize, searchTerm, sortField, sortOrder, selectedFilters]);

  const loadData = useCallback(async () => {
    if (!accessToken) return;
    setIsLoading(true);
    setError(null);
    try {
      const result = await fetchInvestments(queryVariables);
      setInvestments(result.Investment || []);
      setTotalCount(result.InvestmentAggregate?.aggregate?.count || 0);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error occurred");
    } finally {
      setIsLoading(false);
    }
  }, [accessToken, fetchInvestments, queryVariables]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSearch = useCallback((value: string) => {
    setSearchTerm(value);
    setCurrentPage(1);
  }, []);

  const handleSetFilter = useCallback((filters: string[]) => {
    setSelectedFilters(filters);
    setCurrentPage(1);
  }, []);

  if (isLoading && investments.length === 0) {
    return (
      <div className="gba:flex gba:items-center gba:justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive" className="gba:mb-4">
        <div className="gba:flex gba:items-center gba:justify-between">
          <span>Error loading investments: {error}</span>
          <Button variant="outline" size="sm" onClick={loadData}>
            Retry
          </Button>
        </div>
      </Alert>
    );
  }

  return (
    <DataContainer
      dataControllerProps={{
        search: searchTerm,
        setSearch: handleSearch,
        debounceDelay: 500,
        filter: selectedFilters,
        setFilter: handleSetFilter,
        listTitle: (
          <div className="gba:flex gba:items-center">
            <div className="gba:flex gba:items-center">
              <span>Private Equity Investments</span>
              <span>({totalCount})</span>
            </div>
          </div>
        ),
        actions: (
          <AppAction
            contextsArray={[FlowContextName.createInvestment]}
            accessToken={accessToken}
            data-testid="private-equity-investments-add-action"
            emptyStateBehavior="hide"
          >
            <button
              className="gba:flex gba:flex-row gba:justify-center gba:items-center"
              data-testid="private-equity-investments-add-action"
              type="button"
            >
              <span>
                Add
              </span>
            </button>
          </AppAction>
        ),
      }}
      dataFilterProps={{
        filterGroups: [],
        onFilterChange: () => {},
      }}
      dataBody={
        <div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="gba:w-[60px]"></TableHead>
                <TableHead>Investment</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {investments.map((investment) => (
                <TableRow key={investment.id}>
                  <TableCell>
                    <div className="gba:flex gba:justify-start gba:gap-2">
                      <AppActionButton
                        data-testid={`private-equity-investment-update-button-${investment.id}`}
                        size="icon"
                        contextsArray={[FlowContextName.privateEquityInvestmentEntity]}
                        externalContextData={{ investmentId: investment.id }}
                        prefixDataTestId={`private-equity-investment-update`}
                        accessToken={accessToken}
                        emptyStateBehavior="disable"
                        deferMainContextRequestsUntilClick={true}
                        onClick={(e) => e.stopPropagation()}
                      />
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="gba:flex gba:items-center">
                      <Building2 className="gba:w-4 gba:h-4" />
                      <span className="gba:font-medium">{investment.name}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{formatGroupName(investment.investmentGroup?.value || "Unknown")}</Badge>
                  </TableCell>
                  <TableCell>
                    <span>{formatCurrency(investment.initialInvestmentAmount || 0)}</span>
                  </TableCell>
                  <TableCell>
                    <Badge variant={investment.investmentStatus?.code === "Active" ? "default" : "secondary"}>
                      {investment.investmentStatus?.code || "Unknown"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="gba:flex gba:items-center">
                      <Calendar className="gba:w-4 gba:h-4" />
                      <span>{formatDate(investment.createdAt)}</span>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      }
    />
  );
};

export default PrivateEquityInvestmentsList;


