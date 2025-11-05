import React, { useCallback, useMemo, useState } from 'react'
import { DataTable, Badge, Button } from '@newwork/nw-design-system'
import { ColumnDef, SortingState } from '@tanstack/react-table'
import { MagnifyingGlassIcon, PencilSimpleLineIcon, TrashIcon } from '@phosphor-icons/react'
import { DebouncedInput } from '@/components/debounced-input/DebouncedInput'
import { formatDataTestId } from '@/common/utils/formatDataTestId'
import dayjs from 'dayjs'
import { useRestClient } from '@/common/network/rest/useRestClient'
import { env } from '@/common/env/EnvUtils'
import { TransformedIncrementTypeVersion } from '../../types/increment-type-versions'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { DeleteDialog } from '../DeleteDialog'

interface IncrementTypesVersionProps {
  incrementTypeVersions: TransformedIncrementTypeVersion[]
  refetch: () => Promise<void>
  accessToken: string
  prefixDataTestId?: string
  onEdit?: (version: TransformedIncrementTypeVersion) => void
}

const DATA_TEST_ID_PREFIX = 'IncrementTypesVersion'

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

const createStatusCellRenderer = () => {
  return ({ getValue }: { getValue: () => unknown }) => (
    <StatusCell status={getValue() as 'active' | 'expired' | 'inactive' | 'planned'} />
  )
}

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
  const [sorting, setSorting] = useState<SortingState>([])

  console.log(incrementTypeVersions, 'incrementTypeVersions')
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
      header: getTranslationFromI18nKeyAndLabel(
        'master-data:hr.time_attendance.increment_type_versions.single_increment_type',
        'Increment Type'
      ),
      cell: ({ getValue }) => {
        const incrementType = getValue() as TransformedIncrementTypeVersion['incrementType']
        return incrementType ? `${incrementType.code} - ${incrementType.name}` : 'N/A'
      }
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
      cell: ({ getValue }) => getValue() as string
    },
    {
      accessorKey: 'status',
      header: getTranslationFromI18nKeyAndLabel('lowcoder:expense_request_list.expense_plan_table.status', 'Status'),
      cell: createStatusCellRenderer()
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
      header: getTranslationFromI18nKeyAndLabel('translation:actions.actions', 'Actions'),
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
            placeholder={getTranslationFromI18nKeyAndLabel(
              'master-data:hr.time_attendance.increment_type_versions.actions.search_placeholder',
              'Search increment type versions...'
            )}
            icon={<MagnifyingGlassIcon size={16} />}
            data-testid={formatDataTestId(dataTestId, 'search-input')}
            className="gba:max-w-md"
          />
        </div>
        <div className="gba:text-sm gba:text-gray-600">
          {`${filteredIncrementTypeVersions.length} ${getTranslationFromI18nKeyAndLabel('lowcoder:personal_expenses.of', 'of')} ${incrementTypeVersions.length} ${getTranslationFromI18nKeyAndLabel(
            'master-data:hr.time_attendance.increment_type_versions.title',
            'increment type versions'
          ).toLowerCase()}`}
        </div>
      </div>
      <DataTable
        columns={columns}
        data={filteredIncrementTypeVersions}
        data-testid={formatDataTestId(dataTestId, 'increment-types-version-table')}
        sorting={sorting}
        onSortingChange={setSorting}
        enableSorting
      />

      <DeleteDialog
        isOpen={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        onConfirm={() => handleDeleteIncrementTypeVersion(selectedIncrementTypeVersion)}
        isDeleting={isDeleting}
        titleKey={getTranslationFromI18nKeyAndLabel(
          'master-data:hr.time_attendance.increment_type_versions.actions.delete_title',
          'Delete Increment Type Version'
        )}
        description={getTranslationFromI18nKeyAndLabel(
          'master-data:hr.time_attendance.increment_type_versions.actions.delete_message',
          `Are you sure you want to delete ${selectedIncrementTypeVersion?.incrementType?.name ?? ''} Version?`
        )}
      />
    </div>
  )
}

export default IncrementTypesVersion
