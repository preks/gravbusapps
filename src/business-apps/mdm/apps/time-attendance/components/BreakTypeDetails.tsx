import React, { useMemo, useState, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle, Button, DataTable, Badge } from '@newwork/nw-design-system'
import { ColumnDef, SortingState, CellContext } from '@tanstack/react-table'
import { PlusIcon, PencilSimpleLineIcon, TrashIcon, CheckIcon } from '@phosphor-icons/react'
import { DeleteDialog } from './DeleteDialog'
import { formatDataTestId } from '@/common/utils/formatDataTestId'
import { useBreakTypeVersionDetailsData } from '../hooks/useBreakTypeVersionDetailsData'
import { TransformedBreakTypeVersionDetail } from '../types/break-type-version-details'
import BreakTypeDetailsForm, {
  BREAK_TYPE_OPTIONS,
  PAY_OPTIONS
} from '@/business-apps/mdm/forms/time-attendance/BreakTypeDetailsForm'
import { useRestClient } from '@/common/network/rest/useRestClient'
import { env } from '@/common/env/EnvUtils'

export interface BreakTypeDetailsProps {
  breakTypeVersionId: string | null
  accessToken: string
  prefixDataTestId?: string
}

// Cell renderer components - moved outside to avoid recreation on each render
const TypeCell = ({ row }: CellContext<TransformedBreakTypeVersionDetail, unknown>) => {
  const option = BREAK_TYPE_OPTIONS.find(opt => opt.code === row.original.type)
  return <Badge variant="outline">{option?.displayValue || row.original.type}</Badge>
}

const MandatoryCell = ({ row }: CellContext<TransformedBreakTypeVersionDetail, unknown>) => {
  return row.original.mandatory ? <CheckIcon className="gba:h-4 gba:w-4" /> : <>-</>
}

const PayOptionCell = ({ row }: CellContext<TransformedBreakTypeVersionDetail, unknown>) => {
  const option = PAY_OPTIONS.find(opt => opt.code === row.original.payOption)
  return option ? <Badge variant="outline">{option.displayValue}</Badge> : <>-</>
}

interface ActionsCellProps {
  row: CellContext<TransformedBreakTypeVersionDetail, unknown>['row']
  breakTypeVersionDetails: TransformedBreakTypeVersionDetail[]
  breakTypeVersionId: string | null
  accessToken: string
  dataTestId: string
  refetch: () => void
  onDeleteClick: (detail: TransformedBreakTypeVersionDetail | null) => void
}

const ActionsCell: React.FC<ActionsCellProps> = ({
  row,
  breakTypeVersionDetails,
  breakTypeVersionId,
  accessToken,
  dataTestId,
  refetch,
  onDeleteClick
}) => {
  const targetDetail = breakTypeVersionDetails.find(detail => detail.id === row.original.id)

  return (
    <div className="gba:flex gba:items-center gba:gap-2">
      <BreakTypeDetailsForm
        breakTypeVersionId={breakTypeVersionId || ''}
        accessToken={accessToken}
        prefixDataTestId={dataTestId}
        childAddButton={
          <Button
            onClick={event => event.stopPropagation()}
            variant="ghost"
            className="gba:flex gba:items-center gba:gap-2"
          >
            <PencilSimpleLineIcon />
          </Button>
        }
        refetch={refetch}
        breakTypeDetails={targetDetail}
        availableBreakTypeDetails={breakTypeVersionDetails}
      />
      <Button
        variant="ghost"
        size="sm"
        onClick={event => {
          event.stopPropagation()
          onDeleteClick(targetDetail || null)
        }}
        data-testid={formatDataTestId(dataTestId, `delete-row-button-${row.original.id}`)}
      >
        <TrashIcon className="gba:h-4 gba:w-4" />
      </Button>
    </div>
  )
}

const DATA_TEST_ID_PREFIX = 'BreakTypeDetails'

