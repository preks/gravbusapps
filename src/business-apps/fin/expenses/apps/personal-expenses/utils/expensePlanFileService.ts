import { useCallback, useMemo, useRef, useEffect } from 'react'
import { FileClient } from '@/common/network/files/FileClient'
import { BusinessAppContextProps } from '@/common/BusinessAppContext'
import { ExpensePlan } from '../hooks/useGetExpensePlans'
import { getTranslationFromI18nKeyAndLabel } from '@/common/utils/windowUtils'

export interface PrintPlanResult {
  success: boolean
  pdfUrl?: string
  error?: string
}

export const useExpensePlanFileService = (props: BusinessAppContextProps) => {
  // Ref to track if component is mounted
  const isMounted = useRef<boolean>(true)

  // Set isMounted to false when component unmounts
  useEffect(() => {
    return () => {
      isMounted.current = false
    }
  }, [])

  // Create FileClient with proper authorization
  const fileClient = useMemo(() => {
    const client = new FileClient()
    // Set authorization header if we have an access token
    if (props.accessToken) {
      client.setAccessToken(props.accessToken)
    }
    return client
  }, [props.accessToken])

  const printExpensePlan = useCallback(
    async (record: ExpensePlan): Promise<PrintPlanResult> => {
      if (!record.employeeDocument?.file) {
        return {
          success: false,
          error: getTranslationFromI18nKeyAndLabel(
            'lowcoder:expenses.plan.error.no_file_id',
            'No employee document file ID available for printing'
          )
        }
      }

      try {
        // Use the employee ID from the record if available (for manager viewing team member's expenses)
        // Otherwise fall back to the logged-in user's employee ID (for personal expenses)
        const employeeId =
          record.employee?.id || record.employeeDocument?.employee?.id || props.userInfo?.employeeDetails?.employeeId

        if (!employeeId) {
          return {
            success: false,
            error: getTranslationFromI18nKeyAndLabel(
              'lowcoder:expenses.plan.error.no_employee_id',
              'No employee ID available for file path'
            )
          }
        }

        // Extract file ID from the file URL like in expense items
        const fileId = record.employeeDocument.file?.split('/').pop()

        if (!fileId) {
          return {
            success: false,
            error: getTranslationFromI18nKeyAndLabel(
              'lowcoder:expenses.plan.error.no_file_id_extracted',
              'No file ID available for printing'
            )
          }
        }

        const filePath = `/documents/${employeeId}`

        // Fetch the PDF file using FileClient with proper authorization
        const blob = await fileClient.getFile(
          {
            accessScope: 'tenant',
            fileId
          },
          {
            appName: 'employee-profile',
            folderPath: filePath
          }
        )

        // Create an object URL from the blob for secure viewing
        const objectUrl = URL.createObjectURL(blob)

        return {
          success: true,
          pdfUrl: objectUrl
        }
      } catch {
        console.error('Error fetching file for print:', error)
        return {
          success: false,
          error:
            error instanceof Error
              ? error.message
              : getTranslationFromI18nKeyAndLabel('lowcoder:expenses.plan.error.unknown', 'Unknown error occurred')
        }
      }
    },
    [fileClient, props.userInfo?.employeeDetails?.employeeId, props.accessToken]
  )

  return {
    printExpensePlan,
    isMounted
  }
}
