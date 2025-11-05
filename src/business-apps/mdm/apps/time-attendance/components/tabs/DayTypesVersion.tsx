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
import { TransformedDayTypeVersion } from '../../types/day-type-versions'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'

interface DayTypesVersionProps {
  dayTypeVersions: TransformedDayTypeVersion[]
  refetch: () => Promise<void>
  accessToken: string
  prefixDataTestId?: string
  onEdit?: (version: TransformedDayTypeVersion) => void
}

const DATA_TEST_ID_PREFIX = 'DayTypesVersion'

export const DayTypesVersion: React.FC<DayTypesVersionProps> = ({
  dayTypeVersions,
  refetch,
  accessToken,
  prefixDataTestId = '',
  onEdit
}) => {
  const dataTestId = formatDataTestId(prefixDataTestId, DATA_TEST_ID_PREFIX)
  const restClient = useRestClient(env('NEXT_PUBLIC_KOGITO_PROCESSES_ENDPOINT'))
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedDayTypeVersion, setSelectedDayTypeVersion] = useState<TransformedDayTypeVersion | null>(null)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const handleSearch = useCallback((value: string) => {
    setSearchTerm(value)
  }, [])

  const handleDeleteDayTypeVersion = useCallback(async (dayTypeVersion?: TransformedDayTypeVersion | null) => {
    if (!dayTypeVersion) return
    setIsDeleting(true)

    try {
      await restClient.post(
        '/employee-time/deleteDayTypeVersion',
        {
          changeMode: 'DELETE',
          dayTypeVersion: {
            id: dayTypeVersion.id,
            version: dayTypeVersion.version
          }
        },
        {
          headers: { Authorization: `Bearer ${accessToken}` }
        }
      )

      await refetch()
    } catch (error) {
      console.error('Error deleting day type version:', error)
    } finally {
      setIsDeleting(false)
      setIsDeleteDialogOpen(false)
      setSelectedDayTypeVersion(null)
    }
  }, [])

  const filteredDayTypeVersions = useMemo(() => {
    if (!searchTerm.trim()) return dayTypeVersions

    return dayTypeVersions.filter(
      dayTypeVersion =>
        dayTypeVersion.dayType?.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        dayTypeVersion.dayType?.name.toLowerCase().includes(searchTerm.toLowerCase())
    )
  }, [dayTypeVersions, searchTerm])

  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A'
    return dayjs(dateString).format('DD MMM YYYY')
  }

  const columns: ColumnDef<TransformedDayTypeVersion>[] = [
    {
      accessorKey: 'dayType',
      header: 'Day Type',
      cell: ({ getValue }) => {
        const dayType = getValue() as TransformedDayTypeVersion['dayType']
        return dayType ? `${dayType.code} - ${dayType.name}` : 'N/A'
      }
    },
    {
      accessorKey: 'color',
      header: 'Color',
      cell: ({ getValue }) => {
        const color = getValue() as string
        return (
          <div className="gba:w-6 gba:h-6 gba:rounded-md gba:border" style={{ backgroundColor: color || '#111827' }} />
        )
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
      cell: ({ getValue }) => {
        const version = getValue() as TransformedDayTypeVersion['activeVersion']
        return version || 'N/A'
      }
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
            return (
              <Badge variant="outline">
                {getTranslationFromI18nKeyAndLabel(
                  'master-data:hr.time_attendance.day_types.version.status.active',
                  'Active'
                )}
              </Badge>
            )
          }
        }
        return (
          <Badge variant="outline">
            {getTranslationFromI18nKeyAndLabel(
              'master-data:hr.time_attendance.day_types.version.status.expired',
              'Expired'
            )}
          </Badge>
        )
      }
    },
    {
      accessorKey: 'dayTypeVersionDetail',
      header: 'Fields',
      cell: ({ getValue }) => {
        const details = getValue() as TransformedDayTypeVersion['dayTypeVersionDetail']
        return `${details?.length || 0} details`
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
                setSelectedDayTypeVersion(version ?? null)
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
    <div className="gba:space-y-4" data-testid={formatDataTestId(dataTestId, 'day-types-version')}>
      <div className="gba:flex gba:items-center gba:justify-between gba:gap-4 gba:mb-6">
        <div className="gba:flex-1">
          <DebouncedInput
            value={searchTerm}
            onChange={handleSearch}
            placeholder="Search day type versions..."
            icon={<MagnifyingGlassIcon size={16} />}
            data-testid={formatDataTestId(dataTestId, 'search-input')}
            className="gba:max-w-md"
          />
        </div>
        <div className="gba:text-sm gba:text-gray-600">
          {filteredDayTypeVersions.length} of {dayTypeVersions.length} day types
        </div>
      </div>
      <DataTable
        columns={columns}
        data={filteredDayTypeVersions}
        data-testid={formatDataTestId(dataTestId, 'day-types-version-table')}
      />

      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="gba:flex gba:items-center gba:gap-2">
              <WarningIcon className="gba:text-destructive" />
              Delete Day Type Version
            </DialogTitle>
            <DialogDescription>{`Are you sure you want to delete ${`${selectedDayTypeVersion?.dayType?.name} Version`}?`}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button variant="destructive" onClick={() => handleDeleteDayTypeVersion(selectedDayTypeVersion)}>
              {isDeleting ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default DayTypesVersion
