import React, { useCallback, useMemo, useState } from 'react'
import { DataTable, Badge, Button } from '@newwork/nw-design-system'
import { ColumnDef, SortingState } from '@tanstack/react-table'
import { MagnifyingGlassIcon, PencilSimpleLineIcon, TrashIcon } from '@phosphor-icons/react'
import { DeleteDialog } from '../DeleteDialog'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'
import { DebouncedInput } from '@/components/debounced-input/DebouncedInput'
import { formatDataTestId } from '@/common/utils/formatDataTestId'
import dayjs from 'dayjs'
import { useRestClient } from '@/common/network/rest/useRestClient'
import { env } from '@/common/env/EnvUtils'
import { TransformedRoundingRuleVersion } from '../../types/rounding-rule-versions'

interface RoundingRulesVersionProps {
  roundingRuleVersions: TransformedRoundingRuleVersion[]
  refetch: () => Promise<void>
  accessToken: string
  prefixDataTestId?: string
  onEdit?: (version: TransformedRoundingRuleVersion) => void
}

const DATA_TEST_ID_PREFIX = 'RoundingRulesVersion'

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

export const RoundingRulesVersion: React.FC<RoundingRulesVersionProps> = ({
  roundingRuleVersions,
  refetch,
  accessToken,
  prefixDataTestId = '',
  onEdit
}) => {
  const dataTestId = formatDataTestId(prefixDataTestId, DATA_TEST_ID_PREFIX)
  const restClient = useRestClient(env('NEXT_PUBLIC_KOGITO_PROCESSES_ENDPOINT'))
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedRoundingRuleVersion, setSelectedRoundingRuleVersion] = useState<TransformedRoundingRuleVersion | null>(
    null
  )
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [sorting, setSorting] = useState<SortingState>([])

  const handleSearch = useCallback((value: string) => {
    setSearchTerm(value)
  }, [])

  const handleDeleteRoundingRuleVersion = useCallback(
    async (roundingRuleVersion?: TransformedRoundingRuleVersion | null) => {
      if (!roundingRuleVersion) return
      setIsDeleting(true)

      try {
        await restClient.post(
          '/employee-time/deleteRoundingRuleVersion',
          {
            changeMode: 'DELETE',
            roundingRuleVersion: {
              id: roundingRuleVersion.id,
              version: roundingRuleVersion.version
            }
          },
          {
            headers: { Authorization: `Bearer ${accessToken}` }
          }
        )

        await refetch()
      } catch (error) {
        console.error('Error deleting rounding rule version:', error)
      } finally {
        setIsDeleting(false)
        setIsDeleteDialogOpen(false)
        setSelectedRoundingRuleVersion(null)
      }
    },
    [restClient, accessToken, refetch]
  )

  const filteredRoundingRuleVersions = useMemo(() => {
    if (!searchTerm.trim()) return roundingRuleVersions

    return roundingRuleVersions.filter(
      roundingRuleVersion =>
        roundingRuleVersion.roundingRule?.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        roundingRuleVersion.roundingRule?.name.toLowerCase().includes(searchTerm.toLowerCase())
    )
  }, [roundingRuleVersions, searchTerm])

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A'
    return dayjs(dateString).format('DD MMM YYYY')
  }

  const columns: ColumnDef<TransformedRoundingRuleVersion>[] = [
    {
      accessorKey: 'roundingRule',
      header: 'Rounding Rule',
      cell: ({ getValue }) => {
        const roundingRule = getValue() as TransformedRoundingRuleVersion['roundingRule']
        return roundingRule ? `${roundingRule.code} - ${roundingRule.name}` : 'N/A'
      }
    },
    {
      accessorKey: 'activeFrom',
      header: 'Active From',
      cell: ({ getValue }) => formatDate((getValue() as string | null) || null)
    },
    {
      accessorKey: 'activeTo',
      header: 'Active To',
      cell: ({ getValue }) => formatDate((getValue() as string | null) || null)
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
                setSelectedRoundingRuleVersion(version ?? null)
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
    <div className="gba:space-y-4" data-testid={formatDataTestId(dataTestId, 'rounding-rules-version')}>
      <div className="gba:flex gba:items-center gba:justify-between gba:gap-4 gba:mb-6">
        <div className="gba:flex-1">
          <DebouncedInput
            value={searchTerm}
            onChange={handleSearch}
            placeholder="Search rounding rule versions..."
            icon={<MagnifyingGlassIcon size={16} />}
            data-testid={formatDataTestId(dataTestId, 'search-input')}
            className="gba:max-w-md"
          />
        </div>
        <div className="gba:text-sm gba:text-gray-600">
          {filteredRoundingRuleVersions.length} of {roundingRuleVersions.length} rounding rule versions
        </div>
      </div>
      <DataTable
        columns={columns}
        data={filteredRoundingRuleVersions}
        data-testid={formatDataTestId(dataTestId, 'rounding-rules-version-table')}
        sorting={sorting}
        onSortingChange={setSorting}
        enableSorting
      />

      <DeleteDialog
        isOpen={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        onConfirm={() => handleDeleteRoundingRuleVersion(selectedRoundingRuleVersion)}
        isDeleting={isDeleting}
        titleKey="Delete Rounding Rule Version"
        description={`Are you sure you want to delete ${selectedRoundingRuleVersion?.roundingRule?.name ?? ''} Version?`}
      />
    </div>
  )
}

export default RoundingRulesVersion
