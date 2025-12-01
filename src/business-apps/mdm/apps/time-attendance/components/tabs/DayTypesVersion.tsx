import React, { useCallback, useMemo, useState } from 'react'
import { DataTable, Badge, Button } from '@newwork/nw-design-system'
import { ColumnDef, SortingState } from '@tanstack/react-table'
import { MagnifyingGlassIcon, PencilSimpleLineIcon, TrashIcon } from '@phosphor-icons/react'
import { DebouncedInput } from '@/components/debounced-input/DebouncedInput'
import { formatDataTestId } from '@/common/utils/formatDataTestId'
import dayjs from 'dayjs'
import { useRestClient } from '@/common/network/rest/useRestClient'
import { env } from '@/common/env/EnvUtils'
import { TransformedDayTypeVersion } from '../../types/day-type-versions'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { DeleteDialog } from '../DeleteDialog'

interface DayTypesVersionProps {
  dayTypeVersions: TransformedDayTypeVersion[]
  refetch: () => Promise<void>
  accessToken: string
  prefixDataTestId?: string
  onEdit?: (version: TransformedDayTypeVersion) => void
}

const DATA_TEST_ID_PREFIX = 'DayTypesVersion'

interface DayTypesVersionActionsCellProps {
  row: { original: TransformedDayTypeVersion }
  dataTestId: string
  onEdit?: (version: TransformedDayTypeVersion) => void
  onDeleteClick: (version: TransformedDayTypeVersion) => void
}

const DayTypesVersionActionsCell: React.FC<DayTypesVersionActionsCellProps> = ({
  row,
  dataTestId,
  onEdit,
  onDeleteClick
}) => {
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
          onDeleteClick(version)
        }}
        data-testid={formatDataTestId(dataTestId, `delete-version-button-${version.id}`)}
      >
        <TrashIcon />
      </Button>
    </div>
  )
}

const ColorCell: React.FC<{ color: string }> = ({ color }) => {
  return <div className="gba:w-6 gba:h-6 gba:rounded-md gba:border" style={{ backgroundColor: color || '#111827' }} />
}

const StatusCell: React.FC<{ status: 'active' | 'expired' | 'inactive' | 'planned' }> = ({ status }) => {
  let translationKey: string
  let defaultLabel: string
  if (status === 'active') {
    translationKey = 'master-data:forms.capability.fields.status.options.active'
    defaultLabel = 'Active'
  } else if (status === 'expired') {
    translationKey = 'lowcoder:hr_assets.expired'
    defaultLabel = 'Expired'
  } else if (status === 'planned') {
    translationKey = 'lowcoder:absence_management_hub_backoffice.planned'
    defaultLabel = 'Planned'
  } else {
    translationKey = 'flow.flow_start_page.inactive'
    defaultLabel = 'Inactive'
  }
  return <Badge variant="outline">{getTranslationFromI18nKeyAndLabel(translationKey, defaultLabel)}</Badge>
}

const createColorCellRenderer = () => {
  return ({ getValue }: { getValue: () => unknown }) => <ColorCell color={getValue() as string} />
}

const createStatusCellRenderer = () => {
  return ({ getValue }: { getValue: () => unknown }) => (
    <StatusCell status={getValue() as 'active' | 'expired' | 'inactive' | 'planned'} />
  )
}

