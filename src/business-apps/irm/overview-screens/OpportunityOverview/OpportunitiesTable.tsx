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
          <div className="flex items-center">
            {type === "incoming" ? (
              <div className="flex items-center" title="Incoming">
                <ArrowLeft className="h-5 w-5 text-red-500" />
                <span className="sr-only">Incoming</span>
              </div>
            ) : (
              <div className="flex items-center" title="Outgoing">
                <ArrowRight className="h-5 w-5 text-green-500" />
                <span className="sr-only">Outgoing</span>
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
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        )
      },
      cell: ({ row }) => {
        const id = row.original.id;
        const name = row.getValue("name");
        
        return (
          <div className="font-medium">
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                
                console.log("BUTTON CLICK DETECTED for opportunity:", id);
                
                handleOpportunityClick(id);
              }}
              className="text-left hover:underline cursor-pointer border-none bg-transparent p-0 m-0"
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
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        )
      },
      cell: ({ row }) => {
        const value = row.getValue("value") as string
        const currency = row.original.currency || "USD"

        return <div className="font-medium">{value ? `${currency} ${value}` : "—"}</div>
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
              <Badge variant="secondary" className="cursor-pointer hover:bg-secondary/80">
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
              <Button variant="ghost" className="h-8 w-8 p-0 hover:bg-transparent focus:bg-transparent focus:ring-0 focus:ring-offset-0">
                <span className="sr-only">Open menu</span>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-white border border-gray-300 shadow-md w-[150px]">
              <div className="px-2 py-1.5 text-sm font-semibold">Actions</div>
              <DropdownMenuItem className="cursor-pointer focus:bg-gray-100" onClick={() => navigate(`/opportunities/${opportunity.id}`)}>
                View Details
              </DropdownMenuItem>
              <DropdownMenuItem className="cursor-pointer focus:bg-gray-100">
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem className="cursor-pointer focus:bg-gray-100">
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
    <div className="w-full">
      <div className="flex flex-col">
        <div className="p-4 border border-gray-300 rounded-lg bg-white">
          <h1 className="text-2xl font-bold">Opportunities</h1>
          <p className="text-gray-500">Manage your sales opportunities</p>
        </div>
        
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="p-4 border border-gray-300 rounded-lg">
            <h3 className="text-sm text-gray-500">Total Opportunities</h3>
            <p className="text-2xl font-bold">{data.length}</p>
          </div>
          <div className="p-4 border border-gray-300 rounded-lg">
            <h3 className="text-sm text-gray-500">Active Opportunities</h3>
            <p className="text-2xl font-bold">{data.filter(opp => opp.stageName !== "Closed Won" && opp.stageName !== "Closed Lost").length}</p>
          </div>
          <div className="p-4 border border-gray-300 rounded-lg">
            <h3 className="text-sm text-gray-500">Total Value</h3>
            <p className="text-2xl font-bold">${data.reduce((sum, opp) => {
              const numValue = typeof opp.value === 'string' ? parseFloat(opp.value) || 0 : (opp.value || 0);
              return sum + numValue;
            }, 0).toLocaleString()}</p>
          </div>
          <div className="p-4 border border-gray-300 rounded-lg">
            <h3 className="text-sm text-gray-500">Win Rate</h3>
            <p className="text-2xl font-bold">
              {data.length ? Math.round(
                (data.filter(opp => opp.stageName === "Closed Won").length / 
                (data.filter(opp => opp.stageName === "Closed Won" || opp.stageName === "Closed Lost").length || 1)) * 100
              ) : 0}%
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between py-4">
          <div className="flex items-center gap-3">
            <Input
              placeholder="Filter opportunities..."
              value={(table.getColumn("name")?.getFilterValue() as string) ?? ""}
              onChange={(event) => table.getColumn("name")?.setFilterValue(event.target.value)}
              className="max-w-sm border-gray-300"
            />
            <div className="relative">
              <Select
                value={(table.getColumn("investmentId")?.getFilterValue() as string) ?? ""}
                onValueChange={(value) => table.getColumn("investmentId")?.setFilterValue(value === "all" ? "" : value)}
              >
                <SelectTrigger className="w-[200px] border-gray-300">
                  <SelectValue placeholder="Filter for..." />
                </SelectTrigger>
                <SelectContent sideOffset={4} className="bg-white w-[240px] border border-gray-300 shadow-md">
                  <SelectItem value="all">All Investments</SelectItem>
                  {investments.map((investment) => (
                    <SelectItem key={investment.id} value={investment.id}>
                      {investment.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="relative">
              <Select
                value={(table.getColumn("type")?.getFilterValue() as string) ?? ""}
                onValueChange={(value) => table.getColumn("type")?.setFilterValue(value === "all" ? "" : value)}
              >
                <SelectTrigger className="w-[160px] border-gray-300">
                  <SelectValue placeholder="Filter by..." />
                </SelectTrigger>
                <SelectContent sideOffset={4} className="bg-white w-[200px] border border-gray-300 shadow-md">
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="incoming">
                    <div className="flex items-center">
                      <ArrowLeft className="mr-2 h-4 w-4 text-red-500" />
                      Incoming
                    </div>
                  </SelectItem>
                  <SelectItem value="outgoing">
                    <div className="flex items-center">
                      <ArrowRight className="mr-2 h-4 w-4 text-green-500" />
                      Outgoing
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setIsCreateModalOpen(true)} className="ml-auto border-gray-300">
              <Plus className="mr-2 h-4 w-4" />
              New Opportunity
            </Button>
            <div className="relative">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="border-gray-300">
                    Columns <ChevronDown className="ml-2 h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="bg-white border border-gray-300 shadow-md w-[200px]">
                  {table
                    .getAllColumns()
                    .filter((column) => column.getCanHide())
                    .map((column) => {
                      return (
                        <DropdownMenuCheckboxItem
                          key={column.id}
                          className="capitalize"
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
        
        <div className="rounded-md border border-gray-300">
          <Table>
            <TableHeader className="border-b border-gray-300">
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id} className="border-b border-gray-300">
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
                  <TableRow key={row.id} data-state={row.getIsSelected() && "selected"} className="border-b border-gray-300">
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (
                <TableRow className="border-b border-gray-300">
                  <TableCell colSpan={columns.length} className="h-24 text-center">
                    No opportunities found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
        <div className="flex items-center justify-end space-x-2 py-4">
          <div className="flex-1 text-sm text-muted-foreground">
            {table.getFilteredSelectedRowModel().rows.length} of {table.getFilteredRowModel().rows.length} row(s)
            selected.
          </div>
          <div className="space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
              className="border-gray-300"
            >
              Previous
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => table.nextPage()} 
              disabled={!table.getCanNextPage()}
              className="border-gray-300"
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
