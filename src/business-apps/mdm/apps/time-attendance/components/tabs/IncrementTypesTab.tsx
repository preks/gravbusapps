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
import IncrementTypeForm from '../../../../forms/time-attendance/IncrementTypeForm'
import { useIncrementTypesData, IncrementType } from '../../hooks/useIncrementTypesData'
import { useRestClient } from '@/common/network/rest/useRestClient'
import { env } from '@/common/env/EnvUtils'

export interface IncrementTypesProps extends BusinessAppContextProps {
  prefixDataTestId?: string
}

const DATA_TEST_ID_PREFIX = 'IncrementTypes'

export const IncrementTypesTab: React.FC<IncrementTypesProps> = ({ accessToken, prefixDataTestId }) => {
  const dataTestId = formatDataTestId(prefixDataTestId, DATA_TEST_ID_PREFIX)
  const restClient = useRestClient(env('NEXT_PUBLIC_KOGITO_PROCESSES_ENDPOINT'))

  // Use real data from GraphQL
  const { incrementTypes, loading, error, refetch } = useIncrementTypesData({ accessToken })

  // State management
  const [searchTerm, setSearchTerm] = useState('')
  const [sorting, setSorting] = useState<SortingState>([])
  const [selectedIncrementType, setSelectedIncrementType] = useState<IncrementType | null>(null)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  // Filter increment types based on search term
  const filteredIncrementTypes = useMemo(() => {
    if (!searchTerm.trim()) return incrementTypes

    return incrementTypes.filter(
      incrementType =>
        incrementType.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        incrementType.name.toLowerCase().includes(searchTerm.toLowerCase())
    )
  }, [incrementTypes, searchTerm])

  // Used codes for validation
  const usedCodes = useMemo(() => {
    return incrementTypes.map(incrementType => incrementType.code)
  }, [incrementTypes])

  const dataTable = useMemo(() => filteredIncrementTypes.map(item => item), [filteredIncrementTypes])

  const renderIncrementTypesTable = () => {
    const columns: ColumnDef<IncrementType>[] = [
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
          const targetIncrementType = incrementTypes.find(incrementType => incrementType.id === row.original.id)

          return (
            <div className="gba:flex gba:items-center gba:justify-center">
              <IncrementTypeForm
                childAddButton={
                  <Button variant="ghost" onClick={event => event.stopPropagation()}>
                    <PencilSimpleLineIcon />
                  </Button>
                }
                refetch={refetch}
                accessToken={accessToken}
                prefixDataTestId={prefixDataTestId}
                incrementType={targetIncrementType as IncrementType}
                usedCodes={usedCodes}
                key={targetIncrementType?.id}
              />
              <Button
                variant="ghost"
                onClick={event => {
                  event.stopPropagation()
                  setSelectedIncrementType(targetIncrementType ?? null)
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

  // Handle delete increment type
  const handleDeleteIncrementType = useCallback(async (incrementType?: IncrementType | null) => {
    if (!incrementType) return
    setIsDeleting(true)

    try {
      await restClient.post(
        '/employee-time/deleteIncrementType',
        {
          changeMode: 'POST',
          incrementType: {
            id: incrementType.id,
            version: incrementType.version
          }
        },
        {
          headers: { Authorization: `Bearer ${accessToken}` }
        }
      )

      await refetch()
      setIsDeleteDialogOpen(false)
      setSelectedIncrementType(null)
    } catch (error) {
      console.error('Error deleting increment type:', error)
    } finally {
      setIsDeleting(false)
      setIsDeleteDialogOpen(false)
      setSelectedIncrementType(null)
    }
  }, [])

  // Show error state
  if (error) {
    return (
      <Alert variant="destructive" data-testid={formatDataTestId(dataTestId, 'error-alert')}>
        <AlertTitle>Error Loading Increment Types</AlertTitle>
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
                Increment Types ({incrementTypes.length})
              </CardTitle>
              <CardDescription className="gba:text-sm gba:text-muted-foreground">
                Configure increment types for time calculations.
              </CardDescription>
            </div>
            <IncrementTypeForm
              childAddButton={
                <Button
                  onClick={e => {
                    e.stopPropagation()
                  }}
                  data-testid={formatDataTestId(dataTestId, 'add-button')}
                  className="gba:flex gba:items-center gba:gap-2"
                >
                  <PlusIcon size={16} />
                  Add Increment Type
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
                placeholder="Search increment types..."
                icon={<MagnifyingGlassIcon size={16} />}
                data-testid={formatDataTestId(dataTestId, 'search-input')}
                className="gba:max-w-md"
              />
            </div>
            <div className="gba:text-sm gba:text-gray-600">
              {filteredIncrementTypes.length} of {incrementTypes.length} increment types
            </div>
          </div>

          {renderIncrementTypesTable()}
        </div>

        <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="gba:flex gba:items-center gba:gap-2">
                <WarningIcon className="gba:text-destructive" />
                Delete Increment Type
              </DialogTitle>
              <DialogDescription>{`Are you sure you want to delete ${selectedIncrementType?.name ?? ''}?`}</DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline">Cancel</Button>
              </DialogClose>
              <Button variant="destructive" onClick={() => handleDeleteIncrementType(selectedIncrementType)}>
                {isDeleting ? 'Deleting...' : 'Delete'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  )
}

export default IncrementTypesTab