const createActionsCellRenderer = (
  dataTestId: string,
  onDeleteClick: (version: TransformedDayTypeVersion) => void,
  onEdit?: (version: TransformedDayTypeVersion) => void
) => {
  return ({ row }: { row: { original: TransformedDayTypeVersion } }) => (
    <DayTypesVersionActionsCell row={row} dataTestId={dataTestId} onEdit={onEdit} onDeleteClick={onDeleteClick} />
  )
}

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
  const [sorting, setSorting] = useState<SortingState>([])

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
      header: getTranslationFromI18nKeyAndLabel('master-data:hr.time_attendance.day_types.single_day_type', 'Day Type'),
      cell: ({ getValue }) => {
        const dayType = getValue() as TransformedDayTypeVersion['dayType']
        return dayType ? `${dayType.code} - ${dayType.name}` : 'N/A'
      }
    },
    {
      accessorKey: 'color',
      header: getTranslationFromI18nKeyAndLabel('flow:formio.form_builder.component_settings.color.label', 'Color'),
      cell: createColorCellRenderer()
    },
    {
      accessorKey: 'activeFrom',
      header: getTranslationFromI18nKeyAndLabel(
        'lowcoder:expense_calculation_rule.expense_table.valid_from',
        'Valid From'
      ),
      cell: ({ getValue }) => formatDate((getValue() as string) || '')
    },
    {
      accessorKey: 'activeTo',
      header: getTranslationFromI18nKeyAndLabel('lowcoder:expense_calculation_rule.expense_table.valid_to', 'Valid To'),
      cell: ({ getValue }) => formatDate((getValue() as string) || '')
    },
    {
      accessorKey: 'activeVersion',
      header: getTranslationFromI18nKeyAndLabel(
        'flow:formio.form_builder.component_settings.data_source.version',
        'Version'
      ),
      cell: ({ getValue }) => {
        const version = getValue() as TransformedDayTypeVersion['activeVersion']
        return version || 'N/A'
      }
    },
    {
      accessorKey: 'status',
      header: getTranslationFromI18nKeyAndLabel('lowcoder:expense_request_list.expense_plan_table.status', 'Status'),
      cell: createStatusCellRenderer()
    },
    {
      accessorKey: 'dayTypeVersionDetail',
      header: getTranslationFromI18nKeyAndLabel('master-data:hr.time_attendance.day_type_versions.fields', 'Fields'),
      cell: ({ getValue }) => {
        const details = getValue() as TransformedDayTypeVersion['dayTypeVersionDetail']
        return `${details?.length || 0} ${getTranslationFromI18nKeyAndLabel(
          'lowcoder:employee_profile.employee_tabs.details',
          'details'
        )}`
      }
    },
    {
      id: 'actions',
      header: getTranslationFromI18nKeyAndLabel('translation:actions.actions', 'Actions'),
      enableSorting: false,
      cell: createActionsCellRenderer(
        dataTestId,
        version => {
          setSelectedDayTypeVersion(version ?? null)
          setIsDeleteDialogOpen(true)
        },
        onEdit
      )
    }
  ]

  return (
    <div className="gba:space-y-4" data-testid={formatDataTestId(dataTestId, 'day-types-version')}>
      <div className="gba:flex gba:items-center gba:justify-between gba:gap-4 gba:mb-6">
        <div className="gba:flex-1">
          <DebouncedInput
            value={searchTerm}
            onChange={handleSearch}
            placeholder={getTranslationFromI18nKeyAndLabel(
              'master-data:hr.time_attendance.day_type_versions.actions.search_placeholder',
              'Search day type versions...'
            )}
            icon={<MagnifyingGlassIcon size={16} />}
            data-testid={formatDataTestId(dataTestId, 'search-input')}
            className="gba:max-w-md"
          />
        </div>
        <div className="gba:text-sm gba:text-gray-600">
          {`${filteredDayTypeVersions.length} ${getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.of', 'of')} ${dayTypeVersions.length} ${getTranslationFromI18nKeyAndLabel(
            'master-data:hr.time_attendance.day_types.title',
            'day types'
          ).toLowerCase()}
          `}
        </div>
      </div>
      <DataTable
        columns={columns}
        data={filteredDayTypeVersions}
        data-testid={formatDataTestId(dataTestId, 'day-types-version-table')}
        sorting={sorting}
        onSortingChange={setSorting}
        enableSorting
      />

      <DeleteDialog
        isOpen={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        onConfirm={() => handleDeleteDayTypeVersion(selectedDayTypeVersion)}
        isDeleting={isDeleting}
        titleKey={getTranslationFromI18nKeyAndLabel(
          'master-data:hr.time_attendance.day_type_versions.actions.delete_title',
          'Delete Day Type Version'
        )}
        description={getTranslationFromI18nKeyAndLabel(
          'master-data:hr.time_attendance.day_type_versions.actions.delete_message',
          'Are you sure you want to delete this day type version?'
        )}
      />
    </div>
  )
}

export default DayTypesVersion
