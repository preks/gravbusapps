import React, { useCallback, useMemo, useState } from 'react'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Button,
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody
} from '@newwork/nw-design-system'
import { PlusIcon } from '@phosphor-icons/react'
import { formatDataTestId } from '@/common/utils/formatDataTestId'
import { useRoundingRuleVersionDetailsData } from '../hooks/useRoundingRuleVersionDetailsData'
import { useRoundingRuleDetailRows } from '../hooks/useRoundingRuleDetailRows'
import { TransformedRoundingRuleVersionDetail } from '../types/rounding-rule-version-details'
import { useRestClient } from '@/common/network/rest/useRestClient'
import { env } from '@/common/env/EnvUtils'
import { DeleteDialog } from './DeleteDialog'

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
  const [selectedRoundingRuleDetail, setSelectedRoundingRuleDetail] =
    useState<TransformedRoundingRuleVersionDetail | null>(null)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const restClient = useRestClient(env('NEXT_PUBLIC_KOGITO_PROCESSES_ENDPOINT'))

  // Fetch rounding rule version details using the hook
  const { roundingRuleVersionDetails, loading, error, refetch } = useRoundingRuleVersionDetailsData({
    accessToken,
    roundingRuleVersionId: roundingRuleVersionId || null
  })

  // Sort details by displayOrder
  const sortedDetails = useMemo(
    () => [...roundingRuleVersionDetails].sort((a, b) => a.displayOrder - b.displayOrder),
    [roundingRuleVersionDetails]
  )

  const handleDeleteClick = useCallback((detail: TransformedRoundingRuleVersionDetail) => {
    setSelectedRoundingRuleDetail(detail)
    setIsDeleteDialogOpen(true)
  }, [])

  const handleDeleteDetail = useCallback(
    async (detail?: TransformedRoundingRuleVersionDetail | null) => {
      if (!detail) return
      setIsDeleting(true)

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
      } finally {
        setIsDeleting(false)
        setIsDeleteDialogOpen(false)
        setSelectedRoundingRuleDetail(null)
      }
    },
    [restClient, accessToken, refetch]
  )

  // Use the inline editing hook
  const { isAddingNew, handleAddRow, renderDataRow, renderNewRow } = useRoundingRuleDetailRows({
    roundingRuleVersionId,
    roundingRuleVersionDetails: sortedDetails,
    accessToken,
    refetch,
    dataTestId,
    onDeleteClick: handleDeleteClick
  })

  // Table columns
  const tableColumns = useMemo(
    () => (
      <>
        <TableHead className="gba:w-[6%]">#</TableHead>
        <TableHead className="gba:w-[14%]">Clocking Type</TableHead>
        <TableHead className="gba:w-[14%]">Rounding Type</TableHead>
        <TableHead className="gba:w-[12%]">Start Time</TableHead>
        <TableHead className="gba:w-[12%]">End Time</TableHead>
        <TableHead className="gba:w-[12%]">Grace Period</TableHead>
        <TableHead className="gba:w-[12%]">Rounding Value</TableHead>
        <TableHead className="gba:w-[8%]">First/Last Only</TableHead>
        <TableHead className="gba:w-[10%]">Actions</TableHead>
      </>
    ),
    []
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
          <Button
            onClick={handleAddRow}
            disabled={!roundingRuleVersionId || loading || isAddingNew}
            className="gba:flex gba:items-center gba:gap-2"
            data-testid={formatDataTestId(dataTestId, 'add-rule-button')}
          >
            <PlusIcon className="gba:h-4 gba:w-4" />
            Add Rule
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="gba:text-center gba:py-8">Loading...</div>
        ) : sortedDetails.length > 0 || isAddingNew ? (
          <Table>
            <TableHeader>
              <TableRow>{tableColumns}</TableRow>
            </TableHeader>
            <TableBody>
              {sortedDetails.map(detail => renderDataRow(detail))}
              {renderNewRow()}
            </TableBody>
          </Table>
        ) : (
          <div className="gba:flex gba:flex-col gba:items-center gba:justify-center gba:py-8 gba:text-center">
            <div className="gba:text-muted-foreground gba:mb-2">No rounding rules configured yet</div>
            <div className="gba:text-sm gba:text-muted-foreground">
              Click "Add Rule" to create your first rounding rule
            </div>
          </div>
        )}
      </CardContent>

      <DeleteDialog
        isOpen={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        onConfirm={() => handleDeleteDetail(selectedRoundingRuleDetail)}
        isDeleting={isDeleting}
        titleKey="Delete Rounding Rule Detail"
        description="Are you sure you want to delete this rounding rule detail?"
      />
    </Card>
  )
}

export default RoundingRuleSetup
