import React, { useCallback, useMemo, useState } from 'react'
import {
  DataTable,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
  Badge
} from '@newwork/nw-design-system'
import { ColumnDef } from '@tanstack/react-table'
import { Button } from '@newwork/nw-design-system'
import { MagnifyingGlassIcon, PencilSimpleLineIcon, TrashIcon, WarningIcon } from '@phosphor-icons/react'
import { DebouncedInput } from '@/components/debounced-input/DebouncedInput'
import { formatDataTestId } from '@/common/utils/formatDataTestId'
import dayjs from 'dayjs'
import { useRestClient } from '@/common/network/rest/useRestClient'
import { env } from '@/common/env/EnvUtils'
import { TransformedIncrementTypeVersion } from '../../types/increment-type-versions'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'

interface IncrementTypesVersionProps {
  incrementTypeVersions: TransformedIncrementTypeVersion[]
  refetch: () => Promise<void>
  accessToken: string
  prefixDataTestId?: string
  onEdit?: (version: TransformedIncrementTypeVersion) => void
}

const DATA_TEST_ID_PREFIX = 'IncrementTypesVersion'

export const IncrementTypesVersion: React.FC<IncrementTypesVersionProps> = ({
  incrementTypeVersions,
  refetch,
  accessToken,
  prefixDataTestId = '',
  onEdit
}) => {
  const dataTestId = formatDataTestId(prefixDataTestId, DATA_TEST_ID_PREFIX)
  const restClient = useRestClient(env('NEXT_PUBLIC_KOGITO_PROCESSES_ENDPOINT'))
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedIncrementTypeVersion, setSelectedIncrementTypeVersion] =
    useState<TransformedIncrementTypeVersion | null>(null)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const handleSearch = useCallback((value: string) => {
    setSearchTerm(value)
  }, [])

  const handleDeleteIncrementTypeVersion = useCallback(
    async (incrementTypeVersion?: TransformedIncrementTypeVersion | null) => {
      if (!incrementTypeVersion) return
      setIsDeleting(true)

      try {
        await restClient.post(
          '/employee-time/deleteIncrementTypeVersion',
          {
            changeMode: 'DELETE',
            incrementTypeVersion: {
              id: incrementTypeVersion.id,
              version: incrementTypeVersion.version
            }
          },
          {
            headers: { Authorization: `Bearer ${accessToken}` }
          }
        )

        await refetch()
      } catch (error) {
        console.error('Error deleting increment type version:', error)
      } finally {
        setIsDeleting(false)
        setIsDeleteDialogOpen(false)
        setSelectedIncrementTypeVersion(null)
      }
    },
    []
  )

  const filteredIncrementTypeVersions = useMemo(() => {
    if (!searchTerm.trim()) return incrementTypeVersions

    return incrementTypeVersions.filter(
      incrementTypeVersion =>
        incrementTypeVersion.incrementType?.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        incrementTypeVersion.incrementType?.name.toLowerCase().includes(searchTerm.toLowerCase())
    )
  }, [incrementTypeVersions, searchTerm])

  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A'
    return dayjs(dateString).format('DD MMM YYYY')
  }

  const columns: ColumnDef<TransformedIncrementTypeVersion>[] = [
    {
      accessorKey: 'incrementType',
      header: 'Increment Type',
      cell: ({ getValue }) => {
        const incrementType = getValue() as TransformedIncrementTypeVersion['incrementType']
        return incrementType ? `${incrementType.code} - ${incrementType.name}` : 'N/A'
      }
    },
    {
      accessorKey: 'activeFrom',
      header: 'Valid From',
      cell: ({ getValue }) => formatDate((getValue() as string) || '')
    },
    {
      accessorKey: 'activeTo',
      header: 'Valid To',
      cell: ({ getValue }) => formatDate((getValue() as string) || '')
    },
    {
      accessorKey: 'activeVersion',
      header: 'Version',
      cell: ({ getValue }) => getValue() as string
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => {
        const activeFrom = row.original.activeFrom
        const activeTo = row.original.activeTo
        const currentDate = new Date()
        if (activeFrom && activeTo) {
          if (currentDate >= new Date(activeFrom) && currentDate <= new Date(activeTo)) {
            return <Badge variant="default">Active</Badge>
          }
        }
        return <Badge variant="outline">Expired</Badge>
      }
    },
    {
      accessorKey: 'increments',
      header: 'Increments',
      cell: ({ getValue }) => {
        const increments = getValue() as number
        return (
          <Badge variant="outline">
            {`${increments}
            ${
              increments === 1
                ? getTranslationFromI18nKeyAndLabel(
                    'master-data:hr.time_attendance.increment_types.version.increment',
                    'Increment'
                  )
                : getTranslationFromI18nKeyAndLabel(
                    'master-data:hr.time_attendance.increment_types.version.increments',
                    'Increments'
                  )
            }`}
          </Badge>
        )
      }
    },
    {
      id: 'actions',
      header: 'Actions',
      enableSorting: false,
      cell: ({ row }) => {
        const version = row.original

        return (
          <div className="gba:flex gba:items-center gba:justify-center gba:gap-1">
            <Button
              variant="ghost"
              onClick={event => {
                event.stopPropagation()
                onEdit?.(version)
              }}
              data-testid={formatDataTestId(dataTestId, `edit-version-button-${version.id}`)}
            >
              <PencilSimpleLineIcon />
            </Button>
            <Button
              variant="ghost"
              onClick={event => {
                event.stopPropagation()
                setSelectedIncrementTypeVersion(version ?? null)
                setIsDeleteDialogOpen(true)
              }}
              data-testid={formatDataTestId(dataTestId, `delete-version-button-${version.id}`)}
            >
              <TrashIcon />
            </Button>
          </div>
        )
      }
    }
  ]

  return (
    <div className="gba:space-y-4" data-testid={formatDataTestId(dataTestId, 'increment-types-version')}>
      <div className="gba:flex gba:items-center gba:justify-between gba:gap-4 gba:mb-6">
        <div className="gba:flex-1">
          <DebouncedInput
            value={searchTerm}
            onChange={handleSearch}
            placeholder="Search increment type versions..."
            icon={<MagnifyingGlassIcon size={16} />}
            data-testid={formatDataTestId(dataTestId, 'search-input')}
            className="gba:max-w-md"
          />
        </div>
        <div className="gba:text-sm gba:text-gray-600">
          {filteredIncrementTypeVersions.length} of {incrementTypeVersions.length} increment type versions
        </div>
      </div>
      <DataTable
        columns={columns}
        data={filteredIncrementTypeVersions}
        data-testid={formatDataTestId(dataTestId, 'increment-types-version-table')}
      />

      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="gba:flex gba:items-center gba:gap-2">
              <WarningIcon className="gba:text-destructive" />
              Delete Increment Type Version
            </DialogTitle>
            <DialogDescription>{`Are you sure you want to delete ${`${selectedIncrementTypeVersion?.incrementType?.name} Version`}?`}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button
              variant="destructive"
              onClick={() => handleDeleteIncrementTypeVersion(selectedIncrementTypeVersion)}
            >
              {isDeleting ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default IncrementTypesVersion
