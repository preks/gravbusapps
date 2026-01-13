import React, { useCallback, useMemo, useState } from 'react'
import { DataTable, Button } from '@newwork/nw-design-system'
import { ColumnDef, CellContext } from '@tanstack/react-table'
import { MagnifyingGlassIcon, PencilSimpleLineIcon, TrashIcon, GearIcon } from '@phosphor-icons/react'
import { DeleteDialog } from '../DeleteDialog'
import { DebouncedInput } from '@/components/debounced-input/DebouncedInput'
import { formatDataTestId } from '@/common/utils/formatDataTestId'
import BreakTypeForm from '@/business-apps/mdm/forms/time-attendance/BreakTypeForm'
import { TransformedBreakTypeVersion } from '../../types/break-type-versions'
import { SimpleBreakType } from '../../types/break-types'
import { useRestClient } from '@/common/network/rest/useRestClient'
import { env } from '@/common/env/EnvUtils'

interface BreakTypesItemsProps {
  breakTypes: SimpleBreakType[]
  breakTypeVersions: TransformedBreakTypeVersion[]
  refetch: () => Promise<void>
  accessToken: string
  prefixDataTestId?: string
  onConfigure: (breakTypeVersion: TransformedBreakTypeVersion) => void
}

// Actions cell component - moved outside to avoid recreation on each render
interface ActionsCellProps {
  row: CellContext<SimpleBreakType, unknown>['row']
  breakTypes: SimpleBreakType[]
  refetch: () => Promise<void>
  accessToken: string
  prefixDataTestId: string
  onConfigure: (breakType: SimpleBreakType) => void
  onDeleteClick: (breakType: SimpleBreakType | null) => void
}

const ActionsCell: React.FC<ActionsCellProps> = ({
  row,
  breakTypes,
  refetch,
  accessToken,
  prefixDataTestId,
  onConfigure,
  onDeleteClick
}) => {
  const targetBreakType = breakTypes.find(breakType => breakType.id === row.original.id)

  return (
    <div className="gba:flex gba:items-center gba:justify-center gba:gap-1">
      <BreakTypeForm
        childAddButton={
          <Button variant="ghost" onClick={event => event.stopPropagation()}>
            <PencilSimpleLineIcon />
          </Button>
        }
        refetch={refetch}
        accessToken={accessToken}
        prefixDataTestId={prefixDataTestId}
        breakType={targetBreakType || undefined}
        usedCodes={breakTypes.map(bt => bt.code).filter((code, index, self) => self.indexOf(code) === index)}
        key={targetBreakType?.id}
      />
      <Button
        variant="ghost"
        onClick={event => {
          event.stopPropagation()
          if (targetBreakType) {
            onConfigure(targetBreakType)
          }
        }}
        data-testid={formatDataTestId(prefixDataTestId, `configure-button-${targetBreakType?.id}`)}
      >
        <GearIcon />
      </Button>
      <Button
        variant="ghost"
        onClick={event => {
          event.stopPropagation()
          onDeleteClick(targetBreakType ?? null)
        }}
        data-testid={formatDataTestId(prefixDataTestId, `delete-button-${targetBreakType?.id}`)}
      >
        <TrashIcon />
      </Button>
    </div>
  )
}

const DATA_TEST_ID_PREFIX = 'BreakTypesItems'

export const BreakTypesItems: React.FC<BreakTypesItemsProps> = ({
  breakTypes,
  breakTypeVersions,
  refetch,
  accessToken,
  prefixDataTestId = '',
  onConfigure
}) => {
  const dataTestId = formatDataTestId(prefixDataTestId, DATA_TEST_ID_PREFIX)
  const restClient = useRestClient(env('NEXT_PUBLIC_KOGITO_PROCESSES_ENDPOINT'))
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedBreakType, setSelectedBreakType] = useState<SimpleBreakType | null>(null)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const filteredBreakTypes = useMemo(() => {
    if (!searchTerm.trim()) return breakTypes

    return breakTypes.filter(
      breakType =>
        breakType.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        breakType.name.toLowerCase().includes(searchTerm.toLowerCase())
    )
  }, [breakTypes, searchTerm])

  const handleSearch = useCallback((value: string) => {
    setSearchTerm(value)
  }, [])

  // Find the latest active breakTypeVersion for a given breakType
  const getLatestBreakTypeVersion = useCallback(
    (breakType: SimpleBreakType): TransformedBreakTypeVersion | null => {
      // Filter versions for this breakType
      const versionsForBreakType = breakTypeVersions.filter(version => version.breakType?.id === breakType.id)

      if (versionsForBreakType.length === 0) {
        return null
      }

      // Sort by activeTo descending (most recent first) or by activeFrom if activeTo is null
      const sortedVersions = [...versionsForBreakType].sort((a, b) => {
        const dateA = a.activeTo ? new Date(a.activeTo).getTime() : new Date(a.activeFrom || '').getTime()
        const dateB = b.activeTo ? new Date(b.activeTo).getTime() : new Date(b.activeFrom || '').getTime()
        return dateB - dateA // Descending order
      })

      return sortedVersions[0] || null
    },
    [breakTypeVersions]
  )

  // Handle configure to open the latest breakTypeVersion
  const handleConfigure = useCallback(
    (breakType: SimpleBreakType) => {
      const latestVersion = getLatestBreakTypeVersion(breakType)

      if (latestVersion) {
        onConfigure(latestVersion)
      } else {
        const partialVersion: TransformedBreakTypeVersion = {
          id: '',
          activeVersion: '',
          activeFrom: null,
          activeTo: null,
          version: 0,
          status: 'inactive',
          breaks: 0,
          minBreakTime: null,
          maxBreakTime: null,
          minWorkTime: null,
          minRemainderTime: null,
          breakType: {
            id: breakType.id,
            name: breakType.name,
            code: breakType.code
          }
        }
        onConfigure(partialVersion)
      }
    },
    [getLatestBreakTypeVersion, onConfigure]
  )

  // Handle delete break type
  const handleDeleteBreakType = useCallback(
    async (breakType?: SimpleBreakType | null) => {
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
    },
    [restClient, accessToken, refetch]
  )

  const handleDeleteClick = useCallback((breakType: SimpleBreakType | null) => {
    setSelectedBreakType(breakType)
    setIsDeleteDialogOpen(true)
  }, [])

  const columns: ColumnDef<SimpleBreakType>[] = useMemo(
    () => [
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
        cell: ({ row }) => (
          <ActionsCell
            row={row}
            breakTypes={breakTypes}
            refetch={refetch}
            accessToken={accessToken}
            prefixDataTestId={prefixDataTestId}
            onConfigure={handleConfigure}
            onDeleteClick={handleDeleteClick}
          />
        )
      }
    ],
    [breakTypes, refetch, accessToken, prefixDataTestId, handleConfigure, handleDeleteClick]
  )

  return (
    <div className="gba:space-y-4" data-testid={formatDataTestId(prefixDataTestId, 'break-types-items')}>
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
      <DataTable
        columns={columns}
        data={filteredBreakTypes}
        data-testid={formatDataTestId(prefixDataTestId, 'break-types-items-table')}
      />

      <DeleteDialog
        isOpen={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        onConfirm={() => handleDeleteBreakType(selectedBreakType)}
        isDeleting={isDeleting}
        titleKey="Delete Break Type"
        description={`Are you sure you want to delete ${selectedBreakType?.name ?? ''}?`}
      />
    </div>
  )
}

export default BreakTypesItems
