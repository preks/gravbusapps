import React, { useState, useMemo, useCallback } from 'react'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Button,
  Alert,
  AlertTitle,
  AlertDescription,
  DataTable,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogClose,
  DialogFooter,
  CardDescription
} from '@newwork/nw-design-system'
import {
  MagnifyingGlassIcon,
  PlusIcon,
  ArrowsDownUpIcon,
  PencilSimpleLineIcon,
  WarningIcon,
  TrashIcon
} from '@phosphor-icons/react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { DebouncedInput } from '@/components/debounced-input/DebouncedInput'
import { formatDataTestId } from '@/common/utils/formatDataTestId'
import { ColumnDef, SortingState } from '@tanstack/react-table'
import BreakTypeForm from '../../../../forms/time-attendance/BreakTypeForm'
import { useBreakTypesData } from '../../hooks/useBreakTypesData'
import { useRestClient } from '@/common/network/rest/useRestClient'
import { env } from '@/common/env/EnvUtils'
import { BreakType } from '../../types/break-types'

export interface BreakTypesProps extends BusinessAppContextProps {
  prefixDataTestId?: string
}

const DATA_TEST_ID_PREFIX = 'BreakTypes'

export const BreakTypesTab: React.FC<BreakTypesProps> = ({ accessToken, prefixDataTestId }) => {
  const dataTestId = formatDataTestId(prefixDataTestId, DATA_TEST_ID_PREFIX)
  const restClient = useRestClient(env('NEXT_PUBLIC_KOGITO_PROCESSES_ENDPOINT'))

  // Use real data from GraphQL
  const { breakTypes, loading, error, refetch } = useBreakTypesData({ accessToken })

  // State management
  const [searchTerm, setSearchTerm] = useState('')
  const [sorting, setSorting] = useState<SortingState>([])
  const [selectedBreakType, setSelectedBreakType] = useState<BreakType | null>(null)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  // Filter break types based on search term
  const filteredBreakTypes = useMemo(() => {
    if (!searchTerm.trim()) return breakTypes

    return breakTypes.filter(
      breakType =>
        breakType.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        breakType.name.toLowerCase().includes(searchTerm.toLowerCase())
    )
  }, [breakTypes, searchTerm])

  // Used codes for validation
  const usedCodes = useMemo(() => {
    return breakTypes.map(breakType => breakType.code)
  }, [breakTypes])

  const dataTable = useMemo(() => filteredBreakTypes.map(item => item), [filteredBreakTypes])

  const renderBreakTypesTable = () => {
    const columns: ColumnDef<BreakType>[] = [
      {
        accessorKey: 'code',
        header: ({ column }) => (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            className="gba:h-auto gba:p-0 gba:font-semibold gba:hover:bg-transparent gba:justify-start"
          >
            Code
            <ArrowsDownUpIcon className="gba:ml-2 gba:h-4 gba:w-4" />
          </Button>
        ),
        enableSorting: true,
        enableColumnFilter: true,
        cell: ({ getValue }) => {
          const code = getValue()
          return code as string
        }
      },
      {
        accessorKey: 'name',
        header: ({ column }) => (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            className="gba:h-auto gba:p-0 gba:font-semibold gba:hover:bg-transparent gba:justify-start"
          >
            Name
          </Button>
        ),
        enableSorting: false,
        cell: ({ getValue }) => {
          const name = getValue()
          return (
            <div className="gba:flex gba:items-center">
              <div className="gba:font-semibold">{name as string}</div>
            </div>
          )
        }
      },
      {
        id: 'actions',
        header: 'Actions',
        enableSorting: false,
        enableHiding: true,
        cell: ({ row }) => {
          const targetBreakType = breakTypes.find(breakType => breakType.id === row.original.id)

          return (
            <div className="gba:flex gba:items-center gba:justify-center">
              <BreakTypeForm
                childAddButton={
                  <Button variant="ghost" onClick={event => event.stopPropagation()}>
                    <PencilSimpleLineIcon />
                  </Button>
                }
                refetch={refetch}
                accessToken={accessToken}
                prefixDataTestId={prefixDataTestId}
                breakType={targetBreakType as BreakType}
                usedCodes={usedCodes}
                key={targetBreakType?.id}
              />
              <Button
                variant="ghost"
                onClick={event => {
                  event.stopPropagation()
                  setSelectedBreakType(targetBreakType ?? null)
                  setIsDeleteDialogOpen(true)
                }}
              >
                <TrashIcon />
              </Button>
            </div>
          )
        }
      }
    ]

    return (
      <DataTable
        data={dataTable}
        columns={columns as ColumnDef<(typeof dataTable)[number]>[]}
        enableSorting
        enablePagination
        sorting={sorting}
        onSortingChange={setSorting}
      />
    )
  }

  // Handle search
  const handleSearch = useCallback((value: string) => {
    setSearchTerm(value)
  }, [])

  // Handle delete break type
  const handleDeleteBreakType = useCallback(async (breakType?: BreakType | null) => {
    if (!breakType) return
    setIsDeleting(true)

    try {
      await restClient.post(
        '/employee-time/deleteBreakType',
        {
          changeMode: 'POST',
          breakType: {
            id: breakType.id,
            version: breakType.version
          }
        },
        {
          headers: { Authorization: `Bearer ${accessToken}` }
        }
      )

      await refetch()
      setIsDeleteDialogOpen(false)
      setSelectedBreakType(null)
    } catch (error) {
      console.error('Error deleting break type:', error)
    } finally {
      setIsDeleting(false)
      setIsDeleteDialogOpen(false)
      setSelectedBreakType(null)
    }
  }, [])

  // Show error state
  if (error) {
    return (
      <Alert variant="destructive" data-testid={formatDataTestId(dataTestId, 'error-alert')}>
        <AlertTitle>Error Loading Break Types</AlertTitle>
        <AlertDescription>{error.message}</AlertDescription>
      </Alert>
    )
  }

  return (
    <Card data-testid={formatDataTestId(dataTestId, 'table-card')}>
      {!loading && (
        <CardHeader className="gba:space-y-1.5 gba:p-3 gba:border-b">
          <div className="gba:flex gba:justify-between gba:items-center gba:w-full">
            <div className="gba:flex gba:flex-col gba:gap-2 gba:h-full">
              <CardTitle className="gba:text-2xl gba:font-semibold gba:leading-none gba:tracking-tight">
                Break Types ({breakTypes.length})
              </CardTitle>
              <CardDescription className="gba:text-sm gba:text-muted-foreground">
                Configure break types for time calculations.
              </CardDescription>
            </div>
            <BreakTypeForm
              childAddButton={
                <Button
                  onClick={e => {
                    e.stopPropagation()
                  }}
                  data-testid={formatDataTestId(dataTestId, 'add-button')}
                  className="gba:flex gba:items-center gba:gap-2"
                >
                  <PlusIcon size={16} />
                  Add Break Type
                </Button>
              }
              refetch={refetch}
              accessToken={accessToken}
              prefixDataTestId={prefixDataTestId}
              usedCodes={usedCodes}
            />
          </div>
        </CardHeader>
      )}

      <CardContent className="gba:p-0">
        <div className="gba:overflow-x-auto gba:p-6">
          <div className="gba:flex gba:items-center gba:justify-between gba:gap-4 gba:mb-6">
            <div className="gba:flex-1">
              <DebouncedInput
                value={searchTerm}
                onChange={handleSearch}
                placeholder="Search break types..."
                icon={<MagnifyingGlassIcon size={16} />}
                data-testid={formatDataTestId(dataTestId, 'search-input')}
                className="gba:max-w-md"
              />
            </div>
            <div className="gba:text-sm gba:text-gray-600">
              {filteredBreakTypes.length} of {breakTypes.length} break types
            </div>
          </div>

          {renderBreakTypesTable()}
        </div>

        <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="gba:flex gba:items-center gba:gap-2">
                <WarningIcon className="gba:text-destructive" />
                Delete Break Type
              </DialogTitle>
              <DialogDescription>{`Are you sure you want to delete ${selectedBreakType?.name ?? ''}?`}</DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline">Cancel</Button>
              </DialogClose>
              <Button variant="destructive" onClick={() => handleDeleteBreakType(selectedBreakType)}>
                {isDeleting ? 'Deleting...' : 'Delete'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  )
}

export default BreakTypesTab
