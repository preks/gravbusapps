import React, { useState, useCallback } from 'react'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Separator,
  Badge,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  Spinner,
  Alert,
  AlertDescription,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from '@newwork/nw-design-system'
import { PiReceipt, PiFileText } from 'react-icons/pi'
import { useFileClient } from '@/common/network/files/useFileClient'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'

interface ExpenseItemFile {
  id: string
  fileType: string
  fileUrl: string
  fileName: string
}

interface ExpenseItem {
  id: string
  title: string
  totalAmount: number
  expenseClass?: {
    value: string
    translations?: Array<{ value: string; locale: string }>
    catalog?: { defaultLocale: string }
  }
  expenseRuleGeneralExpense?: {
    name: string
  }
  expenseItemFile?: ExpenseItemFile[]
}

interface ExpensesSectionProps extends Pick<BusinessAppContextProps, 'accessToken' | 'userInfo' | 'additionalData'> {
  expenseItems: ExpenseItem[]
  currencyCode: string
  formatCurrency: (amount: number, currency: string) => string
  getCatalogValue: (catalog: ExpenseItem['expenseClass']) => string
  t: (key: string) => string
  employeeId?: string
}

// Helper component to render preview content (avoids nested ternary)
const PreviewContent: React.FC<{
  loading: boolean
  error: string | null
  url: string
  fileName: string
}> = ({ loading, error, url, fileName }) => {
  if (loading) {
    return (
      <div className="gba:flex gba:justify-center gba:items-center gba:py-8">
        <Spinner />
      </div>
    )
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    )
  }

  if (!url) {
    return null
  }

  const isImage = url.includes('image') || /\.(jpg|jpeg|png|gif|webp)$/i.test(fileName)

  return (
    <div className="gba:mt-4">
      {isImage ? (
        <img src={url} alt={fileName} className="gba:max-w-full gba:max-h-[70vh] gba:mx-auto" />
      ) : (
        <iframe src={url} className="gba:w-full gba:h-[calc(90vh-120px)] gba:border-0" title={fileName} />
      )}
    </div>
  )
}

const ExpensesSection: React.FC<ExpensesSectionProps> = ({
  expenseItems,
  currencyCode,
  formatCurrency,
  getCatalogValue,
  t,
  accessToken,
  userInfo,
  additionalData,
  employeeId
}) => {
  const fileClient = useFileClient({ accessToken, userInfo, additionalData })
  const [previewOpen, setPreviewOpen] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string>('')
  const [previewLoading, setPreviewLoading] = useState(false)
  const [previewError, setPreviewError] = useState<string | null>(null)
  const [previewFileName, setPreviewFileName] = useState<string>('')

  const handleOpenReceipt = useCallback(
    async (file: ExpenseItemFile) => {
      if (!employeeId) {
        setPreviewError('Employee ID not available')
        setPreviewOpen(true)
        return
      }

      setPreviewOpen(true)
      setPreviewLoading(true)
      setPreviewError(null)
      setPreviewFileName(file.fileName || 'Receipt')

      // Clean up previous URL
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl)
        setPreviewUrl('')
      }

      try {
        // Extract file ID from fileUrl
        const fileId = file.fileUrl?.split('/').pop()
        if (!fileId) {
          throw new Error('No file ID available')
        }

        const blob = await fileClient.getFile(
          { accessScope: 'tenant', fileId },
          { appName: 'expenses', folderPath: `/expenseItemsDocuments/${employeeId}` }
        )

        const objectUrl = URL.createObjectURL(blob)
        setPreviewUrl(objectUrl)
      } catch (err) {
        setPreviewError(err instanceof Error ? err.message : 'Failed to load receipt')
      } finally {
        setPreviewLoading(false)
      }
    },
    [fileClient, employeeId, previewUrl]
  )

  const handleClosePreview = useCallback(() => {
    setPreviewOpen(false)
    setPreviewLoading(false)
    setPreviewError(null)
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl)
      setPreviewUrl('')
    }
  }, [previewUrl])

  if (!expenseItems || expenseItems.length === 0) {
    return null
  }

  return (
    <>
      <Card data-testid="approve-expense-plan-expenses">
        <CardHeader>
          <CardTitle className="gba:flex gba:items-center gba:gap-2">
            <PiReceipt className="gba:h-5 gba:w-5" />
            {t('section-expenses')}
            <Badge variant="secondary" className="gba:ml-2">
              {expenseItems.length}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="gba:space-y-3">
          {expenseItems.map((item, index) => {
            const hasReceipt = item.expenseItemFile && item.expenseItemFile.length > 0
            const firstFile = hasReceipt ? item.expenseItemFile![0] : null

            return (
              <div key={item.id} data-testid={`approve-expense-plan-expense-${index}`}>
                <div className="gba:flex gba:justify-between gba:items-start gba:gap-4">
                  <div className="gba:flex-1">
                    <div className="gba:flex gba:items-center gba:gap-2">
                      <p className="gba:font-medium gba:text-sm">{item.title}</p>
                      {hasReceipt && firstFile && (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button
                                type="button"
                                onClick={() => handleOpenReceipt(firstFile)}
                                className="gba:p-1 gba:rounded gba:hover:bg-muted gba:transition-colors gba:border-none gba:bg-transparent gba:cursor-pointer"
                                data-testid={`expense-receipt-button-${index}`}
                              >
                                <PiFileText className="gba:h-4 gba:w-4 gba:text-primary" />
                              </button>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>{t('view-receipt') || 'View Receipt'}</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}
                    </div>
                    <div className="gba:flex gba:items-center gba:gap-2 gba:mt-1">
                      <Badge variant="outline" className="gba:text-xs">
                        {getCatalogValue(item.expenseClass)}
                      </Badge>
                      {item.expenseRuleGeneralExpense?.name && (
                        <span className="gba:text-xs gba:text-muted-foreground">
                          {item.expenseRuleGeneralExpense.name}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="gba:text-right">
                    <p className="gba:font-semibold gba:text-sm">{formatCurrency(item.totalAmount, currencyCode)}</p>
                  </div>
                </div>
                {index < expenseItems.length - 1 && <Separator className="gba:mt-3" />}
              </div>
            )
          })}
        </CardContent>
      </Card>

      {/* Receipt Preview Dialog */}
      <Dialog open={previewOpen} onOpenChange={open => !open && handleClosePreview()}>
        <DialogContent className="gba:!w-[90vw] gba:!max-w-[90vw] gba:max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>{previewFileName}</DialogTitle>
          </DialogHeader>
          <PreviewContent loading={previewLoading} error={previewError} url={previewUrl} fileName={previewFileName} />
        </DialogContent>
      </Dialog>
    </>
  )
}

export default ExpensesSection
