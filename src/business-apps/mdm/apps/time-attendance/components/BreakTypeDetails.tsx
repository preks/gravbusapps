import React, { useState, useCallback, useMemo } from 'react'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Button,
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow
} from '@newwork/nw-design-system'
import { PlusIcon } from '@phosphor-icons/react'
import { DeleteDialog } from './DeleteDialog'
import { formatDataTestId } from '@/common/utils/formatDataTestId'
import { useBreakTypeVersionDetailsData } from '../hooks/useBreakTypeVersionDetailsData'
import { TransformedBreakTypeVersionDetail } from '../types/break-type-version-details'
import { useBreakTypeDetailRows } from '../hooks/useBreakTypeDetailRows'
import { useRestClient } from '@/common/network/rest/useRestClient'
import { env } from '@/common/env/EnvUtils'

export interface BreakTypeDetailsProps {
  breakTypeVersionId: string | null
  accessToken: string
  prefixDataTestId?: string
}

const DATA_TEST_ID_PREFIX = 'BreakTypeDetails'

export const BreakTypeDetails: React.FC<BreakTypeDetailsProps> = ({
  breakTypeVersionId,
  accessToken,
  prefixDataTestId = ''
}) => {
  const dataTestId = formatDataTestId(prefixDataTestId, DATA_TEST_ID_PREFIX)
  const restClient = useRestClient(env('NEXT_PUBLIC_KOGITO_PROCESSES_ENDPOINT'))
  const [selectedDetail, setSelectedDetail] = useState<TransformedBreakTypeVersionDetail | null>(null)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  // Fetch break type version details using the hook
  const { breakTypeVersionDetails, loading, error, refetch } = useBreakTypeVersionDetailsData({
    accessToken,
    breakTypeVersionId: breakTypeVersionId || null
  })

  // Handle delete click
  const handleDeleteClick = useCallback((detail: TransformedBreakTypeVersionDetail | null) => {
    setSelectedDetail(detail)
    setIsDeleteDialogOpen(true)
  }, [])

  // Use the inline editing hook
  const { isAddingNew, startAddingNew, renderDataRow, renderNewRow } = useBreakTypeDetailRows({
    breakTypeVersionId,
    breakTypeVersionDetails,
    accessToken,
    dataTestId,
    refetch,
    onDeleteClick: handleDeleteClick
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

  // Table columns
  const tableColumns = useMemo(
    () => (
      <>
        <TableHead className="gba:w-[6%]">Priority</TableHead>
        <TableHead className="gba:w-[12%]">Kind</TableHead>
        <TableHead className="gba:w-[10%]">Start</TableHead>
        <TableHead className="gba:w-[10%]">End</TableHead>
        <TableHead className="gba:w-[10%]">Hours</TableHead>
        <TableHead className="gba:w-[10%]">Length</TableHead>
        <TableHead className="gba:w-[8%]">Mandatory</TableHead>
        <TableHead className="gba:w-[12%]">Setting</TableHead>
        <TableHead className="gba:w-[12%]">Combine</TableHead>
        <TableHead className="gba:w-[10%]">Actions</TableHead>
      </>
    ),
    []
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
          <Button
            type="button"
            onClick={startAddingNew}
            disabled={!breakTypeVersionId || loading || isAddingNew}
            className="gba:flex gba:items-center gba:gap-2"
            data-testid={formatDataTestId(dataTestId, 'add-break-button')}
          >
            <PlusIcon className="gba:h-4 gba:w-4" />
            Add Break
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="gba:flex gba:flex-col gba:items-center gba:justify-center gba:py-8">
            <div className="gba:text-muted-foreground">Loading...</div>
          </div>
        ) : breakTypeVersionDetails.length > 0 || isAddingNew ? (
          <div className="gba:overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>{tableColumns}</TableRow>
              </TableHeader>
              <TableBody>
                {breakTypeVersionDetails.map(detail => renderDataRow(detail))}
                {renderNewRow()}
              </TableBody>
            </Table>
          </div>
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
