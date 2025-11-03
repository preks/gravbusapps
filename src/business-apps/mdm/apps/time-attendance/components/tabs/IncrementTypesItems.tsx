import React, { useCallback, useMemo, useState } from 'react'
import {
  DataTable,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose
} from '@newwork/nw-design-system'
import { ColumnDef } from '@tanstack/react-table'
import { Button } from '@newwork/nw-design-system'
import { MagnifyingGlassIcon, PencilSimpleLineIcon, TrashIcon, WarningIcon } from '@phosphor-icons/react'
import { DebouncedInput } from '@/components/debounced-input/DebouncedInput'
import { formatDataTestId } from '@/common/utils/formatDataTestId'
import IncrementTypeForm from '@/business-apps/mdm/forms/time-attendance/IncrementTypeForm'
import { TransformedIncrementTypeVersion } from '../../types/increment-type-versions'
import { SimpleIncrementType } from '../../types/increment-types'
import { useRestClient } from '@/common/network/rest/useRestClient'
import { env } from '@/common/env/EnvUtils'

interface IncrementTypesItemsProps {
  incrementTypes: SimpleIncrementType[]
  incrementTypeVersions: TransformedIncrementTypeVersion[]
  refetch: () => void
  accessToken: string
  prefixDataTestId?: string
  onConfigure: (incrementTypeVersion: TransformedIncrementTypeVersion) => void
}

const DATA_TEST_ID_PREFIX = 'IncrementTypesItems'

export const IncrementTypesItems: React.FC<IncrementTypesItemsProps> = ({
  incrementTypes,
  incrementTypeVersions,
  refetch,
  accessToken,
  prefixDataTestId = '',
  onConfigure
}) => {
  const dataTestId = formatDataTestId(prefixDataTestId, DATA_TEST_ID_PREFIX)
  const restClient = useRestClient(env('NEXT_PUBLIC_KOGITO_PROCESSES_ENDPOINT'))
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedIncrementType, setSelectedIncrementType] = useState<SimpleIncrementType | null>(null)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const filteredIncrementTypes = useMemo(() => {
    if (!searchTerm.trim()) return incrementTypes

    return incrementTypes.filter(
      incrementType =>
        incrementType.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        incrementType.name.toLowerCase().includes(searchTerm.toLowerCase())
    )
  }, [incrementTypes, searchTerm])

  const handleSearch = useCallback((value: string) => {
    setSearchTerm(value)
  }, [])

  // Find the latest active incrementTypeVersion for a given incrementType
  const getLatestIncrementTypeVersion = useCallback(
    (incrementType: SimpleIncrementType): TransformedIncrementTypeVersion | null => {
      if (!incrementType.incrementTypeVersion || incrementType.incrementTypeVersion.length === 0) {
        return null
      }

      // Get the last ID from the incrementTypeVersion array (most recent)
      const latestVersionId = incrementType.incrementTypeVersion[incrementType.incrementTypeVersion.length - 1]

      // Find the corresponding incrementTypeVersion in the versions list
      return incrementTypeVersions.find(version => version.id === latestVersionId) || null
    },
    [incrementTypeVersions]
  )

  // Handle row click to configure the latest incrementTypeVersion
  const handleRowClick = useCallback(
    (incrementType: SimpleIncrementType) => {
      const latestVersion = getLatestIncrementTypeVersion(incrementType)

      if (latestVersion) {
        onConfigure(latestVersion)
      } else {
        const partialVersion: TransformedIncrementTypeVersion = {
          id: '',
          activeVersion: '',
          activeFrom: null,
          activeTo: null,
          version: 0,
          incrementType: {
            id: incrementType.id,
            name: incrementType.name,
            code: incrementType.code
          }
        }
        onConfigure(partialVersion)
      }
    },
    [getLatestIncrementTypeVersion, onConfigure]
  )

  // Handle delete increment type
  const handleDeleteIncrementType = useCallback(
    async (incrementType?: SimpleIncrementType | null) => {
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
    },
    [restClient, accessToken, refetch]
  )

  const columns: ColumnDef<SimpleIncrementType>[] = [
    {
      accessorKey: 'code',
      header: 'Code',
      enableSorting: true
    },
    {
      accessorKey: 'name',
      header: 'Name',
      enableSorting: true
    },
    {
      id: 'actions',
      header: 'Actions',
      enableSorting: false,
      enableHiding: true,
      cell: ({ row }) => {
        const targetIncrementType = incrementTypes.find(incrementType => incrementType.id === row.original.id)

        return (
          <div className="gba:flex gba:items-center gba:justify-center gba:gap-1">
            <IncrementTypeForm
              childAddButton={
                <Button variant="ghost" onClick={event => event.stopPropagation()}>
                  <PencilSimpleLineIcon />
                </Button>
              }
              refetch={refetch}
              accessToken={accessToken}
              prefixDataTestId={prefixDataTestId}
              incrementType={targetIncrementType || undefined}
              usedCodes={incrementTypes.map(it => it.code).filter((code, index, self) => self.indexOf(code) === index)}
              key={targetIncrementType?.id}
            />
            <Button
              variant="ghost"
              onClick={event => {
                event.stopPropagation()
                setSelectedIncrementType(targetIncrementType ?? null)
                setIsDeleteDialogOpen(true)
              }}
              data-testid={formatDataTestId(prefixDataTestId, `delete-button-${targetIncrementType?.id}`)}
            >
              <TrashIcon />
            </Button>
          </div>
        )
      }
    }
  ]

  return (
    <div className="gba:space-y-4" data-testid={formatDataTestId(prefixDataTestId, 'increment-types-items')}>
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
      <DataTable
        columns={columns}
        data={filteredIncrementTypes}
        data-testid={formatDataTestId(prefixDataTestId, 'increment-types-items-table')}
        onRowClick={handleRowClick}
      />

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
    </div>
  )
}

export default IncrementTypesItems