export const BreakTypeDetails: React.FC<BreakTypeDetailsProps> = ({
  breakTypeVersionId,
  accessToken,
  prefixDataTestId = ''
}) => {
  const dataTestId = formatDataTestId(prefixDataTestId, DATA_TEST_ID_PREFIX)
  const [sorting, setSorting] = useState<SortingState>([])
  const restClient = useRestClient(env('NEXT_PUBLIC_KOGITO_PROCESSES_ENDPOINT'))
  const [selectedDetail, setSelectedDetail] = useState<TransformedBreakTypeVersionDetail | null>(null)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  // Fetch break type version details using the hook
  const { breakTypeVersionDetails, loading, error, refetch } = useBreakTypeVersionDetailsData({
    accessToken,
    breakTypeVersionId: breakTypeVersionId || null
  })

  // Handle delete break type version detail
  const handleDeleteBreakTypeVersionDetail = useCallback(
    async (detail?: TransformedBreakTypeVersionDetail | null) => {
      if (!detail) return
      setIsDeleting(true)

      try {
        await restClient.post(
          '/employee-time/deleteBreakTypeVersionDetail',
          {
            changeMode: 'DELETE',
            breakTypeVersionDetail: {
              id: detail.id,
              version: detail.version
            }
          },
          {
            headers: { Authorization: `Bearer ${accessToken}` }
          }
        )

        await refetch()
        setIsDeleteDialogOpen(false)
        setSelectedDetail(null)
      } catch (error) {
        console.error('Error deleting break type version detail:', error)
      } finally {
        setIsDeleting(false)
        setIsDeleteDialogOpen(false)
        setSelectedDetail(null)
      }
    },
    [restClient, accessToken, refetch]
  )

  const handleDeleteClick = useCallback((detail: TransformedBreakTypeVersionDetail | null) => {
    setSelectedDetail(detail)
    setIsDeleteDialogOpen(true)
  }, [])

  // Table columns
  const breakTypeDetailsColumns: ColumnDef<TransformedBreakTypeVersionDetail>[] = useMemo(
    () => [
      {
        accessorKey: 'displayOrder',
        header: 'Order',
        enableSorting: true
      },
      {
        accessorKey: 'type',
        header: 'Kind',
        enableSorting: true,
        cell: TypeCell
      },
      {
        accessorKey: 'startTime',
        header: 'Start',
        enableSorting: true,
        cell: info => info.getValue() || '-'
      },
      {
        accessorKey: 'endTime',
        header: 'End',
        enableSorting: true,
        cell: info => info.getValue() || '-'
      },
      {
        accessorKey: 'hours',
        header: 'Hours',
        enableSorting: true,
        cell: info => info.getValue() || '-'
      },
      {
        accessorKey: 'length',
        header: 'Length',
        enableSorting: true,
        cell: info => info.getValue() || '-'
      },
      {
        accessorKey: 'mandatory',
        header: 'Mandatory',
        enableSorting: true,
        cell: MandatoryCell
      },
      {
        accessorKey: 'payOption',
        header: 'Setting',
        enableSorting: true,
        cell: PayOptionCell
      },
      {
        accessorKey: 'combinedWithBreakTypeVersionDetailId',
        header: 'Combine',
        enableSorting: true,
        cell: info => info.getValue() || 'None'
      },
      {
        id: 'actions',
        header: 'Actions',
        cell: ({ row }) => (
          <ActionsCell
            row={row}
            breakTypeVersionDetails={breakTypeVersionDetails}
            breakTypeVersionId={breakTypeVersionId}
            accessToken={accessToken}
            dataTestId={dataTestId}
            refetch={refetch}
            onDeleteClick={handleDeleteClick}
          />
        )
      }
    ],
    [dataTestId, breakTypeVersionDetails, breakTypeVersionId, accessToken, refetch, handleDeleteClick]
  )

  if (error) {
    return (
      <Card>
        <CardContent className="gba:py-8">
          <div className="gba:text-center gba:text-destructive">Error loading break type details: {error.message}</div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card data-testid={dataTestId}>
      <CardHeader>
        <div className="gba:flex gba:justify-between gba:items-center">
          <CardTitle>Break Details</CardTitle>
          <BreakTypeDetailsForm
            breakTypeVersionId={breakTypeVersionId || ''}
            accessToken={accessToken}
            prefixDataTestId={dataTestId}
            childAddButton={
              <Button
                onClick={event => event.stopPropagation()}
                disabled={!breakTypeVersionId || loading}
                className="gba:flex gba:items-center gba:gap-2"
                data-testid={formatDataTestId(dataTestId, 'add-break-button')}
              >
                <PlusIcon className="gba:h-4 gba:w-4" />
                Add Break
              </Button>
            }
            refetch={refetch}
            availableBreakTypeDetails={breakTypeVersionDetails}
          />
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="gba:flex gba:flex-col gba:items-center gba:justify-center gba:py-8">
            <div className="gba:text-muted-foreground">Loading...</div>
          </div>
        ) : breakTypeVersionDetails.length > 0 ? (
          <DataTable
            data={breakTypeVersionDetails}
            columns={breakTypeDetailsColumns}
            enablePagination={false}
            sorting={sorting}
            onSortingChange={setSorting}
            enableSorting
          />
        ) : (
          <div className="gba:flex gba:flex-col gba:items-center gba:justify-center gba:py-8 gba:text-center">
            <div className="gba:text-muted-foreground gba:mb-2">No break details configured yet</div>
            <div className="gba:text-sm gba:text-muted-foreground">
              Click "Add Break" to create your first break detail
            </div>
          </div>
        )}
      </CardContent>

      <DeleteDialog
        isOpen={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        onConfirm={() => handleDeleteBreakTypeVersionDetail(selectedDetail)}
        isDeleting={isDeleting}
        titleKey="Delete Break Detail"
        description="Are you sure you want to delete this break detail? This action cannot be undone."
      />
    </Card>
  )
}

export default BreakTypeDetails
