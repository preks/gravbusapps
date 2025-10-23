import { useState, useCallback } from 'react'

import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { ExpenseData } from '../../../../types'
import { useExpenseRequestFileService } from '../../../../utils/expenseRequestFileService'

export const useExpenseRequestPdf = (props: BusinessAppContextProps) => {
  const [isPdfModalVisible, setIsPdfModalVisible] = useState(false)
  const [pdfUrl, setPdfUrl] = useState<string>('')
  const [pdfLoading, setPdfLoading] = useState(false)
  const [pdfError, setPdfError] = useState<string>('')

  const { printExpenseRequest } = useExpenseRequestFileService(props)

  const handlePrintExpenseRequest = useCallback(
    async (record: ExpenseData) => {
      setPdfLoading(true)
      setPdfError('')
      setPdfUrl('')

      try {
        const result = await printExpenseRequest(record)

        if (result.success && result.pdfUrl) {
          setPdfUrl(result.pdfUrl)
          setIsPdfModalVisible(true)
        } else {
          setPdfError(result.error || 'Failed to load PDF')
          setIsPdfModalVisible(true)
        }
      } catch {
        setPdfError(error instanceof Error ? error.message : 'Unknown error occurred')
        setIsPdfModalVisible(true)
      } finally {
        setPdfLoading(false)
      }
    },
    [printExpenseRequest]
  )

  const handleClosePdfModal = useCallback(() => {
    setIsPdfModalVisible(false)
    setPdfUrl('')
    setPdfError('')
    if (pdfUrl) {
      URL.revokeObjectURL(pdfUrl)
    }
  }, [pdfUrl])

  return {
    isPdfModalVisible,
    pdfUrl,
    pdfLoading,
    pdfError,
    handlePrintExpenseRequest,
    handleClosePdfModal
  }
}
