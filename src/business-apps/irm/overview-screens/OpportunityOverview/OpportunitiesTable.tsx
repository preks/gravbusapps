"use client"

import React from "react"
import {
  useState, 
  useEffect
} from "react"
import {
  type ColumnDef,
  type ColumnFiltersState,
  type SortingState,
  type VisibilityState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table"
import { 
  ArrowUpDown, 
  ChevronDown, 
  MoreHorizontal, 
  Plus, 
  DollarSign,
  Briefcase,
  TrendingUp,
  Target
} from "lucide-react"
import { Button } from "./common/ui/button"
import { Checkbox } from "./common/ui/checkbox"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "./common/ui/dropdown-menu"
import { Input } from "./common/ui/input"
import { Table, TableBody, TableCell, TableHead, TableRow, TableHeader } from "./common/ui/table"
import { Badge } from "./common/ui/badge"
import OpportunityCreateModal from "./OpportunityCreateModal"
import OpportunityDetailContainer from "./OpportunityDetailContainer"
import { useGraphqlClient } from '@/common/network/graphql/useGraphQLClient'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { Spin, Pagination, Empty } from 'antd'
import { GET_OPPORTUNITIES, OpportunityData, GetOpportunitiesResponse } from './graphql/opportunity-queries'


const samplePipelines = [
  { id: "pipe-1", name: "Venture Capital" },
  { id: "pipe-2", name: "M&A" },
  { id: "pipe-3", name: "International Expansion" },
  { id: "pipe-4", name: "Real Estate" }
]

const sampleCompanies = [
  { id: "comp-1", name: "HealthTech Innovations" },
  { id: "comp-2", name: "TechVision Inc." },
  { id: "comp-3", name: "GreenEnergy Solutions" },
  { id: "comp-4", name: "LogisticsPro" },
  { id: "comp-5", name: "Urban Heights Development" }
]

const sampleInvestments = [
  { id: "inv-1", name: "Healthcare Innovation Fund" },
  { id: "inv-2", name: "Tech Growth Capital" },
  { id: "inv-3", name: "Renewable Energy Ventures" }
]

interface DisplayOpportunityData {
  id: string;
  name: string;
  type: string;
  account: string;
  contact: string;
  lastInteraction: string;
  createdAt: string;
  closeDate: string;
  owner: string;
  estimatedAmount: number;
  currency: string;
  winningChance: number;
  stage: string;
  companyName: string;
  value: string;
  stageName: string;
  investmentName: string;
  ownerEmployee: {
    firstName: string;
    lastName: string;
  };
}

const transformOpportunityData = (apiOpportunity: OpportunityData): DisplayOpportunityData => {
  if (!apiOpportunity) {
    console.warn("Received empty opportunity data to transform");
    return {} as DisplayOpportunityData;
  }

  return {
    id: apiOpportunity.id || "",
    name: apiOpportunity.name || "",
    type: apiOpportunity.stage === "CLOSED_WON" || apiOpportunity.stage === "CLOSED_LOST" ? "outgoing" : "incoming",
    account: apiOpportunity.account?.name || "",
    contact: apiOpportunity.account?.contact?.firstName 
      ? `${apiOpportunity.account.contact.firstName} ${apiOpportunity.account.contact.lastName || ""}`
      : "",
    lastInteraction: apiOpportunity.lastInteraction || "",
    createdAt: apiOpportunity.createdAt || "",
    closeDate: apiOpportunity.closeDate || "",
    owner: apiOpportunity.ownerEmployee
      ? `${apiOpportunity.ownerEmployee.firstName} ${apiOpportunity.ownerEmployee.lastName}`
      : "",
    estimatedAmount: apiOpportunity.estimatedAmount || 0,
    currency: "USD",
    winningChance: apiOpportunity.winningChance || 0,
    stage: apiOpportunity.stage,
    companyName: apiOpportunity.account?.name || "",
    value: String(apiOpportunity.estimatedAmount || 0),
    stageName: apiOpportunity.stage || "",
    investmentName: "", 
    ownerEmployee: apiOpportunity.ownerEmployee,
  };
};

export const OpportunitiesTable: React.FC<BusinessAppContextProps & {
  pipelines?: { id: string; name: string }[]
  companies?: { id: string; name: string }[]
  investments?: { id: string; name: string }[]
  isStandalone?: boolean
  onSelectOpportunity?: (id: string) => void
}> = ({ 
  accessToken,
  pipelines = samplePipelines,
  companies = sampleCompanies,
  investments = sampleInvestments,
  isStandalone = true,
  onSelectOpportunity 
}) => {
  let routerNavigate: any = undefined;
  const navigate = (path: string) => {
    if (isStandalone || !routerNavigate) {
      console.log(`Navigation to ${path} is disabled in preview mode`);
    } else {
      routerNavigate(path);
    }
  };
  
  const graphQLClient = useGraphqlClient(accessToken);
  const [opportunities, setOpportunities] = useState<DisplayOpportunityData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const itemsPerPage = pageSize;

  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = useState({});
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedOpportunityId, setSelectedOpportunityId] = useState<string | null>(null);
  const [debouncedFilter, setDebouncedFilter] = useState<string>("");
  const [searchFilter, setSearchFilter] = useState("");

  const enabledButtonStyle: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '6px 12px',
    borderWidth: '1px',
    borderStyle: 'solid',
    borderColor: '#d1d5db', 
    borderRadius: '6px',
    textDecoration: 'none',
    color: '#1f2937',
    backgroundColor: '#ffffff',
    margin: '0 4px',
    lineHeight: '1.5',
    minWidth: '80px',
    textAlign: 'center',
    cursor: 'pointer',
  };

  const disabledButtonStyle: React.CSSProperties = {
    ...enabledButtonStyle, 
    color: '#9ca3af', 
    backgroundColor: '#f9fafb', 
    cursor: 'not-allowed',
  };
  
  const itemRender = (current: number, type: 'page' | 'prev' | 'next' | 'jump-prev' | 'jump-next', originalElement: React.ReactNode): React.ReactNode => {
    if (!React.isValidElement(originalElement)) {
      return originalElement;
    }

    const props = originalElement.props as { className?: string; children?: React.ReactNode };

    const antIsDisabled = props.className?.includes('ant-pagination-disabled');
    let styleToApply: React.CSSProperties = {};
    let newChildren = props.children;
    let isPrevNextButton = false;

    if (type === 'prev') {
      const isLogicallyDisabled = currentPage === 1;
      const finalIsDisabled = isLogicallyDisabled || antIsDisabled; 
      styleToApply = finalIsDisabled ? disabledButtonStyle : enabledButtonStyle;
      newChildren = 'Previous';
      isPrevNextButton = true;

    } else if (type === 'next') {
      const totalPages = Math.ceil(total / pageSize);
      const isLogicallyDisabled = total === 0 || currentPage >= totalPages;
      const finalIsDisabled = isLogicallyDisabled || antIsDisabled;
      styleToApply = finalIsDisabled ? disabledButtonStyle : enabledButtonStyle;
      newChildren = 'Next';
      isPrevNextButton = true;

    } else if (type === 'jump-prev' || type === 'jump-next') {
      return originalElement;
    } else if (React.isValidElement(originalElement) && (originalElement.props as { className?: string }).className?.includes('ant-pagination-item')) {
      return originalElement;
    } else {
      return originalElement;
    }

    if (isPrevNextButton) {
      const elementToClone = originalElement as React.ReactElement<React.HTMLAttributes<HTMLElement>>;

      const currentClassName = elementToClone.props.className || '';
      const gbaClassName = type === 'prev' ? 'gba-pagination-prev-btn' : 'gba-pagination-next-btn';
      let finalClassName = currentClassName.replace('gba-pagination-prev-btn', '').replace('gba-pagination-next-btn', '').trim();
      finalClassName = `${finalClassName} ${gbaClassName}`.trim();
      if (styleToApply === disabledButtonStyle && !antIsDisabled) {
        finalClassName = `${finalClassName} ant-pagination-disabled`.trim();
      }

      return React.cloneElement(elementToClone, {
        className: finalClassName,
        style: styleToApply,
        children: newChildren,
      });
    }
    
    return originalElement; 
  };

  const fetchOpportunities = async (whereCondition = {}) => {
    console.log("Initial:",whereCondition)
    try {
      setLoading(true);
      setError(null); // Clear any previous error state when starting a new fetch
      const result = await graphQLClient.request<GetOpportunitiesResponse>(
        GET_OPPORTUNITIES,
        { 
          offset: (currentPage - 1) * itemsPerPage, 
          limit: itemsPerPage,
          where: whereCondition
        }
      );
      console.log("Am result here:",result)
      if (result && result.Opportunity && Array.isArray(result.Opportunity)) {
        const transformedData = result.Opportunity.map(transformOpportunityData);
        setOpportunities(transformedData);
        
        const count = result.totalCount?.aggregate?.count;
        setTotal(typeof count === 'number' ? count : 0);
      } else {
        console.error("Unexpected API response structure:", result);
        setError("Received invalid data from API");
      }
    } catch (err) {
      console.error('Error fetching opportunities:', err);
      setError("No opportunities found");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    console.log("Fetching opportunities with page:", currentPage);
    
    const whereCondition = debouncedFilter.trim() 
      ? { 
          _or: [
            { name: { _iregex: debouncedFilter } },
            { account: { name: { _iregex: debouncedFilter } } },
            { ownerEmployee: { firstName: { _iregex: debouncedFilter } } },
            { ownerEmployee: { lastName: { _iregex: debouncedFilter } } }
          ]
        } 
      : {};
    
    fetchOpportunities(whereCondition);
  }, [currentPage, pageSize, debouncedFilter, accessToken]);

  const handleTableChange = (newPage: number, newPageSize: number) => {
    setCurrentPage(newPage);
    setPageSize(newPageSize);
  };

  const columns: ColumnDef<DisplayOpportunityData>[] = [
    {
      id: "select",
      header: ({ table }) => (
        <Checkbox
          checked={table.getIsAllPageRowsSelected() || (table.getIsSomePageRowsSelected() && "indeterminate")}
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label="Select all"
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label="Select row"
        />
      ),
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: "name",
      header: ({ column }) => {
        return (
          <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
            Name
            <ArrowUpDown className="gba:ml-2 gba:h-4 gba:w-4" />
          </Button>
        )
      },
      cell: ({ row }) => {
        const id = row.original.id;
        const name = row.getValue("name");
        
        return (
          <div className="gba:font-medium">
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                handleOpportunityClick(id);
              }}
              className="gba:text-left hover:underline gba:cursor-pointer gba:border-none gba:bg-transparent gba:p-0 gba:m-0"
            >
              {String(name)}
            </button>
          </div>
        );
      },
    },
    {
      accessorKey: "account",
      header: ({ column }) => (
        <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
          Account
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => <div>{row.getValue("account") || "—"}</div>,
    },
    {
      accessorKey: "createdAt",
      header: ({ column }) => (
        <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
          Creation Date
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => {
        const date = row.getValue("createdAt") as string;
        return <div>{date ? new Date(date).toLocaleDateString() : "—"}</div>;
      },
    },
    {
      accessorKey: "closeDate",
      header: ({ column }) => (
        <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
          Close Date
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => {
        const date = row.getValue("closeDate") as string;
        return <div>{date ? new Date(date).toLocaleDateString() : "—"}</div>;
      },
    },
    {
      accessorKey: "owner",
      header: "Owner",
      cell: ({ row }) => <div>{row.getValue("owner") || "—"}</div>,
    },
    {
      accessorKey: "estimatedAmount",
      header: ({ column }) => (
        <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
          Estimated Amount
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => {
        const amount = row.getValue("estimatedAmount") as number;
        const currency = row.original.currency || "USD";
        return <div className="font-medium">{amount ? `${currency} ${amount.toLocaleString()}` : "—"}</div>;
      },
    },
    {
      accessorKey: "winningChance",
      header: ({ column }) => (
        <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
          Winning Chance
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      ),
      cell: ({ row }) => {
        const chance = row.getValue("winningChance") as number;
        return <div>{typeof chance === 'number' ? `${chance}%` : "—"}</div>;
      },
    },
    {
      accessorKey: "stage",
      header: "Stage",
      cell: ({ row }) => {
        const stage = row.getValue("stage") as string;
        let badgeVariant = "outline";
        
        if (stage === "CLOSED_WON") {
          badgeVariant = "success";
        } else if (stage === "CLOSED_LOST") {
          badgeVariant = "destructive";
        }
        
        return (
          <div>
            {stage ? (
              <Badge variant={badgeVariant as any}>
                {stage === "CLOSED_WON" 
                  ? "Won" 
                  : stage === "CLOSED_LOST" 
                    ? "Lost" 
                    : stage.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, l => l.toUpperCase())}
              </Badge>
            ) : "—"}
          </div>
        );
      },
    },
    {
      id: "actions",
      enableHiding: false,
      cell: ({ row }) => {
        const opportunity = row.original

        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="gba:h-8 gba:w-8 gba:p-0 gba:hover:bg-transparent gba:focus:bg-transparent gba:focus:ring-0 gba:focus:ring-offset-0">
                <span className="gba:sr-only">Open menu</span>
                <MoreHorizontal className="gba:h-4 gba:w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="gba:bg-white gba:border gba:border-gray-300 gba:shadow-md gba:w-[150px]">
              <div className="gba:px-2 gba:py-1.5 gba:text-sm gba:font-semibold">Actions</div>
              <DropdownMenuItem className="gba:cursor-pointer gba:focus:bg-gray-100" onClick={() => navigate(`/opportunities/${opportunity.id}`)}>
                View Details
              </DropdownMenuItem>
              <DropdownMenuItem className="gba:cursor-pointer gba:focus:bg-gray-100">
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem className="gba:cursor-pointer gba:focus:bg-gray-100">
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )
      },
    },
  ]

  const table = useReactTable({
    data: opportunities,
    columns,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
    },
  })

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      setDebouncedFilter(searchFilter);
      setCurrentPage(1);
    }, 500);
    
    return () => clearTimeout(timeoutId);
  }, [searchFilter]);

  const handleOpportunityClick = (id: string) => {
    console.log("Opportunity clicked:", id);
    setSelectedOpportunityId(id);
    
    if (onSelectOpportunity) {
      onSelectOpportunity(id);
    }
  };

  const handleBackToTable = () => {
    setSelectedOpportunityId(null);
  };

  if (selectedOpportunityId) {
    return (
      <OpportunityDetailContainer 
        opportunityId={selectedOpportunityId}
        onBack={handleBackToTable}
      />
    );
  }

  return (
    <div className="gba:w-full">
      <div className="gba:flex gba:flex-col">
        <div className="gba:p-4 gba:border gba:border-gray-300 gba:rounded-lg gba:bg-white gba:mb-6">
          <h1 className="gba:text-2xl gba:font-bold">Opportunities</h1>
          <p className="gba:text-gray-500">Manage your sales opportunities</p>
        </div>
        
        <div className="gba:grid gba:grid-cols-4 gba:gap-4 gba:mb-6">
          <div className="gba:p-4 gba:border gba:border-gray-300 gba:rounded-lg gba:bg-white">
            <div className="gba:flex gba:items-center">
              <div className="gba:w-10 gba:h-10 gba:rounded-full gba:bg-blue-50 gba:flex gba:items-center gba:justify-center gba:mr-4">
                <Briefcase className="gba:h-5 gba:w-5 gba:text-blue-500" />
              </div>
              <div>
                <div className="gba:text-sm gba:text-gray-500">Total Opportunities</div>
                <div className="gba:text-2xl gba:font-bold gba:text-blue-500">{total}</div>
              </div>
            </div>
          </div>
          <div className="gba:p-4 gba:border gba:border-gray-300 gba:rounded-lg gba:bg-white">
            <div className="gba:flex gba:items-center">
              <div className="gba:w-10 gba:h-10 gba:rounded-full gba:bg-green-50 gba:flex gba:items-center gba:justify-center gba:mr-4">
                <TrendingUp className="gba:h-5 gba:w-5 gba:text-green-500" />
              </div>
              <div>
                <div className="gba:text-sm gba:text-gray-500">Active Opportunities</div>
                <div className="gba:text-2xl gba:font-bold gba:text-green-500">
                  {opportunities.filter(opp => opp.stageName !== "Closed Won" && opp.stageName !== "Closed Lost").length}
                </div>
              </div>
            </div>
          </div>
          <div className="gba:p-4 gba:border gba:border-gray-300 gba:rounded-lg gba:bg-white">
            <div className="gba:flex gba:items-center">
              <div className="gba:w-10 gba:h-10 gba:rounded-full gba:bg-orange-50 gba:flex gba:items-center gba:justify-center gba:mr-4">
                <DollarSign className="gba:h-5 gba:w-5 gba:text-orange-500" />
              </div>
              <div>
                <h3 className="gba:text-sm gba:text-gray-500">Total Value</h3>
                <p className="gba:text-2xl gba:font-bold">${opportunities.reduce((sum, opp) => {
                  const numValue = typeof opp.value === 'string' ? parseFloat(opp.value) || 0 : (opp.value || 0);
                  return sum + numValue;
                }, 0).toLocaleString()}</p>
              </div>
            </div>
          </div>
          <div className="gba:p-4 gba:border gba:border-gray-300 gba:rounded-lg gba:bg-white">
            <div className="gba:flex gba:items-center">
              <div className="gba:w-10 gba:h-10 gba:rounded-full gba:bg-purple-50 gba:flex gba:items-center gba:justify-center gba:mr-4">
                <Target className="gba:h-5 gba:w-5 gba:text-purple-500" />
              </div>
              <div>
            <h3 className="gba:text-sm gba:text-gray-500">Win Rate</h3>
            <div className="gba:text-2xl gba:font-bold gba:text-purple-500">
              {opportunities.length ? Math.round(
                (opportunities.filter(opp => opp.stageName === "Closed Won").length / 
                (opportunities.filter(opp => opp.stageName === "Closed Won" || opp.stageName === "Closed Lost").length || 1)) * 100
              ) : 0}%
            </div>
              </div>
            </div>
          </div>
        </div>

        <div className="gba:flex gba:items-center gba:justify-between gba:py-4">
          <div className="gba:flex gba:items-center gba:gap-3">
            <Input
              placeholder="Filter opportunities..."
              value={searchFilter}
              onChange={(event) => setSearchFilter(event.target.value)}
              className="gba:max-w-sm gba:border-gray-300"
            />
            <div className="gba:relative">
             
            </div>
          </div>
          <div className="gba:flex gba:items-center gba:gap-2">
            <Button variant="outline" size="sm" onClick={() => setIsCreateModalOpen(true)} className="gba:ml-auto gba:border-gray-300">
              <Plus className="gba:mr-2 gba:h-4 gba:w-4" />
              New Opportunity
            </Button>
            <div className="gba:relative">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="gba:border-gray-300">
                    Columns <ChevronDown className="gba:ml-2 gba:h-4 gba:w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="gba:bg-white gba:border gba:border-gray-300 gba:shadow-md gba:w-[200px]">
                  {table
                    .getAllColumns()
                    .filter((column) => column.getCanHide())
                    .map((column) => {
                      return (
                        <DropdownMenuCheckboxItem
                          key={column.id}
                          className="gba:capitalize"
                          checked={column.getIsVisible()}
                          onCheckedChange={(value) => column.toggleVisibility(!!value)}
                        >
                          {column.id}
                        </DropdownMenuCheckboxItem>
                      )
                    })}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
        
        {loading ? (
          <div className="gba:flex gba:justify-center gba:items-center gba:h-64 gba:border gba:border-gray-300 gba:rounded-lg">
            <Spin size="large" />
          </div>
        ) : (
          <div className="gba:rounded-md gba:border gba:border-gray-300">
            <Table>
              <TableHeader className="gba:border-b gba:border-gray-300">
                {table.getHeaderGroups().map((headerGroup) => (
                  <TableRow key={headerGroup.id} className="gba:border-b gba:border-gray-300">
                    {headerGroup.headers.map((header) => {
                      return (
                        <TableHead key={header.id}>
                          {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                        </TableHead>
                      )
                    })}
                  </TableRow>
                ))}
              </TableHeader>
              <TableBody>
                {error ? (
                  <TableRow className="gba:border-b gba:border-gray-300">
                    <TableCell colSpan={columns.length} className="gba:h-24 gba:text-center">
                      <Empty 
                        description={error}
                      />
                    </TableCell>
                  </TableRow>
                ) : table.getRowModel().rows?.length ? (
                  table.getRowModel().rows.map((row) => (
                    <TableRow key={row.id} data-state={row.getIsSelected() && "selected"} className="gba:border-b gba:border-gray-300">
                      {row.getVisibleCells().map((cell) => (
                        <TableCell key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : (
                  <TableRow className="gba:border-b gba:border-gray-300">
                    <TableCell colSpan={columns.length} className="gba:h-24 gba:text-center">
                      {searchFilter.trim() ? 
                        <Empty description={`No opportunities found matching "${searchFilter.trim()}"`} /> : 
                        <Empty description="No opportunities found." />}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        )}
        <div className="gba:flex gba:items-center gba:justify-between gba:py-4">
          <div className="gba:flex-1 gba:text-sm gba:text-muted-foreground">
            {opportunities.length > 0 ? (
              <>Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, total)} of {total} opportunities</>
            ) : (
              <>No opportunities found.</>
            )}
          </div>
          <div className="gba:space-x-2">
            <Pagination
              current={currentPage}
              pageSize={pageSize}
              total={total}
              showSizeChanger={true}
              pageSizeOptions={['10', '20', '50', '100']}
              onChange={handleTableChange}
              className="gba:custom-pagination"
              itemRender={itemRender}
            />
          </div>
        </div>
        {isCreateModalOpen && (
          <OpportunityCreateModal
            open={isCreateModalOpen}
            onOpenChange={setIsCreateModalOpen}
            pipelines={pipelines}
            companies={companies}
          />
        )}
      </div>
    </div>
  )
}

export default OpportunitiesTable;