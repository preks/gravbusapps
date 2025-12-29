import React, { useCallback, useMemo, useState } from 'react'
import { DataTable, Badge, Button } from '@newwork/nw-design-system'
import { ColumnDef, SortingState } from '@tanstack/react-table'
import { MagnifyingGlassIcon, PencilSimpleLineIcon, TrashIcon } from '@phosphor-icons/react'
import { DeleteDialog } from '../DeleteDialog'
import { DebouncedInput } from '@/components/debounced-input/DebouncedInput'
import { formatDataTestId } from '@/common/utils/formatDataTestId'
import dayjs from 'dayjs'
import { useRestClient } from '@/common/network/rest/useRestClient'
import { env } from '@/common/env/EnvUtils'
import { TransformedBreakTypeVersion } from '../../types/break-type-versions'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'

interface BreakTypesVersionProps {
  breakTypeVersions: TransformedBreakTypeVersion[]
  refetch: () => Promise<void>
  accessToken: string
  prefixDataTestId?: string
  onEdit?: (version: TransformedBreakTypeVersion) => void
}

const DATA_TEST_ID_PREFIX = 'BreakTypesVersion'

export const BreakTypesVersion: React.FC<BreakTypesVersionProps> = ({
  breakTypeVersions,
  refetch,
  accessToken,
  prefixDataTestId = '',
  onEdit
}) => {
  const dataTestId = formatDataTestId(prefixDataTestId, DATA_TEST_ID_PREFIX)
  const restClient = useRestClient(env('NEXT_PUBLIC_KOGITO_PROCESSES_ENDPOINT'))
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedBreakTypeVersion, setSelectedBreakTypeVersion] = useState<TransformedBreakTypeVersion | null>(null)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [sorting, setSorting] = useState<SortingState>([])

  const handleSearch = useCallback((value: string) => {
    setSearchTerm(value)
  }, [])

  const handleDeleteBreakTypeVersion = useCallback(
    async (breakTypeVersion?: TransformedBreakTypeVersion | null) => {
      if (!breakTypeVersion) return
      setIsDeleting(true)

      try {
        await restClient.post(
          '/employee-time/deleteBreakTypeVersion',
          {
            changeMode: 'DELETE',
            breakTypeVersion: {
              id: breakTypeVersion.id,
              version: breakTypeVersion.version
            }
          },
          {
            headers: { Authorization: `Bearer ${accessToken}` }
          }
        )

        await refetch()
      } catch (error) {
        console.error('Error deleting break type version:', error)
      } finally {
        setIsDeleting(false)
        setIsDeleteDialogOpen(false)
        setSelectedBreakTypeVersion(null)
      }
    },
    [restClient, accessToken, refetch]
  )

  const filteredBreakTypeVersions = useMemo(() => {
    if (!searchTerm.trim()) return breakTypeVersions

    return breakTypeVersions.filter(
      breakTypeVersion =>
        breakTypeVersion.breakType?.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        breakTypeVersion.breakType?.name.toLowerCase().includes(searchTerm.toLowerCase())
    )
  }, [breakTypeVersions, searchTerm])

  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A'
    return dayjs(dateString).format('DD MMM YYYY')
  }

  // StatusCell component
  const StatusCell: React.FC<{ status: 'active' | 'expired' | 'inactive' | 'planned' }> = ({ status }) => {
    let defaultLabel: string
    if (status === 'active') {
      defaultLabel = 'Active'
    } else if (status === 'expired') {
      defaultLabel = 'Expired'
    } else if (status === 'planned') {
      defaultLabel = 'Planned'
    } else {
      defaultLabel = 'Inactive'
    }
    return <Badge variant="outline">{defaultLabel}</Badge>
  }

  const createStatusCellRenderer = () => {
    return ({ getValue }: { getValue: () => unknown }) => (
      <StatusCell status={getValue() as 'active' | 'expired' | 'inactive' | 'planned'} />
    )
  }

  const columns: ColumnDef<TransformedBreakTypeVersion>[] = [
    {
      accessorKey: 'breakType',
      header: 'Break Type',
      cell: ({ getValue }) => {
        const breakType = getValue() as TransformedBreakTypeVersion['breakType']
        return breakType ? `${breakType.code} - ${breakType.name}` : 'N/A'
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
      cell: createStatusCellRenderer()
    },
    {
      accessorKey: 'breaks',
      header: 'Breaks',
      cell: ({ getValue }) => {
        const breaks = getValue() as number
        return (
          <Badge variant="outline">
            {`${breaks}
            ${
              breaks === 1
                ? getTranslationFromI18nKeyAndLabel('master-data:hr.time_attendance.break_types.version.break', 'Break')
                : getTranslationFromI18nKeyAndLabel(
                    'master-data:hr.time_attendance.break_types.version.breaks',
                    'Breaks'
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
              data-testid={formatDataTestId(dataTestId, `edit-version-button-${version.id}`)}
              variant="ghost"
              onClick={event => {
                event.stopPropagation()
                onEdit?.(version)
              }}
            >
              <PencilSimpleLineIcon />
            </Button>
            <Button
              data-testid={formatDataTestId(dataTestId, `delete-version-button-${version.id}`)}
              variant="ghost"
              onClick={event => {
                event.stopPropagation()
                setSelectedBreakTypeVersion(version ?? null)
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
    <div className="gba:space-y-4" data-testid={formatDataTestId(dataTestId, 'break-types-version')}>
      <div className="gba:flex gba:items-center gba:justify-between gba:gap-4 gba:mb-6">
        <div className="gba:flex-1">
          <DebouncedInput
            value={searchTerm}
            onChange={handleSearch}
            placeholder="Search break type versions..."
            icon={<MagnifyingGlassIcon size={16} />}
            data-testid={formatDataTestId(dataTestId, 'search-input')}
            className="gba:max-w-md"
          />
        </div>
        <div className="gba:text-sm gba:text-gray-600">
          {filteredBreakTypeVersions.length} of {breakTypeVersions.length} break type versions
        </div>
      </div>
      <DataTable
        columns={columns}
        data={filteredBreakTypeVersions}
        data-testid={formatDataTestId(dataTestId, 'break-types-version-table')}
        sorting={sorting}
        onSortingChange={setSorting}
        enableSorting
      />

      <DeleteDialog
        isOpen={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        onConfirm={() => handleDeleteBreakTypeVersion(selectedBreakTypeVersion)}
        isDeleting={isDeleting}
        titleKey="Delete Break Type Version"
        description={`Are you sure you want to delete ${selectedBreakTypeVersion?.breakType?.name ?? ''} Version?`}
      />
    </div>
  )
}

export default BreakTypesVersion
