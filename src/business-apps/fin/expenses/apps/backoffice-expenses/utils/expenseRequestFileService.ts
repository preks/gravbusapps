import { useCallback, useRef, useEffect } from 'react'
import { useFileClient } from '@/common/network/files/useFileClient'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { ExpenseData } from '../types/expenseRequest.types'

export interface PrintExpenseRequestResult {
  success: boolean
  pdfUrl?: string
  error?: string
}

export const useExpenseRequestFileService = (props: BusinessAppContextProps) => {
  const isMounted = useRef<boolean>(true)

  useEffect(() => {
    return () => {
      isMounted.current = false
    }
  }, [])

  const fileClient = useFileClient(props)

  const printExpenseRequest = useCallback(
    async (record: ExpenseData): Promise<PrintExpenseRequestResult> => {
      if (!record.employeeDocument?.id) {
        return {
          success: false,
          error: 'No employee document ID available for printing'
        }
      }

      try {
        const employeeId = record.employeeId

        if (!employeeId || employeeId === '-') {
          return {
            success: false,
            error: 'No employee ID available for file path'
          }
        }

        const fileId = record.employeeDocument.file?.split('/').pop()

        if (!fileId) {
          return {
            success: false,
            error: 'No file ID available for printing'
          }
        }

        const blob = await fileClient.getFile(
          {
            accessScope: 'tenant',
            fileId
          },
          {
            appName: 'employee-profile',
            folderPath: `/documents/${employeeId}`
          }
        )

        const objectUrl = URL.createObjectURL(blob)

        return {
          success: true,
          pdfUrl: objectUrl
        }
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error occurred'
        }
      }
    },
    [fileClient, props.accessToken]
  )

  return {
    printExpenseRequest,
    isMounted
  }
}
