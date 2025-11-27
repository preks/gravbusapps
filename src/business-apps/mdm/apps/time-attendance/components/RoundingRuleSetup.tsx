import React, { useMemo, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, Button, DataTable, Badge } from '@newwork/nw-design-system'
import { ColumnDef, SortingState } from '@tanstack/react-table'
import { PlusIcon, PencilSimpleLineIcon, TrashIcon, CheckIcon } from '@phosphor-icons/react'
import { formatDataTestId } from '@/common/utils/formatDataTestId'
import { useRoundingRuleVersionDetailsData } from '../hooks/useRoundingRuleVersionDetailsData'
import RoundingRuleDetailsForm, {
  CLOCKING_TYPE_OPTIONS,
  ROUNDING_TYPE_OPTIONS
} from '@/business-apps/mdm/forms/time-attendance/RoundingRuleDetailsForm'
import { TransformedRoundingRuleVersionDetail } from '../types/rounding-rule-version-details'
import { useRestClient } from '@/common/network/rest/useRestClient'
import { env } from '@/common/env/EnvUtils'

export interface RoundingRuleSetupProps {
  roundingRuleVersionId: string | null
  accessToken: string
  prefixDataTestId?: string
}

const DATA_TEST_ID_PREFIX = 'RoundingRuleSetup'

