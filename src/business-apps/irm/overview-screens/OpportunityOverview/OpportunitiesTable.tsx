"use client"

import { useState } from "react"
import { Link } from "react-router-dom"
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
import { ArrowUpDown, ChevronDown, MoreHorizontal, Plus, ArrowRight, ArrowLeft } from "lucide-react"
import { Button } from "./common/ui/button"
import { Checkbox } from "./common/ui/checkbox"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./common/ui/dropdown-menu"
import { Input } from "./common/ui/input"
import { Table, TableBody, TableCell, TableHead, TableRow, TableHeader } from "./common/ui/table"
import { Badge } from "./common/ui/badge"
import OpportunityCreateModal from "./OpportunityCreateModal"
import type { OpportunityWithRelations } from "../../../../common/lib/db-actions"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./common/ui/select"
import opportunitiesData from "./opportunities.json"
import OpportunityDetailContainer  from "./OpportunityDetailContainer"

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

export default function OpportunitiesTable({
  data = opportunitiesData as OpportunityWithRelations[],
  pipelines = samplePipelines,
  companies = sampleCompanies,
  investments = sampleInvestments,
  isStandalone = true,
  onSelectOpportunity
}: {
  data?: OpportunityWithRelations[]
  pipelines?: { id: string; name: string }[]
  companies?: { id: string; name: string }[]
  investments?: { id: string; name: string }[]
  isStandalone?: boolean
  onSelectOpportunity?: (id: string) => void
}) {
  let routerNavigate: any = undefined;
  const navigate = (path: string) => {
    if (isStandalone || !routerNavigate) {
      console.log(`Navigation to ${path} is disabled in preview mode`);
    } else {
      routerNavigate(path);
    }
  };
  
  const [sorting, setSorting] = useState<SortingState>([])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({})
  const [rowSelection, setRowSelection] = useState({})
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [selectedOpportunityId, setSelectedOpportunityId] = useState<string | null>(null)

  const CustomLink = ({ to, children, className }: { to: string, children: React.ReactNode, className?: string }) => {
    if (isStandalone) {
      return <span className={className}>{children}</span>;
    }
    return <Link to={to} className={className}>{children}</Link>;
  };

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

  const columns: ColumnDef<OpportunityWithRelations>[] = [
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
      accessorKey: "type",
      header: "Type",
      cell: ({ row }) => {
        const type = row.getValue("type") as "incoming" | "outgoing"
        return (
          <div className="gba:flex gba:items-center">
            {type === "incoming" ? (
              <div className="gba:flex gba:items-center" title="Incoming">
                <ArrowLeft className="gba:h-5 gba:w-5 gba:text-red-500" />
                <span className="gba:sr-only">Incoming</span>
              </div>
            ) : (
              <div className="gba:flex gba:items-center" title="Outgoing">
                <ArrowRight className="gba:h-5 gba:w-5 gba:text-green-500" />
                <span className="gba:sr-only">Outgoing</span>
              </div>
            )}
          </div>
        )
      },
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
                
                console.log("BUTTON CLICK DETECTED for opportunity:", id);
                
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
      accessorKey: "companyName",
      header: "Company",
      cell: ({ row }) => <div>{row.getValue("companyName") || "—"}</div>,
    },
    {
      accessorKey: "value",
      header: ({ column }) => {
        return (
          <Button variant="ghost" onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}>
            Value
            <ArrowUpDown className="gba:ml-2 gba:h-4 gba:w-4" />
          </Button>
        )
      },
      cell: ({ row }) => {
        const value = row.getValue("value") as string
        const currency = row.original.currency || "USD"

        return <div className="gba:font-medium">{value ? `${currency} ${value}` : "—"}</div>
      },
    },
    {
      accessorKey: "stageName",
      header: "Stage",
      cell: ({ row }) => (
        <div>{row.getValue("stageName") ? <Badge variant="outline">{row.getValue("stageName")}</Badge> : "—"}</div>
      ),
    },
    {
      accessorKey: "investmentName",
      header: "Related Investment",
      cell: ({ row }) => {
        const investmentName = row.getValue("investmentName") as string | undefined
        const investmentId = row.original.investmentId

        if (!investmentName) return <div>—</div>

        return (
          <div>
            <CustomLink to={`/investments/${investmentId}`}>
              <Badge variant="secondary" className="gba:cursor-pointer gba:hover:bg-secondary/80">
                {investmentName}
              </Badge>
            </CustomLink>
          </div>
        )
      },
    },
    {
      accessorKey: "investmentId",
      header: "Investment ID",
      enableGlobalFilter: false,
      enableColumnFilter: true,
      cell: ({ row }) => null, 
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
    data,
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
        <div className="gba:p-4 gba:border gba:border-gray-300 gba:rounded-lg gba:bg-white">
          <h1 className="gba:text-2xl gba:font-bold">Opportunities</h1>
          <p className="gba:text-gray-500">Manage your sales opportunities</p>
        </div>
        
        <div className="gba:grid gba:grid-cols-4 gba:gap-4 gba:mb-6">
          <div className="gba:p-4 gba:border gba:border-gray-300 gba:rounded-lg">
            <h3 className="gba:text-sm gba:text-gray-500">Total Opportunities</h3>
            <p className="gba:text-2xl gba:font-bold">{data.length}</p>
          </div>
          <div className="gba:p-4 gba:border gba:border-gray-300 gba:rounded-lg">
            <h3 className="gba:text-sm gba:text-gray-500">Active Opportunities</h3>
            <p className="gba:text-2xl gba:font-bold">{data.filter(opp => opp.stageName !== "Closed Won" && opp.stageName !== "Closed Lost").length}</p>
          </div>
          <div className="gba:p-4 gba:border gba:border-gray-300 gba:rounded-lg">
            <h3 className="gba:text-sm gba:text-gray-500">Total Value</h3>
            <p className="gba:text-2xl gba:font-bold">${data.reduce((sum, opp) => {
              const numValue = typeof opp.value === 'string' ? parseFloat(opp.value) || 0 : (opp.value || 0);
              return sum + numValue;
            }, 0).toLocaleString()}</p>
          </div>
          <div className="gba:p-4 gba:border gba:border-gray-300 gba:rounded-lg">
            <h3 className="gba:text-sm gba:text-gray-500">Win Rate</h3>
            <p className="gba:text-2xl gba:font-bold">
              {data.length ? Math.round(
                (data.filter(opp => opp.stageName === "Closed Won").length / 
                (data.filter(opp => opp.stageName === "Closed Won" || opp.stageName === "Closed Lost").length || 1)) * 100
              ) : 0}%
            </p>
          </div>
        </div>

        <div className="gba:flex gba:items-center gba:justify-between gba:py-4">
          <div className="gba:flex gba:items-center gba:gap-3">
            <Input
              placeholder="Filter opportunities..."
              value={(table.getColumn("name")?.getFilterValue() as string) ?? ""}
              onChange={(event) => table.getColumn("name")?.setFilterValue(event.target.value)}
              className="gba:max-w-sm gba:border-gray-300"
            />
            <div className="gba:relative">
              <Select
                value={(table.getColumn("investmentId")?.getFilterValue() as string) ?? ""}
                onValueChange={(value) => table.getColumn("investmentId")?.setFilterValue(value === "all" ? "" : value)}
              >
                <SelectTrigger className="gba:w-[200px] gba:border-gray-300">
                  <SelectValue placeholder="Filter for..." />
                </SelectTrigger>
                <SelectContent sideOffset={4} className="gba:bg-white gba:w-[240px] gba:border gba:border-gray-300 gba:shadow-md">
                  <SelectItem value="all">All Investments</SelectItem>
                  {investments.map((investment) => (
                    <SelectItem key={investment.id} value={investment.id}>
                      {investment.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="gba:relative">
              <Select
                value={(table.getColumn("type")?.getFilterValue() as string) ?? ""}
                onValueChange={(value) => table.getColumn("type")?.setFilterValue(value === "all" ? "" : value)}
              >
                <SelectTrigger className="gba:w-[160px] gba:border-gray-300">
                  <SelectValue placeholder="Filter by..." />
                </SelectTrigger>
                <SelectContent sideOffset={4} className="gba:bg-white gba:w-[200px] gba:border gba:border-gray-300 gba:shadow-md">
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="incoming">
                    <div className="gba:flex gba:items-center">
                      <ArrowLeft className="gba:mr-2 gba:h-4 gba:w-4 gba:text-red-500" />
                      Incoming
                    </div>
                  </SelectItem>
                  <SelectItem value="outgoing">
                    <div className="gba:flex gba:items-center">
                      <ArrowRight className="gba:mr-2 gba:h-4 gba:w-4 gba:text-green-500" />
                      Outgoing
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
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
              {table.getRowModel().rows?.length ? (
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
                    No opportunities found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
        <div className="gba:flex gba:items-center gba:justify-end gba:space-x-2 gba:py-4">
          <div className="gba:flex-1 gba:text-sm gba:text-muted-foreground">
            {table.getFilteredSelectedRowModel().rows.length} of {table.getFilteredRowModel().rows.length} row(s)
            selected.
          </div>
          <div className="gba:space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
              className="gba:border-gray-300"
            >
              Previous
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => table.nextPage()} 
              disabled={!table.getCanNextPage()}
              className="gba:border-gray-300"
            >
              Next
            </Button>
          </div>
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
  )
}
