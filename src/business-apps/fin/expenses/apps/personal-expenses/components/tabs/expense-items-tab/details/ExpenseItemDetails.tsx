import React, { useEffect, useRef, useState, useCallback } from 'react'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { Separator, Spinner, Alert, AlertDescription, Badge, useTranslation } from '@newwork/nw-design-system'
import { DotsThreeVerticalIcon } from '@phosphor-icons/react'
import { useFileClient } from '@/common/network/files/useFileClient'
import { ExpenseItem, useGetExpenseItem } from '../../../../hooks/useGetExpenseItems'
import { getExpenseItemStatusDisplayT } from '../../../../utils'
import { AppAction } from '@/components/app-action'
import { generateExpenseItemActions } from '../../../../utils/expenseItemActions'
import { DetailsPanelContent } from '@/business-apps/fin/expenses/common/components/details-panel/DetailsPanelContent'
import { buildExpenseItemDetailsFields } from './buildExpenseItemDetailsFields'
import { ExpenseItemAttachmentGrid } from './ExpenseItemAttachmentGrid'
import { ExpenseItemMediaPreviewDialogs } from './ExpenseItemMediaPreviewDialogs'
import { useExpenseItemFileAttachments } from './useExpenseItemFileAttachments'
import personalTranslations from '../../../../_i18n'

type ExpenseItemTranslationsBundle = Record<'en-US' | 'de-DE' | 'ro-RO', string>

export interface ExpenseItemDetailsProps extends BusinessAppContextProps {
  selectedItem: ExpenseItem | null
  onClose: () => void
  translations?: ExpenseItemTranslationsBundle
}

export const ExpenseItemDetails: React.FC<ExpenseItemDetailsProps> = ({
  selectedItem,
  onClose,
  translations,
  ...contextProps
}) => {
  const translationBundle = translations ?? personalTranslations
  const { t } = useTranslation(translationBundle)
  const { item: detailedItem, isLoading: isItemLoading, error: itemError, fetchItem } = useGetExpenseItem(contextProps)

  const [previewOpen, setPreviewOpen] = useState(false)
  const [previewImage, setPreviewImage] = useState('')
  const [pdfPreviewOpen, setPdfPreviewOpen] = useState(false)
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState('')

  const fetchedItemIdRef = useRef<string | null>(null)

  useEffect(() => {
    if (selectedItem?.id && fetchedItemIdRef.current !== selectedItem.id) {
      fetchedItemIdRef.current = selectedItem.id
      fetchItem(selectedItem.id)
    }
  }, [selectedItem?.id, fetchItem])

  useEffect(() => {
    if (!selectedItem) {
      fetchedItemIdRef.current = null
    }
  }, [selectedItem])

  const fileClient = useFileClient(contextProps)

  const { fileList, fileLoading } = useExpenseItemFileAttachments({
    detailedItem,
    fileClient,
    employeeId: contextProps.userInfo?.employeeDetails?.employeeId,
    accessToken: contextProps.accessToken
  })

  const handleImagePreview = useCallback((fileUrl: string) => {
    setPreviewImage(fileUrl)
    setPreviewOpen(true)
  }, [])

  const handlePdfPreview = useCallback((fileUrl: string) => {
    setPdfPreviewUrl(fileUrl)
    setPdfPreviewOpen(true)
  }, [])

  if (isItemLoading) {
    return (
      <div className="gba:p-4 gba:flex gba:justify-center gba:items-center gba:py-8">
        <Spinner />
      </div>
    )
  }

  if (itemError) {
    return (
      <div className="gba:p-4">
        <Alert>
          <AlertDescription>{itemError}</AlertDescription>
        </Alert>
      </div>
    )
  }

  const displayItem = detailedItem || selectedItem
  if (!displayItem) return null

  const statusConfig = getExpenseItemStatusDisplayT(t, displayItem.status)
  const statusBadge = (
    <Badge variant={statusConfig.badgeVariant ?? 'outline'} data-testid="expense-item-status-badge">
      {statusConfig.label}
    </Badge>
  )

  const fields = buildExpenseItemDetailsFields(displayItem, statusBadge, t)

  const availableActions = generateExpenseItemActions(
    displayItem,
    {
      employeeId: contextProps.userInfo?.employeeDetails?.employeeId || '',
      accessToken: contextProps.accessToken || '',
      onClose: onClose
    },
    t,
    { includeDetails: false, includeAssignToRequest: true }
  )

  return (
    <div className="gba:space-y-6">
      {availableActions.length > 0 ? (
        <div className="gba:flex gba:justify-end">
          <AppAction
            variant="table-row"
            customActions={availableActions}
            prefixDataTestId="expense-item-details-action"
            accessToken={contextProps.accessToken}
            emptyState="disable"
            lazyLoad
            data-testid="expense-item-details-action-button"
          >
            <DotsThreeVerticalIcon className="gba:h-4 gba:w-4" aria-hidden />
          </AppAction>
        </div>
      ) : null}

      <DetailsPanelContent
        dataTestIdPrefix="expense-item-details"
        title={typeof displayItem.title === 'string' ? displayItem.title : t('expense-items-sheet-title')}
        subtitle={typeof displayItem.code === 'string' ? displayItem.code : undefined}
        fields={fields}
        showHeader={false}
        extraContent={
          <>
            <Separator />
            <div className="gba:mt-2">
              <ExpenseItemAttachmentGrid
                fileLoading={fileLoading}
                fileList={fileList}
                onImagePreview={handleImagePreview}
                onPdfPreview={handlePdfPreview}
                translations={translationBundle}
              />
            </div>
          </>
        }
      />

      <ExpenseItemMediaPreviewDialogs
        previewOpen={previewOpen}
        onPreviewOpenChange={setPreviewOpen}
        previewImage={previewImage}
        pdfPreviewOpen={pdfPreviewOpen}
        onPdfPreviewOpenChange={setPdfPreviewOpen}
        pdfPreviewUrl={pdfPreviewUrl}
        translations={translationBundle}
      />
    </div>
  )
}

export default ExpenseItemDetails