export const RoundingRuleSetup: React.FC<RoundingRuleSetupProps> = ({
  roundingRuleVersionId,
  accessToken,
  prefixDataTestId = ''
}) => {
  const dataTestId = formatDataTestId(prefixDataTestId, DATA_TEST_ID_PREFIX)
  const [sorting, setSorting] = useState<SortingState>([])

  const restClient = useRestClient(env('NEXT_PUBLIC_KOGITO_PROCESSES_ENDPOINT'))

  // Fetch rounding rule version details using the hook
  const { roundingRuleVersionDetails, loading, error, refetch } = useRoundingRuleVersionDetailsData({
    accessToken,
    roundingRuleVersionId: roundingRuleVersionId || null
  })

  const findClockingTypeOption = (code: string) => {
    return CLOCKING_TYPE_OPTIONS.find(option => option.code === code)
  }

  const findRoundingTypeOption = (code: string) => {
    return ROUNDING_TYPE_OPTIONS.find(option => option.code === code)
  }

  const handleDeleteDetail = async (detail: TransformedRoundingRuleVersionDetail) => {
    try {
      await restClient.post(
        '/employee-time/deleteRoundingRuleVersionDetail',
        {
          changeMode: 'DELETE',
          roundingRuleVersionDetail: {
            id: detail.id,
            version: detail.version
          }
        },
        {
          headers: { Authorization: `Bearer ${accessToken}` }
        }
      )

      await refetch()
    } catch (error) {
      console.error('Error deleting rounding rule detail:', error)
    }
  }

  // Table columns
  const roundingRuleSetupColumns: ColumnDef<TransformedRoundingRuleVersionDetail>[] = useMemo(
    () => [
      {
        accessorKey: 'displayOrder',
        header: 'Display Order',
        enableSorting: true
      },
      {
        accessorKey: 'clockingType',
        header: 'Clocking Type',
        enableSorting: true,
        cell: ({ row }) => {
          const option = findClockingTypeOption(row.original.clockingType)
          return <Badge variant="outline">{option?.displayValue || row.original.clockingType}</Badge>
        }
      },
      {
        accessorKey: 'roundingType',
        header: 'Rounding Type',
        enableSorting: true,
        cell: ({ row }) => {
          const option = findRoundingTypeOption(row.original.roundingType)
          return <Badge variant="outline">{option?.displayValue || row.original.roundingType}</Badge>
        }
      },
      {
        accessorKey: 'startTime',
        header: 'Time Start',
        enableSorting: true,
        cell: ({ row }) => row.original.startTime || '-'
      },
      {
        accessorKey: 'endTime',
        header: 'Time End',
        enableSorting: true,
        cell: ({ row }) => row.original.endTime || '-'
      },
      {
        accessorKey: 'gracePeriod',
        header: 'Grace Period',
        enableSorting: true,
        cell: ({ row }) => row.original.gracePeriod || '-'
      },
      {
        accessorKey: 'roundingValue',
        header: 'Rounding Value',
        enableSorting: true,
        cell: ({ row }) => row.original.roundingValue || '-'
      },
      {
        accessorKey: 'onlyFirstLast',
        header: 'First/Last Only',
        enableSorting: true,
        cell: ({ row }) => {
          return row.original.onlyFirstLast ? <CheckIcon className="gba:h-4 gba:w-4" /> : '-'
        }
      },
      {
        id: 'actions',
        header: 'Actions',
        cell: ({ row }) => {
          const detail = row.original

          return (
            <div className="gba:flex gba:items-center gba:gap-2">
              <RoundingRuleDetailsForm
                roundingRuleVersionId={roundingRuleVersionId || ''}
                childAddButton={
                  <Button
                    onClick={event => event.stopPropagation()}
                    variant="ghost"
                    className="gba:flex gba:items-center gba:gap-2"
                  >
                    <PencilSimpleLineIcon />
                    Edit
                  </Button>
                }
                refetch={refetch}
                accessToken={accessToken}
                prefixDataTestId={dataTestId}
                roundingRuleDetail={{
                  id: detail.id,
                  version: detail.version,
                  displayOrder: detail.displayOrder,
                  clockingType: detail.clockingType,
                  roundingType: detail.roundingType,
                  startTime: detail.startTime,
                  endTime: detail.endTime,
                  gracePeriod: detail.gracePeriod,
                  roundingValue: detail.roundingValue,
                  onlyFirstLast: detail.onlyFirstLast
                }}
              />
              <Button
                variant="ghost"
                size="sm"
                onClick={event => {
                  event.stopPropagation()
                  handleDeleteDetail(detail)
                }}
                data-testid={formatDataTestId(dataTestId, `delete-row-button-${detail.id}`)}
              >
                <TrashIcon className="gba:h-4 gba:w-4" />
              </Button>
            </div>
          )
        }
      }
    ],
    [dataTestId, roundingRuleVersionId, accessToken, refetch, findClockingTypeOption, findRoundingTypeOption]
  )

  if (error) {
    return (
      <Card data-testid={dataTestId}>
        <CardContent>
          <div className="gba:text-destructive">Error loading rounding rule details: {error.message}</div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card data-testid={dataTestId}>
      <CardHeader>
        <div className="gba:flex gba:justify-between gba:items-center">
          <CardTitle>Rounding Rules</CardTitle>
          {roundingRuleVersionId && (
            <RoundingRuleDetailsForm
              roundingRuleVersionId={roundingRuleVersionId}
              childAddButton={
                <Button onClick={event => event.stopPropagation()} className="gba:flex gba:items-center gba:gap-2">
                  <PlusIcon className="gba:h-4 gba:w-4" />
                  Add Rule
                </Button>
              }
              refetch={refetch}
              accessToken={accessToken}
              prefixDataTestId={dataTestId}
            />
          )}
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="gba:text-center gba:py-8">Loading...</div>
        ) : roundingRuleVersionDetails.length > 0 ? (
          <DataTable
            data={roundingRuleVersionDetails}
            columns={roundingRuleSetupColumns}
            enablePagination={false}
            sorting={sorting}
            onSortingChange={setSorting}
            enableSorting
          />
        ) : (
          <div className="gba:flex gba:flex-col gba:items-center gba:justify-center gba:py-8 gba:text-center">
            <div className="gba:text-muted-foreground gba:mb-2">No rounding rules configured yet</div>
            <div className="gba:text-sm gba:text-muted-foreground">
              Click "Add Rule" to create your first rounding rule
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default RoundingRuleSetup
